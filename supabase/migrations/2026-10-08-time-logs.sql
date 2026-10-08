-- Adds the time tracker's table to an existing Planner database.
-- Additive only: run once in the Supabase SQL editor. Drops nothing.

create table if not exists public.time_logs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  data jsonb not null default '{}'::jsonb
);

alter table public.time_logs enable row level security;

do $$
begin
  create policy "owner_all" on public.time_logs
    for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

create index if not exists time_logs_user_updated_idx on public.time_logs (user_id, updated_at);

do $$
begin
  alter publication supabase_realtime add table public.time_logs;
exception when duplicate_object then null;
end $$;
