alter table public.calendar_items
  add column if not exists series_started_at timestamptz;

alter table public.calendar_items
  drop constraint if exists calendar_items_notification_offsets_check;

alter table public.calendar_items
  add constraint calendar_items_notification_offsets_check
  check (
    notification_offsets is null or (
      jsonb_typeof(notification_offsets::jsonb) = 'array'
      and not jsonb_path_exists(notification_offsets::jsonb, '$[*] ? (@ < 0)')
    )
  );
