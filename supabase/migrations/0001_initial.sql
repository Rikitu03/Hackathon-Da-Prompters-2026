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
-- RLS: public reads are publication-scoped. Admin writes require a publisher/editor account.
create function public.is_content_admin() returns boolean language sql stable security definer set search_path='' as $$ select exists (select 1 from public.admin_profiles where user_id=auth.uid()) $$;
create function public.is_content_publisher() returns boolean language sql stable security definer set search_path='' as $$ select exists (select 1 from public.admin_profiles where user_id=auth.uid() and role='publisher') $$;
revoke all on function public.is_content_admin() from public;
revoke all on function public.is_content_publisher() from public;
grant execute on function public.is_content_admin() to authenticated;
grant execute on function public.is_content_publisher() to authenticated;
alter table public.admin_profiles enable row level security;
alter table public.scholarship_programs enable row level security;
alter table public.application_cycles enable row level security;
alter table public.requirements enable row level security;
alter table public.requirement_steps enable row level security;
alter table public.faqs enable row level security;
alter table public.knowledge_sources enable row level security;
alter table public.knowledge_chunks enable row level security;
create policy admin_self_read on public.admin_profiles for select to authenticated using(user_id=auth.uid());
create policy programs_public_read on public.scholarship_programs for select to anon,authenticated using(status='published' or public.is_content_admin());
create policy cycles_public_read on public.application_cycles for select to anon,authenticated using((status='published' and exists(select 1 from public.scholarship_programs p where p.id=program_id and p.status='published')) or public.is_content_admin());
create policy requirements_public_read on public.requirements for select to anon,authenticated using(exists(select 1 from public.application_cycles c where c.id=cycle_id and c.status='published') or public.is_content_admin());
create policy steps_public_read on public.requirement_steps for select to anon,authenticated using(exists(select 1 from public.requirements r join public.application_cycles c on r.cycle_id=c.id where r.id=requirement_id and c.status='published') or public.is_content_admin());
create policy faqs_public_read on public.faqs for select to anon,authenticated using(exists(select 1 from public.requirements r join public.application_cycles c on r.cycle_id=c.id where r.id=requirement_id and c.status='published') or public.is_content_admin());
create policy sources_public_read on public.knowledge_sources for select to anon,authenticated using((is_approved and exists(select 1 from public.application_cycles c where c.id=cycle_id and c.status='published')) or public.is_content_admin());
create policy chunks_public_read on public.knowledge_chunks for select to anon,authenticated using(exists(select 1 from public.knowledge_sources s join public.application_cycles c on c.id=s.cycle_id where s.id=source_id and s.is_approved and c.status='published') or public.is_content_admin());
-- All application tables: admin insert/update/delete; app UI must still verify server-side identity.
create policy programs_admin_insert on public.scholarship_programs for insert to authenticated with check(public.is_content_admin());
create policy programs_admin_update on public.scholarship_programs for update to authenticated using(public.is_content_admin()) with check(public.is_content_admin());
create policy programs_admin_delete on public.scholarship_programs for delete to authenticated using(public.is_content_admin());
create policy cycles_admin_all on public.application_cycles for all to authenticated using(public.is_content_admin()) with check(public.is_content_admin());
create policy requirements_admin_all on public.requirements for all to authenticated using(public.is_content_admin()) with check(public.is_content_admin());
create policy steps_admin_all on public.requirement_steps for all to authenticated using(public.is_content_admin()) with check(public.is_content_admin());
create policy faqs_admin_all on public.faqs for all to authenticated using(public.is_content_admin()) with check(public.is_content_admin());
create policy sources_admin_all on public.knowledge_sources for all to authenticated using(public.is_content_admin()) with check(public.is_content_admin());
create policy chunks_admin_all on public.knowledge_chunks for all to authenticated using(public.is_content_admin()) with check(public.is_content_admin());
-- Only provision administrator identities through a trusted backend or Supabase dashboard.
