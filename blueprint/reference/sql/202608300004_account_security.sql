create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.apple_revocation_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  encrypted_refresh_token bytea not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table private.account_deletion_audit (
  user_hash text primary key,
  deleted_at timestamptz not null default now(),
  apple_revocation_failed boolean not null default false
);

revoke all on all tables in schema private from public, anon, authenticated;

create or replace function public.store_apple_revocation_token(
  p_user_id uuid,
  p_refresh_token text,
  p_encryption_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.apple_revocation_tokens (user_id, encrypted_refresh_token)
  values (
    p_user_id,
    extensions.pgp_sym_encrypt(p_refresh_token, p_encryption_key, 'cipher-algo=aes256')
  )
  on conflict (user_id) do update
    set encrypted_refresh_token = excluded.encrypted_refresh_token,
        updated_at = now();
end;
$$;

create or replace function public.take_apple_revocation_token(
  p_user_id uuid,
  p_encryption_key text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  result text;
begin
  delete from private.apple_revocation_tokens
  where user_id = p_user_id
  returning extensions.pgp_sym_decrypt(encrypted_refresh_token, p_encryption_key)
  into result;
  return result;
end;
$$;

create or replace function public.record_account_deletion(
  p_user_hash text,
  p_apple_revocation_failed boolean
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.account_deletion_audit (user_hash, apple_revocation_failed)
  values (p_user_hash, p_apple_revocation_failed)
  on conflict (user_hash) do nothing;
$$;

create or replace function public.account_deletion_recorded(p_user_hash text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists(
    select 1 from private.account_deletion_audit where user_hash = p_user_hash
  );
$$;

revoke all on function public.store_apple_revocation_token(uuid, text, text) from public, anon, authenticated;
revoke all on function public.take_apple_revocation_token(uuid, text) from public, anon, authenticated;
revoke all on function public.record_account_deletion(text, boolean) from public, anon, authenticated;
revoke all on function public.account_deletion_recorded(text) from public, anon, authenticated;
grant execute on function public.store_apple_revocation_token(uuid, text, text) to service_role;
grant execute on function public.take_apple_revocation_token(uuid, text) to service_role;
grant execute on function public.record_account_deletion(text, boolean) to service_role;
grant execute on function public.account_deletion_recorded(text) to service_role;
