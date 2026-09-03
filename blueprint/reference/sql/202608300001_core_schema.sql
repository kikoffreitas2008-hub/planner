create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key default gen_random_uuid() references auth.users(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  locale text not null default 'pt-PT' check (locale = 'pt-PT'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint profiles_identity_check check (id = user_id),
  constraint profiles_id_user_unique unique (id, user_id)
);

create table public.user_settings (
  id uuid primary key default gen_random_uuid() references auth.users(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  time_zone text not null default 'Europe/Lisbon',
  last_overdue_review_date date,
  week_starts_on smallint not null default 1 check (week_starts_on = 1),
  notifications_enabled boolean not null default true,
  project_progress_visible boolean not null default true,
  reduce_motion boolean not null default false,
  default_calendar_view text not null default 'month'
    check (default_calendar_view in ('month', 'week', 'day')),
  calendar_visible_anchor date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint user_settings_identity_check check (id = user_id),
  constraint user_settings_id_user_unique unique (id, user_id)
);

create table public.calendar_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('task', 'event')),
  title text not null check (length(trim(title)) > 0),
  notes text,
  location text,
  date date not null,
  starts_at timestamptz,
  ends_at timestamptz,
  all_day boolean not null default false,
  completed_at timestamptz,
  color text not null check (color in ('blue', 'green', 'pink', 'purple', 'red', 'orange', 'yellow')),
  recurrence_rule text,
  notification_offsets text,
  series_started_at timestamptz,
  manual_sort_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint calendar_items_time_order_check
    check (starts_at is null or ends_at is null or starts_at < ends_at),
  constraint calendar_items_task_location_check
    check (item_type = 'event' or location is null),
  constraint calendar_items_notification_offsets_check
    check (
      notification_offsets is null or (
        jsonb_typeof(notification_offsets::jsonb) = 'array'
        and not jsonb_path_exists(notification_offsets::jsonb, '$[*] ? (@ < 0)')
      )
    ),
  constraint calendar_items_id_user_unique unique (id, user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  mode text not null check (mode in ('simple', 'structured')),
  color text not null check (color in ('blue', 'green', 'pink', 'purple', 'red', 'orange', 'yellow')),
  progress_mode text not null check (progress_mode in ('items', 'time')),
  order_mode text not null default 'importance_default'
    check (order_mode in ('importance_default', 'manual')),
  archived_at timestamptz,
  manual_sort_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint projects_id_user_unique unique (id, user_id)
);

create table public.project_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null,
  parent_id uuid,
  title text not null check (length(trim(title)) > 0),
  importance text check (importance in ('low', 'medium', 'high')),
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes >= 0),
  notes text,
  completed_at timestamptz,
  manual_sort_key text not null,
  scheduled_date date,
  scheduled_all_day boolean not null default false,
  scheduled_starts_at timestamptz,
  scheduled_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint project_items_time_order_check
    check (scheduled_starts_at is null or scheduled_ends_at is null or scheduled_starts_at < scheduled_ends_at),
  constraint project_items_schedule_date_check
    check (scheduled_starts_at is null or scheduled_date is not null),
  constraint project_items_id_project_user_unique unique (id, project_id, user_id),
  constraint project_items_project_owner_fk
    foreign key (project_id, user_id)
    references public.projects(id, user_id) on delete cascade,
  constraint project_items_parent_owner_fk
    foreign key (parent_id, project_id, user_id)
    references public.project_items(id, project_id, user_id) on delete cascade
);

create table public.routine_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  archived_at timestamptz,
  manual_sort_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint routine_lists_id_user_unique unique (id, user_id)
);

create table public.routine_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_list_id uuid not null,
  title text not null check (length(trim(title)) > 0),
  completed_at timestamptz,
  manual_sort_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint routine_items_list_owner_fk
    foreign key (routine_list_id, user_id)
    references public.routine_lists(id, user_id) on delete cascade
);

create table public.remember_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  title text not null check (length(trim(title)) > 0),
  color text not null check (color in ('blue', 'green', 'pink', 'purple', 'red', 'orange', 'yellow')),
  manual_sort_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.recurrence_exceptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  origin_id uuid not null,
  occurrence_date date not null,
  exception_type text not null check (exception_type in ('cancelled', 'modified')),
  replacement_json text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint recurrence_exceptions_payload_check check (
    (exception_type = 'cancelled' and replacement_json is null)
    or (exception_type = 'modified' and replacement_json is not null)
  ),
  constraint recurrence_exceptions_origin_owner_fk
    foreign key (origin_id, user_id)
    references public.calendar_items(id, user_id) on delete cascade,
  constraint recurrence_exceptions_origin_occurrence_unique
    unique (origin_id, occurrence_date)
);

create table public.sync_tombstones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz not null,
  committed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  constraint sync_tombstones_target_unique unique (user_id, entity_type, entity_id)
);

create index calendar_items_owner_date_idx on public.calendar_items(user_id, date);
create index calendar_items_owner_updated_idx on public.calendar_items(user_id, updated_at);
create index calendar_items_owner_manual_sort_idx on public.calendar_items(user_id, manual_sort_key);
create index projects_owner_updated_idx on public.projects(user_id, updated_at);
create index projects_owner_manual_sort_idx on public.projects(user_id, manual_sort_key);
create index project_items_project_parent_idx on public.project_items(project_id, parent_id);
create index project_items_owner_updated_idx on public.project_items(user_id, updated_at);
create index project_items_owner_manual_sort_idx on public.project_items(user_id, manual_sort_key);
create index project_items_owner_date_idx on public.project_items(user_id, scheduled_date);
create index routine_lists_owner_updated_idx on public.routine_lists(user_id, updated_at);
create index routine_lists_owner_manual_sort_idx on public.routine_lists(user_id, manual_sort_key);
create index routine_items_owner_updated_idx on public.routine_items(user_id, updated_at);
create index routine_items_owner_manual_sort_idx on public.routine_items(user_id, manual_sort_key);
create index remember_items_owner_date_idx on public.remember_items(user_id, date);
create index remember_items_owner_updated_idx on public.remember_items(user_id, updated_at);
create index remember_items_owner_manual_sort_idx on public.remember_items(user_id, manual_sort_key);
create index recurrence_exceptions_owner_updated_idx on public.recurrence_exceptions(user_id, updated_at);
create index sync_tombstones_owner_updated_idx on public.sync_tombstones(user_id, updated_at);
create index sync_tombstones_expiry_idx on public.sync_tombstones(expires_at);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'user_settings', 'calendar_items', 'projects', 'project_items',
    'routine_lists', 'routine_items', 'remember_items',
    'recurrence_exceptions', 'sync_tombstones'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      table_name || '_set_updated_at', table_name
    );
  end loop;
end;
$$;

create or replace function public.purge_expired_sync_tombstones()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed bigint;
begin
  delete from public.sync_tombstones where expires_at <= now();
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.purge_expired_sync_tombstones() from public, anon, authenticated;
