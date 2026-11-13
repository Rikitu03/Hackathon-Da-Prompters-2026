-- Run as postgres. All test content, users and guest references are rolled back.
begin;
create temporary table integration_state(program_id uuid default gen_random_uuid(),cycle_id uuid,requirement_id uuid,source_id uuid,publisher_id uuid default gen_random_uuid(),editor_id uuid default gen_random_uuid(),reviewed_at timestamptz);
insert into integration_state default values;
insert into auth.users(id) select publisher_id from integration_state union all select editor_id from integration_state;
insert into public.admin_profiles(user_id,role) select publisher_id,'publisher' from integration_state union all select editor_id,'editor' from integration_state;
insert into public.scholarship_programs(id,title,description) select program_id,'DEMO - Atomic integration fixture','Synthetic content only' from integration_state;
grant select,update on integration_state to authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',publisher_id,'role','authenticated')::text,true) from integration_state;
set local role authenticated;
update integration_state set cycle_id=(public.save_admin_content('save_cycle',jsonb_build_object('programId',program_id,'academicYear','Test cycle','applicationStart','2026-11-01','applicationEnd','2026-12-31','officialUrl','https://example.test/apply'))->>'cycleId')::uuid;
update integration_state set requirement_id=(public.save_admin_content('save_requirement',jsonb_build_object('cycleId',cycle_id,'title','Test document','description','Synthetic requirement','required',true,'steps',jsonb_build_array('First step'),'faqs',jsonb_build_array(jsonb_build_object('question','Example?','answer','Synthetic.'))))->>'entityId')::uuid;
update integration_state set source_id=(public.save_admin_content('save_source',jsonb_build_object('cycleId',cycle_id,'title','Test source','url','https://example.test/reference','content','Reviewed synthetic reference text','approved',true))->>'entityId')::uuid;
update integration_state set reviewed_at=(select s.reviewed_at from public.knowledge_sources s where s.id=source_id);
select public.save_admin_content('save_requirement',jsonb_build_object('cycleId',cycle_id,'requirementId',requirement_id,'title','Updated document','description','Synthetic requirement','required',true,'steps',jsonb_build_array('Updated step'),'faqs','[]'::jsonb)) from integration_state;
do $$ begin
  if not exists(select 1 from public.knowledge_sources s join integration_state t on t.source_id=s.id where s.content_version=1 and s.reviewed_at=t.reviewed_at) then
    raise exception 'Unrelated edits must preserve source version and review time';
  end if;
  if not exists(select 1 from public.requirement_steps s join integration_state t on t.requirement_id=s.requirement_id where s.instruction='Updated step') then
    raise exception 'Requirement update did not persist';
  end if;
  begin
    perform public.save_admin_content('save_requirement',jsonb_build_object('cycleId',(select cycle_id from integration_state),'requirementId',gen_random_uuid(),'title','Unrelated ID','description','','required',true,'steps','[]'::jsonb,'faqs','[]'::jsonb));
    raise exception 'An unrelated requirement ID was accepted';
  exception when invalid_parameter_value then null;
  end;
end $$;
select public.set_cycle_publication(cycle_id,true) from integration_state;
select public.save_admin_content('save_source',jsonb_build_object('cycleId',cycle_id,'sourceId',source_id,'title','Test source','url','https://example.test/reference','content','Changed reference awaiting review','approved',false)) from integration_state;
do $$ begin
  if not exists(select 1 from public.knowledge_sources s join integration_state t on t.source_id=s.id where s.content_version=2 and not s.is_approved and s.reviewed_at is null) then
    raise exception 'Changed source must have the next version and no approval';
  end if;
  if exists(select 1 from public.scholarship_programs p join integration_state t on t.program_id=p.id where p.status<>'draft') then
    raise exception 'Editing must return the program to draft';
  end if;
  begin
    perform public.set_cycle_publication((select cycle_id from integration_state),true);
    raise exception 'Unreviewed changes were publishable';
  exception when invalid_parameter_value then null;
  end;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',editor_id,'role','authenticated')::text,true) from integration_state;
set local role authenticated;
do $$ begin
  begin
    perform public.save_admin_content('save_cycle',jsonb_build_object('programId',(select program_id from integration_state),'academicYear','Unauthorized'));
    raise exception 'Editor mutation was accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

create temporary table guest_proofs(id uuid,token_hash text,issued_at bigint,proof text,wrong_token_proof text,stale_proof text);
insert into guest_proofs(id,token_hash,issued_at) values(gen_random_uuid(),repeat('a',64),extract(epoch from now())::bigint);
update guest_proofs g set
  proof=encode(extensions.hmac(g.id::text||'|'||g.token_hash||'|-|'||g.issued_at::text||'|0',s.secret,'sha256'),'hex'),
  wrong_token_proof=encode(extensions.hmac(g.id::text||'|'||repeat('b',64)||'|-|'||g.issued_at::text||'|0',s.secret,'sha256'),'hex'),
  stale_proof=encode(extensions.hmac(g.id::text||'|'||g.token_hash||'|-|'||(g.issued_at-1000)::text||'|0',s.secret,'sha256'),'hex')
from private.applicant_session_secret s where s.singleton;
grant select on guest_proofs to anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
select public.applicant_session_request(id,token_hash,null,issued_at,false,proof) from guest_proofs;
do $$ begin
  if has_table_privilege(current_user,'private.applicant_sessions','SELECT') or has_table_privilege(current_user,'private.applicant_sessions','INSERT')
    or has_table_privilege(current_user,'private.applicant_session_secret','SELECT') then
    raise exception 'Anonymous caller has direct access to private metadata or secrets';
  end if;
  begin
    perform public.applicant_session_request(id,token_hash,null,issued_at,false,repeat('0',64)) from guest_proofs;
    raise exception 'Unsigned metadata request was accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.applicant_session_request(id,repeat('b',64),null,issued_at,false,wrong_token_proof) from guest_proofs;
    raise exception 'A different token accessed the existing reference';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.applicant_session_request(id,token_hash,null,issued_at-1000,false,stale_proof) from guest_proofs;
    raise exception 'Expired server proof was accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
update private.applicant_sessions s set expires_at=now()-interval '1 second' from guest_proofs g where s.id=g.id;
set local role anon;
do $$ declare result jsonb; begin
  select public.applicant_session_request(id,token_hash,null,issued_at,false,proof) into result from guest_proofs;
  if result->>'expired' is distinct from 'true' then raise exception 'Expired reference was renewed'; end if;
end $$;
reset role;
do $$ begin
  if exists(select 1 from private.applicant_sessions s join guest_proofs g on g.id=s.id) then raise exception 'Expired metadata was retained'; end if;
  if exists(select 1 from information_schema.columns where table_schema='private' and table_name='applicant_sessions' and column_name not in ('id','token_hash','ip_hash','ip_hash_day','created_at','last_seen_at','expires_at')) then
    raise exception 'Unexpected applicant data column';
  end if;
end $$;
rollback;
select 'PASS: atomic admin edits, role enforcement, source review/version preservation, guest proof isolation and expiry; no fixtures retained' as result;
