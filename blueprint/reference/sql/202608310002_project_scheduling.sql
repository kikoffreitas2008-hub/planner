alter table public.project_items
  add column if not exists scheduled_all_day boolean not null default false;

