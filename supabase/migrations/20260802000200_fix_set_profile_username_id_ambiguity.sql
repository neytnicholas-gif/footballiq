-- Fix ambiguous "id" resolution inside set_profile_username in already-provisioned databases.
-- Keeps auth/ACL semantics unchanged while making conflict target explicit.

create or replace function public.set_profile_username(
  p_username text
)
returns table (id uuid, username text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  clean_username text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  clean_username := btrim(p_username);
  if char_length(clean_username) < 3 or char_length(clean_username) > 20 then
    raise exception 'Invalid username length';
  end if;
  if clean_username !~ '^[A-Za-z0-9_]+$' then
    raise exception 'Invalid username format';
  end if;

  insert into public.profiles (id, username)
  values (uid, clean_username)
  on conflict on constraint profiles_pkey do update
  set username = excluded.username;

  return query
  select p.id as id, p.username as username
  from public.profiles p
  where p.id = uid;
end;
$$;

revoke all on function public.set_profile_username(text) from public, anon, authenticated, service_role;
grant execute on function public.set_profile_username(text) to authenticated;
