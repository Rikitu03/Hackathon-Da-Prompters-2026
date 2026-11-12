-- Run as postgres in the shared project's SQL editor or through execute_sql.
-- All fixtures, synthetic Auth identities, and writes are rolled back.
begin;

create temporary table test_programs (kind text, id uuid default gen_random_uuid());
insert into test_programs(kind) values ('published'), ('draft'), ('archived');
insert into public.scholarship_programs(id, title, status)
select id, 'Permission test: ' || kind, kind from test_programs;

create temporary table test_cycles (kind text, program_kind text, status text, id uuid default gen_random_uuid());
insert into test_cycles(kind, program_kind, status) values
  ('visible', 'published', 'published'),
  ('draft_cycle', 'published', 'draft'),
  ('draft_parent', 'draft', 'published'),
  ('archived_parent', 'archived', 'published'),
  ('archived_cycle', 'published', 'archived');
insert into public.application_cycles(id, program_id, academic_year, status)
select c.id, p.id, 'Permission test: ' || c.kind, c.status
from test_cycles c join test_programs p on p.kind=c.program_kind;

create temporary table test_requirements (kind text, cycle_id uuid, id uuid default gen_random_uuid());
insert into test_requirements(kind, cycle_id) select kind, id from test_cycles;
insert into public.requirements(id, cycle_id, title)
select id, cycle_id, 'Permission test' from test_requirements;
create temporary table test_steps (id uuid, requirement_id uuid);
insert into test_steps select gen_random_uuid(), id from test_requirements;
insert into public.requirement_steps(id, requirement_id, instruction)
select id, requirement_id, 'Permission test' from test_steps;
create temporary table test_faqs (id uuid, requirement_id uuid);
insert into test_faqs select gen_random_uuid(), id from test_requirements;
insert into public.faqs(id, requirement_id, question, answer)
select id, requirement_id, 'Permission test?', 'Test answer' from test_faqs;

create temporary table test_sources (id uuid default gen_random_uuid(), cycle_id uuid, approved boolean);
insert into test_sources(cycle_id, approved) select id, true from test_cycles;
insert into test_sources(cycle_id, approved) select id, false from test_cycles where kind='visible';
insert into public.knowledge_sources(id, cycle_id, title, is_approved)
select id, cycle_id, 'Permission test', approved from test_sources;
create temporary table test_chunks (id uuid, source_id uuid);
insert into test_chunks select gen_random_uuid(), id from test_sources;
insert into public.knowledge_chunks(id, source_id, content)
select id, source_id, 'Permission test' from test_chunks;

create temporary table test_identities (kind text, id uuid default gen_random_uuid());
insert into test_identities(kind) values ('ordinary'), ('editor'), ('publisher');
insert into auth.users(id) select id from test_identities;
insert into public.admin_profiles(user_id, role)
select id, kind from test_identities where kind in ('editor', 'publisher');

create temporary table test_rows (table_name text, id uuid);
insert into test_rows select 'scholarship_programs', id from test_programs;
insert into test_rows select 'application_cycles', id from test_cycles;
insert into test_rows select 'requirements', id from test_requirements;
insert into test_rows select 'requirement_steps', id from test_steps;
insert into test_rows select 'faqs', id from test_faqs;
insert into test_rows select 'knowledge_sources', id from test_sources;
insert into test_rows select 'knowledge_chunks', id from test_chunks;
grant select on test_rows, test_identities to anon, authenticated;

create function pg_temp.assert_reads(admin_access boolean) returns void
language plpgsql security invoker as $$
declare
  target text;
  actual_count bigint;
  expected_count bigint;
begin
  for target in select distinct table_name from test_rows loop
    select case when admin_access then count(*) else 1 end into expected_count
      from test_rows where table_name=target;
    execute format('select count(*) from public.%I where id in (select id from test_rows where table_name=$1)', target)
      into actual_count using target;
    if actual_count <> expected_count then
      raise exception '% read %: expected %, got %', current_user, target, expected_count, actual_count;
    end if;
    if has_table_privilege(current_user, 'public.' || target, 'TRUNCATE') then
      raise exception '% must not have TRUNCATE on %', current_user, target;
    end if;
  end loop;
end;
$$;

-- Exercise INSERT, UPDATE, DELETE for every content table with real caller roles.
create function pg_temp.assert_writes(allowed boolean) returns void
language plpgsql security invoker as $$
declare
  target text;
  columns_sql text;
  values_sql text;
  clone_id uuid;
  sample_id uuid;
  affected bigint;
  denied boolean;
begin
  for target in select distinct table_name from test_rows loop
    execute format('select id from public.%I where id in (select id from test_rows where table_name=$1) limit 1', target)
      into sample_id using target;
    if sample_id is null then raise exception 'Missing visible fixture for %', target; end if;
    select string_agg(format('%I', attname), ', ' order by attnum),
      string_agg(case when attname='id' then '$1' else format('t.%I', attname) end, ', ' order by attnum)
      into columns_sql, values_sql
      from pg_attribute
      where attrelid=format('public.%I', target)::regclass and attnum>0 and not attisdropped and attgenerated='';
    clone_id := gen_random_uuid();
    denied := false;
    begin
      execute format('insert into public.%I (%s) select %s from public.%I t where id=$2', target, columns_sql, values_sql, target)
        using clone_id, sample_id;
    exception when insufficient_privilege then denied := true;
    end;
    if denied = allowed then raise exception '% INSERT authorization incorrect for %', current_user, target; end if;
    begin
      execute format('update public.%I set id=id where id=$1', target) using sample_id;
      get diagnostics affected = row_count;
    exception when insufficient_privilege then affected := 0;
    end;
    if affected <> (case when allowed then 1 else 0 end) then
      raise exception '% UPDATE authorization incorrect for %', current_user, target;
    end if;
    begin
      execute format('delete from public.%I where id=$1', target) using case when allowed then clone_id else sample_id end;
      get diagnostics affected = row_count;
    exception when insufficient_privilege then affected := 0;
    end;
    if affected <> (case when allowed then 1 else 0 end) then
      raise exception '% DELETE authorization incorrect for %', current_user, target;
    end if;
  end loop;
end;
$$;

create function pg_temp.assert_profiles(expected_count bigint) returns void
language plpgsql security invoker as $$
declare actual_count bigint;
begin
  select count(*) into actual_count from public.admin_profiles
    where user_id in (select id from test_identities);
  if actual_count <> expected_count then raise exception 'Profile isolation failed'; end if;
  if has_table_privilege(current_user, 'public.admin_profiles', 'INSERT')
    or has_table_privilege(current_user, 'public.admin_profiles', 'UPDATE')
    or has_table_privilege(current_user, 'public.admin_profiles', 'DELETE')
    or has_table_privilege(current_user, 'public.admin_profiles', 'TRUNCATE') then
    raise exception 'Client role can mutate administrator profiles';
  end if;
end;
$$;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select pg_temp.assert_reads(false);
select pg_temp.assert_writes(false);
do $$ begin
  if has_table_privilege(current_user, 'public.admin_profiles', 'SELECT') then
    raise exception 'Anonymous access to administrator profiles';
  end if;
end $$;
reset role;

-- User-editable metadata must not grant publisher access.
select set_config('request.jwt.claims', jsonb_build_object('sub', id, 'role', 'authenticated',
  'user_metadata', jsonb_build_object('role', 'publisher'))::text, true)
  from test_identities where kind='ordinary';
set local role authenticated;
select pg_temp.assert_reads(false);
select pg_temp.assert_writes(false);
select pg_temp.assert_profiles(0);
reset role;

select set_config('request.jwt.claims', jsonb_build_object('sub', id, 'role', 'authenticated')::text, true)
  from test_identities where kind='editor';
set local role authenticated;
select pg_temp.assert_reads(true);
select pg_temp.assert_writes(false);
select pg_temp.assert_profiles(1);
reset role;

select set_config('request.jwt.claims', jsonb_build_object('sub', id, 'role', 'authenticated')::text, true)
  from test_identities where kind='publisher';
set local role authenticated;
select pg_temp.assert_reads(true);
select pg_temp.assert_writes(true);
select pg_temp.assert_profiles(1);
reset role;

rollback;
select 'PASS: public visibility, all content CRUD for four roles, profile isolation, no privilege escalation; fixtures rolled back' as result;
