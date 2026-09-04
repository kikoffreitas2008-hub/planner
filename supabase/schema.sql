-- Planner — sync schema. Run once in the Supabase SQL editor.
--
-- This repurposes the old project: it DROPS the PowerSync-era tables of the
-- same name and recreates them in the shape this build expects — the sync
-- columns plus a `data` jsonb blob (the client wraps/unwraps it). RLS
-- restricts every row to its owner (blueprint/04 §5).

create extension if not exists pgcrypto;

do $$
declare
  t text;
  tables text[] := array[
    'user_settings',
    'profiles',
    'projects',
    'project_items',
    'calendar_items',
    'recurrence_exceptions',
    'routine_lists',
    'routine_items',
    'remember_items',
    'sync_tombstones'
  ];
begin
  -- 1. clear out the old tables
  foreach t in array tables loop
    execute format('drop table if exists public.%1$I cascade;', t);
  end loop;
end $$;

do $$
declare
  t text;
  tables text[] := array[
    'user_settings',
    'projects',
    'project_items',
    'calendar_items',
    'recurrence_exceptions',
    'routine_lists',
    'routine_items',
    'remember_items',
    'sync_tombstones'
  ];
begin
  -- 2. recreate them in the new shape, with RLS
  foreach t in array tables loop
    execute format($f$
      create table public.%1$I (
        id uuid primary key,
        user_id uuid not null references auth.users(id) on delete cascade,
        updated_at timestamptz not null default now(),
        deleted_at timestamptz,
        data jsonb not null default '{}'::jsonb
      );
    $f$, t);

    execute format('alter table public.%1$I enable row level security;', t);

    execute format($f$
      create policy "owner_all" on public.%1$I
        for all
        using (user_id = auth.uid())
        with check (user_id = auth.uid());
    $f$, t);

    execute format(
      'create index %1$I on public.%2$I (user_id, updated_at);',
      t || '_user_updated_idx', t
    );
  end loop;
end $$;

-- 3. realtime: broadcast row changes so other devices pull promptly
do $$
declare
  t text;
begin
  foreach t in array array[
    'user_settings','projects','project_items','calendar_items',
    'recurrence_exceptions','routine_lists','routine_items',
    'remember_items','sync_tombstones'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%1$I;', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
