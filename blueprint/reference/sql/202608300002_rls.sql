do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'user_settings', 'calendar_items', 'projects', 'project_items',
    'routine_lists', 'routine_items', 'remember_items',
    'recurrence_exceptions', 'sync_tombstones'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon', table_name);
    execute format(
      'grant select, insert, update, delete on table public.%I to authenticated',
      table_name
    );
  end loop;
end;
$$;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = user_id and id = (select auth.uid()));
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = user_id and id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id and id = (select auth.uid()))
  with check ((select auth.uid()) = user_id and id = (select auth.uid()));
create policy profiles_delete_own on public.profiles
  for delete to authenticated
  using ((select auth.uid()) = user_id and id = (select auth.uid()));

create policy user_settings_select_own on public.user_settings
  for select to authenticated
  using ((select auth.uid()) = user_id and id = (select auth.uid()));
create policy user_settings_insert_own on public.user_settings
  for insert to authenticated
  with check ((select auth.uid()) = user_id and id = (select auth.uid()));
create policy user_settings_update_own on public.user_settings
  for update to authenticated
  using ((select auth.uid()) = user_id and id = (select auth.uid()))
  with check ((select auth.uid()) = user_id and id = (select auth.uid()));
create policy user_settings_delete_own on public.user_settings
  for delete to authenticated
  using ((select auth.uid()) = user_id and id = (select auth.uid()));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'calendar_items', 'projects', 'project_items', 'routine_lists',
    'routine_items', 'remember_items', 'recurrence_exceptions', 'sync_tombstones'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      table_name || '_select_own', table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      table_name || '_insert_own', table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      table_name || '_update_own', table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      table_name || '_delete_own', table_name
    );
  end loop;
end;
$$;
