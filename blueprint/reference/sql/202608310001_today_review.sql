alter table public.user_settings
  add column if not exists last_overdue_review_date date;

insert into public.user_settings (id, user_id)
select id, id from auth.users
on conflict (id) do nothing;

create or replace function public.create_user_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_settings (id, user_id)
  values (new.id, new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_user_settings_after_signup on auth.users;
create trigger create_user_settings_after_signup
after insert on auth.users
for each row execute procedure public.create_user_settings();
