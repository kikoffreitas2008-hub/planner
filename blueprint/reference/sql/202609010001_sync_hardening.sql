create or replace function public.purge_my_expired_sync_tombstones()
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  removed bigint;
begin
  delete from public.sync_tombstones
  where user_id = (select auth.uid())
    and committed_at is not null
    and expires_at <= now();
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.purge_my_expired_sync_tombstones() from public, anon;
grant execute on function public.purge_my_expired_sync_tombstones() to authenticated;

-- O servidor, e nunca o relógio do dispositivo, decide a ordem global.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;
