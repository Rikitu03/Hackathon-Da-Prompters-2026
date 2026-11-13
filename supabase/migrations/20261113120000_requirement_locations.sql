-- Optional verified issuing-office and pinned-location metadata.
-- Legacy requirement records are left unpinned, never geocoded or guessed.
alter table public.requirements
  add column if not exists issuing_office text not null default '' check(length(issuing_office) <= 160),
  add column if not exists office_address text not null default '' check(length(office_address) <= 400),
  add column if not exists office_hours text not null default '' check(length(office_hours) <= 240),
  add column if not exists map_url text not null default '' check(length(map_url) <= 2000 and (map_url = '' or map_url ~ '^https://'));

-- Restore these fields whenever edits reconstruct the guide document.
create or replace function private.guide_document(p_cycle_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
  select jsonb_build_object(
    'programId', p.id, 'cycleId', c.id, 'title', p.title, 'description', p.description,
    'academicYear', c.academic_year, 'applicationStart', coalesce(c.application_start::text,''),
    'applicationEnd', coalesce(c.application_end::text,''), 'officialUrl', coalesce(c.official_url,''),
    'requirements', coalesce((select jsonb_agg(jsonb_build_object(
      'id',r.id,'title',r.title,'description',r.description,'required',r.is_required,
       'issuingOffice',r.issuing_office,'officeAddress',r.office_address,'officeHours',r.office_hours,'mapUrl',r.map_url,
      'steps',coalesce((select jsonb_agg(s.instruction order by s.position,s.id) from public.requirement_steps s where s.requirement_id=r.id),'[]'::jsonb),
      'faqs',coalesce((select jsonb_agg(jsonb_build_object('question',f.question,'answer',f.answer) order by f.id) from public.faqs f where f.requirement_id=r.id),'[]'::jsonb)
    ) order by r.position,r.id) from public.requirements r where r.cycle_id=c.id),'[]'::jsonb),
    'sources',coalesce((select jsonb_agg(jsonb_build_object(
      'id',s.id,'title',s.title,'url',coalesce(s.source_url,''),'approved',s.is_approved,
      'content',coalesce((select string_agg(k.content,'' order by k.position,k.id) from public.knowledge_chunks k where k.source_id=s.id),'')
    ) order by s.id) from public.knowledge_sources s where s.cycle_id=c.id),'[]'::jsonb)
  ) from public.application_cycles c join public.scholarship_programs p on p.id=c.program_id
  where c.id=p_cycle_id and (select private.is_content_admin())
$$;

create or replace function public.save_admin_content(p_action text,p_payload jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
  v_program_id uuid;
  v_cycle_id uuid := nullif(p_payload->>'cycleId','')::uuid;
  v_entity_id uuid;
  v_document jsonb;
  v_item jsonb;
  v_result jsonb;
begin
  if (select auth.uid()) is null or not (select private.is_content_publisher()) then
    raise exception 'Publisher access required' using errcode='42501';
  end if;
  if p_action not in ('save_cycle','save_requirement','save_source') then
    raise exception 'Unknown content operation' using errcode='22023';
  end if;
  if v_cycle_id is null and p_action='save_cycle' then
    v_program_id := (p_payload->>'programId')::uuid;
  else
    select program_id into v_program_id from public.application_cycles where id=v_cycle_id;
  end if;
  if v_program_id is null then raise exception 'Program or cycle not found' using errcode='P0002'; end if;
  perform 1 from public.scholarship_programs where id=v_program_id for update;
  if not found then raise exception 'Program not found' using errcode='P0002'; end if;
  if v_cycle_id is null then
    select jsonb_build_object('programId',p.id,'title',p.title,'description',p.description,
      'academicYear','','applicationStart','','applicationEnd','','officialUrl','',
      'requirements','[]'::jsonb,'sources','[]'::jsonb) into v_document
      from public.scholarship_programs p where p.id=v_program_id;
  else
    perform 1 from public.application_cycles where id=v_cycle_id for update;
    v_document := private.guide_document(v_cycle_id);
  end if;
  if p_action='save_cycle' then
    if (p_payload->>'programId')::uuid is distinct from v_program_id then
      raise exception 'Cycle does not belong to this program' using errcode='22023';
    end if;
    v_document := v_document || jsonb_build_object('academicYear',p_payload->>'academicYear',
      'applicationStart',p_payload->>'applicationStart','applicationEnd',p_payload->>'applicationEnd',
      'officialUrl',p_payload->>'officialUrl');
  elsif p_action='save_requirement' then
    v_entity_id := coalesce(nullif(p_payload->>'requirementId','')::uuid,gen_random_uuid());
    if p_payload ? 'requirementId' and not exists(select 1 from jsonb_array_elements(v_document->'requirements') item where item->>'id'=v_entity_id::text) then
      raise exception 'Requirement does not belong to this cycle' using errcode='22023';
    end if;
    v_item := jsonb_build_object('id',v_entity_id,'title',p_payload->>'title',
      'description',p_payload->>'description','required',p_payload->'required',
      'issuingOffice',coalesce(p_payload->>'issuingOffice',''),
      'officeAddress',coalesce(p_payload->>'officeAddress',''),
      'officeHours',coalesce(p_payload->>'officeHours',''),
      'mapUrl',coalesce(p_payload->>'mapUrl',''),
      'steps',p_payload->'steps','faqs',p_payload->'faqs');
    if p_payload ? 'requirementId' then
      v_document := jsonb_set(v_document,'{requirements}',(select jsonb_agg(case when item->>'id'=v_entity_id::text then v_item else item end order by ordinality)
        from jsonb_array_elements(v_document->'requirements') with ordinality as items(item,ordinality)));
    else
      v_document := jsonb_set(v_document,'{requirements}',(v_document->'requirements')||jsonb_build_array(v_item));
    end if;
  else
    v_entity_id := coalesce(nullif(p_payload->>'sourceId','')::uuid,gen_random_uuid());
    if p_payload ? 'sourceId' and not exists(select 1 from jsonb_array_elements(v_document->'sources') item where item->>'id'=v_entity_id::text) then
      raise exception 'Source does not belong to this cycle' using errcode='22023';
    end if;
    v_item := jsonb_build_object('id',v_entity_id,'title',p_payload->>'title',
      'url',p_payload->>'url','content',p_payload->>'content','approved',p_payload->'approved');
    if p_payload ? 'sourceId' then
      v_document := jsonb_set(v_document,'{sources}',(select jsonb_agg(case when item->>'id'=v_entity_id::text then v_item else item end order by ordinality)
        from jsonb_array_elements(v_document->'sources') with ordinality as items(item,ordinality)));
    else
      v_document := jsonb_set(v_document,'{sources}',(v_document->'sources')||jsonb_build_array(v_item));
    end if;
  end if;
  v_result := public.save_guide(v_document);
  return v_result || jsonb_build_object('entityId',coalesce(v_entity_id,(v_result->>'cycleId')::uuid));
end;
$$;

create or replace function public.save_guide(p_document jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
#variable_conflict use_variable
declare
  program_id uuid := nullif(p_document->>'programId', '')::uuid;
  cycle_id uuid := nullif(p_document->>'cycleId', '')::uuid;
  requirement_id uuid;
  source_id uuid;
  item jsonb;
  child jsonb;
  item_position integer;
  chunk_offset integer;
  previous_versions jsonb;
  previous_source jsonb;
  source_changed boolean;
begin
  if (select auth.uid()) is null or not (select private.is_content_publisher()) then
    raise exception 'Publisher access required' using errcode='42501';
  end if;
  if nullif(trim(p_document->>'title'), '') is null
    or nullif(trim(p_document->>'academicYear'), '') is null
    or jsonb_typeof(p_document->'requirements') is distinct from 'array'
    or jsonb_typeof(p_document->'sources') is distinct from 'array' then
    raise exception 'A title, academic year, requirements array, and sources array are required' using errcode='22023';
  end if;
  if program_id is null then
    if cycle_id is not null then raise exception 'Program ID required for an existing cycle' using errcode='22023'; end if;
    insert into public.scholarship_programs(title, description)
      values (trim(p_document->>'title'), coalesce(p_document->>'description', '')) returning id into program_id;
  else
    -- Saving is an explicit return to draft, so unreviewed edits cannot go live.
    update public.scholarship_programs set title=trim(p_document->>'title'),
      description=coalesce(p_document->>'description', ''), status='draft' where id=program_id;
    if not found then raise exception 'Program not found' using errcode='P0002'; end if;
  end if;
  if cycle_id is null then
    insert into public.application_cycles(program_id, academic_year)
      values(program_id, p_document->>'academicYear') returning id into cycle_id;
  else
    perform 1 from public.application_cycles c where c.id=cycle_id and c.program_id=program_id for update;
    if not found then raise exception 'Cycle does not belong to this program' using errcode='22023'; end if;
  end if;
  update public.application_cycles set academic_year=trim(p_document->>'academicYear'),
    application_start=nullif(p_document->>'applicationStart', '')::date,
    application_end=nullif(p_document->>'applicationEnd', '')::date,
    official_url=nullif(p_document->>'officialUrl', ''), status='draft', published_at=null where id=cycle_id;
  -- Replacing descendants and saving the draft is one database transaction.
  select coalesce(jsonb_object_agg(s.id::text, jsonb_build_object('title',s.title,'url',s.source_url,'version',s.content_version,'approved',s.is_approved,'reviewedAt',s.reviewed_at,'content',coalesce((select string_agg(k.content,'' order by k.position,k.id) from public.knowledge_chunks k where k.source_id=s.id),''))), '{}'::jsonb) into previous_versions
    from public.knowledge_sources s where s.cycle_id=cycle_id;
  delete from public.knowledge_sources s where s.cycle_id=cycle_id;
  delete from public.requirements r where r.cycle_id=cycle_id;
  item_position := 0;
  for item in select value from jsonb_array_elements(p_document->'requirements') loop
    requirement_id := coalesce(nullif(item->>'id', '')::uuid, gen_random_uuid());
    insert into public.requirements(id, cycle_id, title, description, is_required, position,
      issuing_office, office_address, office_hours, map_url)
      values(requirement_id, cycle_id, item->>'title', coalesce(item->>'description', ''),
        coalesce((item->>'required')::boolean, true), item_position,
        coalesce(item->>'issuingOffice',''),coalesce(item->>'officeAddress',''),
        coalesce(item->>'officeHours',''),coalesce(item->>'mapUrl',''));
    item_position := item_position + 1;
    insert into public.requirement_steps(requirement_id, position, instruction)
      select requirement_id, (ordinality-1)::integer, value #>> '{}'
      from jsonb_array_elements(coalesce(item->'steps', '[]'::jsonb)) with ordinality;
    for child in select value from jsonb_array_elements(coalesce(item->'faqs', '[]'::jsonb)) loop
      insert into public.faqs(requirement_id, question, answer)
        values(requirement_id, child->>'question', child->>'answer');
    end loop;
  end loop;
  for item in select value from jsonb_array_elements(p_document->'sources') loop
    source_id := coalesce(nullif(item->>'id', '')::uuid, gen_random_uuid());
    previous_source := previous_versions->source_id::text;
    source_changed := previous_source is null or previous_source->>'title' is distinct from item->>'title' or previous_source->>'url' is distinct from nullif(item->>'url','') or previous_source->>'content' is distinct from coalesce(item->>'content','');
    insert into public.knowledge_sources(id, cycle_id, title, source_url, content_version, is_approved, reviewed_at)
      values(source_id, cycle_id, item->>'title', nullif(item->>'url', ''),
        coalesce((previous_source->>'version')::integer,0)+case when source_changed then 1 else 0 end, coalesce((item->>'approved')::boolean, false),
        case when not coalesce((item->>'approved')::boolean,false) then null when not source_changed and (previous_source->>'approved')::boolean then (previous_source->>'reviewedAt')::timestamptz else now() end) returning id into source_id;
    if length(coalesce(item->>'content', '')) > 0 then
      for chunk_offset in 0..((length(item->>'content')-1)/1500) loop
        insert into public.knowledge_chunks(source_id, position, content)
          values(source_id, chunk_offset, substring(item->>'content' from chunk_offset*1500+1 for 1500));
      end loop;
    end if;
  end loop;
  return jsonb_build_object('programId', program_id, 'cycleId', cycle_id, 'status', 'draft');
end;
$$;
