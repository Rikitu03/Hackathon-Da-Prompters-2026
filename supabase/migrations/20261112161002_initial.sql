-- GabayIskolar schema. Apply in a fresh Supabase project.
create extension if not exists pgcrypto;
create table public.admin_profiles (user_id uuid primary key references auth.users(id) on delete cascade, role text not null default 'editor' check(role in ('editor','publisher')));
create table public.scholarship_programs (id uuid primary key default gen_random_uuid(), title text not null, description text not null default '', status text not null default 'draft' check(status in ('draft','published','archived')), created_at timestamptz not null default now());
create table public.application_cycles (id uuid primary key default gen_random_uuid(), program_id uuid not null references public.scholarship_programs(id) on delete cascade, academic_year text not null, application_start date, application_end date, official_url text, status text not null default 'draft' check(status in ('draft','published','archived')), published_at timestamptz);
create table public.requirements (id uuid primary key default gen_random_uuid(), cycle_id uuid not null references public.application_cycles(id) on delete cascade, title text not null, description text not null default '', is_required boolean not null default true, position int not null default 0);
create table public.requirement_steps (id uuid primary key default gen_random_uuid(), requirement_id uuid not null references public.requirements(id) on delete cascade, position int not null default 0, instruction text not null);
create table public.faqs (id uuid primary key default gen_random_uuid(), requirement_id uuid not null references public.requirements(id) on delete cascade, question text not null, answer text not null);
create table public.knowledge_sources (id uuid primary key default gen_random_uuid(), cycle_id uuid not null references public.application_cycles(id) on delete cascade, title text not null, source_url text, content_version int not null default 1, reviewed_at timestamptz, is_approved boolean not null default false);
create table public.knowledge_chunks (id uuid primary key default gen_random_uuid(), source_id uuid not null references public.knowledge_sources(id) on delete cascade, requirement_id uuid references public.requirements(id) on delete set null, content text not null, search_vector tsvector generated always as (to_tsvector('simple', content)) stored);
create index knowledge_chunks_fts_idx on public.knowledge_chunks using gin(search_vector);
create index requirements_cycle_idx on public.requirements(cycle_id,position);
create index application_cycles_program_idx on public.application_cycles(program_id);
create index requirement_steps_requirement_idx on public.requirement_steps(requirement_id);
create index faqs_requirement_idx on public.faqs(requirement_id);
create index knowledge_sources_cycle_idx on public.knowledge_sources(cycle_id);
create index knowledge_chunks_source_idx on public.knowledge_chunks(source_id);
create index knowledge_chunks_requirement_idx on public.knowledge_chunks(requirement_id);

-- Helpers read only the caller's own profile through RLS; no definer bypass is needed.
-- Keep them outside the exposed public schema and out of anonymous policies.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
create function private.is_content_admin() returns boolean language sql stable security invoker set search_path='' as $$
  select exists (select 1 from public.admin_profiles where user_id=(select auth.uid()))
$$;
create function private.is_content_publisher() returns boolean language sql stable security invoker set search_path='' as $$
  select exists (select 1 from public.admin_profiles where user_id=(select auth.uid()) and role='publisher')
$$;
revoke all on function private.is_content_admin() from public, anon, authenticated;
revoke all on function private.is_content_publisher() from public, anon, authenticated;
grant execute on function private.is_content_admin() to authenticated;
grant execute on function private.is_content_publisher() to authenticated;

-- Grants expose operations; RLS below decides which rows can be accessed.
-- Explicit revocation also removes unsafe defaults such as TRUNCATE (which bypasses RLS).
grant usage on schema public to anon, authenticated;
revoke all on public.admin_profiles, public.scholarship_programs, public.application_cycles,
  public.requirements, public.requirement_steps, public.faqs, public.knowledge_sources,
  public.knowledge_chunks from public, anon, authenticated;
grant select on public.admin_profiles to authenticated;
grant select on public.scholarship_programs, public.application_cycles, public.requirements,
  public.requirement_steps, public.faqs, public.knowledge_sources, public.knowledge_chunks
  to anon, authenticated;
grant insert, update, delete on public.scholarship_programs, public.application_cycles,
  public.requirements, public.requirement_steps, public.faqs, public.knowledge_sources,
  public.knowledge_chunks to authenticated;
grant all on public.admin_profiles, public.scholarship_programs, public.application_cycles,
  public.requirements, public.requirement_steps, public.faqs, public.knowledge_sources,
  public.knowledge_chunks to service_role;
alter table public.admin_profiles enable row level security;
alter table public.scholarship_programs enable row level security;
alter table public.application_cycles enable row level security;
alter table public.requirements enable row level security;
alter table public.requirement_steps enable row level security;
alter table public.faqs enable row level security;
alter table public.knowledge_sources enable row level security;
alter table public.knowledge_chunks enable row level security;
create policy admin_self_read on public.admin_profiles for select to authenticated using(user_id=(select auth.uid()));

-- Every ancestor must be published, and knowledge must be approved.
-- These policies never invoke helpers that require an authenticated identity.
create policy programs_public_read on public.scholarship_programs for select to anon,authenticated using(status='published');
create policy cycles_public_read on public.application_cycles for select to anon,authenticated using(
  status='published' and exists(select 1 from public.scholarship_programs p where p.id=program_id and p.status='published')
);
create policy requirements_public_read on public.requirements for select to anon,authenticated using(
  exists(select 1 from public.application_cycles c join public.scholarship_programs p on p.id=c.program_id
    where c.id=cycle_id and c.status='published' and p.status='published')
);
create policy steps_public_read on public.requirement_steps for select to anon,authenticated using(
  exists(select 1 from public.requirements r join public.application_cycles c on c.id=r.cycle_id
    join public.scholarship_programs p on p.id=c.program_id
    where r.id=requirement_id and c.status='published' and p.status='published')
);
create policy faqs_public_read on public.faqs for select to anon,authenticated using(
  exists(select 1 from public.requirements r join public.application_cycles c on c.id=r.cycle_id
    join public.scholarship_programs p on p.id=c.program_id
    where r.id=requirement_id and c.status='published' and p.status='published')
);
create policy sources_public_read on public.knowledge_sources for select to anon,authenticated using(
  is_approved and exists(select 1 from public.application_cycles c join public.scholarship_programs p on p.id=c.program_id
    where c.id=cycle_id and c.status='published' and p.status='published')
);
create policy chunks_public_read on public.knowledge_chunks for select to anon,authenticated using(
  exists(select 1 from public.knowledge_sources s join public.application_cycles c on c.id=s.cycle_id
    join public.scholarship_programs p on p.id=c.program_id
    where s.id=source_id and s.is_approved and c.status='published' and p.status='published')
);

-- Editors and publishers can inspect all content. Only publishers can mutate it,
-- including descendants of published cycles and source approvals.
create policy programs_admin_read on public.scholarship_programs for select to authenticated using((select private.is_content_admin()));
create policy cycles_admin_read on public.application_cycles for select to authenticated using((select private.is_content_admin()));
create policy requirements_admin_read on public.requirements for select to authenticated using((select private.is_content_admin()));
create policy steps_admin_read on public.requirement_steps for select to authenticated using((select private.is_content_admin()));
create policy faqs_admin_read on public.faqs for select to authenticated using((select private.is_content_admin()));
create policy sources_admin_read on public.knowledge_sources for select to authenticated using((select private.is_content_admin()));
create policy chunks_admin_read on public.knowledge_chunks for select to authenticated using((select private.is_content_admin()));
create policy programs_publisher_write on public.scholarship_programs for all to authenticated using((select private.is_content_publisher())) with check((select private.is_content_publisher()));
create policy cycles_publisher_write on public.application_cycles for all to authenticated using((select private.is_content_publisher())) with check((select private.is_content_publisher()));
create policy requirements_publisher_write on public.requirements for all to authenticated using((select private.is_content_publisher())) with check((select private.is_content_publisher()));
create policy steps_publisher_write on public.requirement_steps for all to authenticated using((select private.is_content_publisher())) with check((select private.is_content_publisher()));
create policy faqs_publisher_write on public.faqs for all to authenticated using((select private.is_content_publisher())) with check((select private.is_content_publisher()));
create policy sources_publisher_write on public.knowledge_sources for all to authenticated using((select private.is_content_publisher())) with check((select private.is_content_publisher()));
create policy chunks_publisher_write on public.knowledge_chunks for all to authenticated using((select private.is_content_publisher())) with check((select private.is_content_publisher()));
-- Only provision administrator identities through a trusted backend or Supabase dashboard.
