alter table public.user_settings
  add column if not exists calendar_visible_anchor date;
