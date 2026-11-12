-- Integration test for the transaction boundaries and business behavior.
-- Run as postgres. Everything, including synthetic Auth identities, rolls back.
begin;
create temporary table workflow_users(kind text, id uuid default gen_random_uuid());
insert into workflow_users(kind) values ('ordinary'), ('editor'), ('publisher');
insert into auth.users(id) select id from workflow_users;
insert into public.admin_profiles(user_id,role) select id,kind from workflow_users where kind<>'ordinary';
create temporary table workflow_state(document jsonb, saved jsonb);
insert into workflow_state(document) values(jsonb_build_object(
  'title', 'DEMO — Transaction test', 'description', 'Synthetic test content only.', 'academicYear', 'Test cycle',
  'applicationStart', '2026-11-01', 'applicationEnd', '2026-12-01', 'officialUrl', 'https://example.com/application',
  'requirements', jsonb_build_array(jsonb_build_object('title', 'Test document', 'description', 'Test', 'required', true,
    'steps', jsonb_build_array('First step','Second step'), 'faqs', jsonb_build_array(jsonb_build_object('question','Test?', 'answer','Test.')))),
  'sources', jsonb_build_array(jsonb_build_object('title','Test reference', 'url','https://example.com/reference',
    'approved',false,'content',repeat('A',1500)||repeat('B',1500)||repeat('C',400)))
));
grant select on workflow_users to authenticated;
grant select, update on workflow_state to authenticated, anon;

select set_config('request.jwt.claims', jsonb_build_object('sub',id,'role','authenticated')::text,true)
  from workflow_users where kind='publisher';
set local role authenticated;
update workflow_state set saved=public.save_guide(document);
do $$ begin
  if (select count(*) from public.application_cycles where id=(select (saved->>'cycleId')::uuid from workflow_state) and status='draft')<>1 then
    raise exception 'Saving must create a draft cycle';
  end if;
  if (select content from public.guide_source_text((select (saved->>'cycleId')::uuid from workflow_state)))
    <> (select document->'sources'->0->>'content' from workflow_state) then
    raise exception 'Source chunks must reconstruct in the original order';
  end if;
  begin
    perform public.set_cycle_publication((select (saved->>'cycleId')::uuid from workflow_state),true);
    raise exception 'Unreviewed source must block publication';
  exception when invalid_parameter_value then null;
  end;
end $$;
reset role;

set local role anon;
do $$ begin
  if exists(select 1 from public.scholarship_programs where id=(select (saved->>'programId')::uuid from workflow_state)) then
    raise exception 'Draft program leaked to anonymous caller';
  end if;
  if has_function_privilege(current_user,'public.save_guide(jsonb)','EXECUTE')
    or has_function_privilege(current_user,'public.set_cycle_publication(uuid,boolean)','EXECUTE') then
    raise exception 'Anonymous caller must not execute mutation RPCs';
  end if;
end $$;
reset role;

select set_config('request.jwt.claims', jsonb_build_object('sub',id,'role','authenticated')::text,true)
  from workflow_users where kind='editor';
set local role authenticated;
do $$ begin
  begin
    perform public.save_guide((select document from workflow_state));
    raise exception 'Editor must not save guides';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.set_cycle_publication((select (saved->>'cycleId')::uuid from workflow_state),true);
    raise exception 'Editor must not publish';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select set_config('request.jwt.claims', jsonb_build_object('sub',id,'role','authenticated')::text,true)
  from workflow_users where kind='ordinary';
set local role authenticated;
do $$ begin
  begin
    perform public.save_guide((select document from workflow_state));
    raise exception 'Ordinary caller must not save guides';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select set_config('request.jwt.claims', jsonb_build_object('sub',id,'role','authenticated')::text,true)
  from workflow_users where kind='publisher';
set local role authenticated;
update workflow_state set document=jsonb_set(document || (saved-'status'),'{sources,0,approved}','true'::jsonb);
update workflow_state set saved=public.save_guide(document);
do $$ declare previous_title text; begin
  select title into previous_title from public.scholarship_programs where id=(select (saved->>'programId')::uuid from workflow_state);
  begin
    perform public.save_guide((select document || jsonb_build_object('title','Must roll back', 'applicationEnd','2026-01-01') from workflow_state));
    raise exception 'Invalid dates must fail';
  exception when check_violation then null;
  end;
  if (select title from public.scholarship_programs where id=(select (saved->>'programId')::uuid from workflow_state))<>previous_title then
    raise exception 'A failed save must roll back its earlier program mutation';
  end if;
end $$;
select public.set_cycle_publication((select (saved->>'cycleId')::uuid from workflow_state),true);
reset role;

set local role anon;
do $$ begin
  if (select count(*) from public.scholarship_programs where id=(select (saved->>'programId')::uuid from workflow_state))<>1
    or (select count(*) from public.application_cycles where id=(select (saved->>'cycleId')::uuid from workflow_state))<>1 then
    raise exception 'Published guide must become publicly readable';
  end if;
end $$;
reset role;

set local role authenticated;
select public.set_cycle_publication((select (saved->>'cycleId')::uuid from workflow_state),false);
reset role;
set local role anon;
do $$ begin
  if exists(select 1 from public.application_cycles where id=(select (saved->>'cycleId')::uuid from workflow_state)) then
    raise exception 'Unpublished guide must disappear from public reads';
  end if;
end $$;
reset role;
rollback;
select 'PASS: atomic draft save, ordered source chunks, review gate, publisher authorization, publish/unpublish visibility, failed-save rollback; no fixtures retained' as result;
