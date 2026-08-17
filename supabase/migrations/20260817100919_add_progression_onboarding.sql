alter table public.profiles
  add column if not exists onboarding_version integer not null default 0,
  add column if not exists onboarding_completed_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_onboarding_version_check;

alter table public.profiles
  add constraint profiles_onboarding_version_check
  check (onboarding_version between 0 and 100);

create or replace function public.complete_site_onboarding(p_version integer)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  completed_version integer;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_version is null or p_version < 1 or p_version > 100 then
    raise exception 'ONBOARDING_VERSION_INVALID';
  end if;

  insert into public.profiles (id, onboarding_version, onboarding_completed_at)
  values (uid, p_version, now())
  on conflict (id) do update
  set onboarding_version = greatest(public.profiles.onboarding_version, excluded.onboarding_version),
      onboarding_completed_at = case
        when excluded.onboarding_version > public.profiles.onboarding_version then excluded.onboarding_completed_at
        else public.profiles.onboarding_completed_at
      end
  returning onboarding_version into completed_version;

  return completed_version;
end;
$$;

revoke all on function public.complete_site_onboarding(integer) from public, anon, authenticated;
grant execute on function public.complete_site_onboarding(integer) to authenticated;

comment on column public.profiles.onboarding_version is
  'Highest version of the first-login Early Shout guide completed or skipped by this account.';
comment on function public.complete_site_onboarding(integer) is
  'Marks the authenticated account guide complete without granting general profile update access.';
