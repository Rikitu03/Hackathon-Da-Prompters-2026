-- All mutations use the caller's identity and existing publisher RLS.
alter table public.application_cycles add constraint cycle_dates_ordered
  check (application_start is null or application_end is null or application_end >= application_start);
alter table public.knowledge_chunks add column position integer not null default 0 check (position >= 0);

create function public.save_guide(p_document jsonb) returns jsonb
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
  select coalesce(jsonb_object_agg(s.id::text, s.content_version), '{}'::jsonb) into previous_versions
    from public.knowledge_sources s where s.cycle_id=cycle_id;
  delete from public.knowledge_sources s where s.cycle_id=cycle_id;
  delete from public.requirements r where r.cycle_id=cycle_id;
  item_position := 0;
  for item in select value from jsonb_array_elements(p_document->'requirements') loop
    requirement_id := coalesce(nullif(item->>'id', '')::uuid, gen_random_uuid());
    insert into public.requirements(id, cycle_id, title, description, is_required, position)
      values(requirement_id, cycle_id, item->>'title', coalesce(item->>'description', ''),
        coalesce((item->>'required')::boolean, true), item_position);
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
    insert into public.knowledge_sources(id, cycle_id, title, source_url, content_version, is_approved, reviewed_at)
      values(source_id, cycle_id, item->>'title', nullif(item->>'url', ''),
        coalesce((previous_versions->>source_id::text)::integer, 0)+1, coalesce((item->>'approved')::boolean, false),
        case when (item->>'approved')::boolean then now() else null end) returning id into source_id;
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

create function public.set_cycle_publication(p_cycle_id uuid, p_publish boolean) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  cycle public.application_cycles;
  program public.scholarship_programs;
begin
  if (select auth.uid()) is null or not (select private.is_content_publisher()) then
    raise exception 'Publisher access required' using errcode='42501';
  end if;
  select * into cycle from public.application_cycles where id=p_cycle_id for update;
  if not found then raise exception 'Cycle not found' using errcode='P0002'; end if;
  select * into program from public.scholarship_programs where id=cycle.program_id for update;
  if p_publish then
    if length(trim(program.title))=0 or length(trim(program.description))=0
      or length(trim(cycle.academic_year))=0 or cycle.application_start is null or cycle.application_end is null
      or cycle.official_url is null or cycle.official_url !~ '^https://' then
      raise exception 'Add a title, description, academic year, application dates, and HTTPS official URL before publishing' using errcode='22023';
    end if;
    if not exists(select 1 from public.requirements where cycle_id=cycle.id)
      or exists(select 1 from public.requirements r where r.cycle_id=cycle.id and
        (length(trim(r.title))=0 or not exists(select 1 from public.requirement_steps s where s.requirement_id=r.id and length(trim(s.instruction))>0))) then
      raise exception 'Add at least one requirement and an acquisition step for every requirement' using errcode='22023';
    end if;
    if not exists(select 1 from public.knowledge_sources s where s.cycle_id=cycle.id and s.is_approved
      and s.reviewed_at is not null and s.source_url ~ '^https://'
      and exists(select 1 from public.knowledge_chunks k where k.source_id=s.id and length(trim(k.content))>0)) then
      raise exception 'Add a reviewed and approved HTTPS source with reference text before publishing' using errcode='22023';
    end if;
    update public.scholarship_programs set status='published' where id=cycle.program_id;
    update public.application_cycles set status='published', published_at=now() where id=cycle.id;
  else
    update public.application_cycles set status='draft', published_at=null where id=cycle.id;
    if not exists(select 1 from public.application_cycles where program_id=cycle.program_id and status='published') then
      update public.scholarship_programs set status='draft' where id=cycle.program_id;
    end if;
  end if;
  return jsonb_build_object('programId', cycle.program_id, 'cycleId', cycle.id,
    'status', case when p_publish then 'published' else 'draft' end);
end;
$$;

revoke all on function public.save_guide(jsonb) from public, anon, authenticated;
revoke all on function public.set_cycle_publication(uuid, boolean) from public, anon, authenticated;
grant execute on function public.save_guide(jsonb) to authenticated;
grant execute on function public.set_cycle_publication(uuid, boolean) to authenticated;

create function public.guide_source_text(p_cycle_id uuid) returns table(source_id uuid, content text)
language sql stable security invoker set search_path = '' as $$
  select s.id, coalesce(string_agg(k.content, '' order by k.position, k.id), '')
  from public.knowledge_sources s left join public.knowledge_chunks k on k.source_id=s.id
  where s.cycle_id=p_cycle_id and (select auth.uid()) is not null and (select private.is_content_admin())
  group by s.id
$$;
revoke all on function public.guide_source_text(uuid) from public, anon, authenticated;
grant execute on function public.guide_source_text(uuid) to authenticated;
