-- One SELECT policy per caller role, and separate publisher mutation policies.
-- Preserve every publication predicate from the initial migration.
do $$
declare
  content_table record;
  publication_predicate text;
begin
  for content_table in
    select * from (values
      ('scholarship_programs', 'programs'),
      ('application_cycles', 'cycles'),
      ('requirements', 'requirements'),
      ('requirement_steps', 'steps'),
      ('faqs', 'faqs'),
      ('knowledge_sources', 'sources'),
      ('knowledge_chunks', 'chunks')
    ) as content(table_name, policy_prefix)
  loop
    select qual into strict publication_predicate from pg_policies
      where schemaname='public' and tablename=content_table.table_name
        and policyname=content_table.policy_prefix || '_public_read';
    execute format('alter policy %I on public.%I to anon',
      content_table.policy_prefix || '_public_read', content_table.table_name);
    execute format('drop policy %I on public.%I',
      content_table.policy_prefix || '_admin_read', content_table.table_name);
    execute format('drop policy %I on public.%I',
      content_table.policy_prefix || '_publisher_write', content_table.table_name);
    execute format('create policy %I on public.%I for select to authenticated using ((%s) or (select private.is_content_admin()))',
      content_table.policy_prefix || '_authenticated_read', content_table.table_name, publication_predicate);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.is_content_publisher()))',
      content_table.policy_prefix || '_publisher_insert', content_table.table_name);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.is_content_publisher())) with check ((select private.is_content_publisher()))',
      content_table.policy_prefix || '_publisher_update', content_table.table_name);
    execute format('create policy %I on public.%I for delete to authenticated using ((select private.is_content_publisher()))',
      content_table.policy_prefix || '_publisher_delete', content_table.table_name);
  end loop;
end;
$$;
