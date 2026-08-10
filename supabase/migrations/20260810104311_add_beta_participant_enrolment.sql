begin;

create table if not exists public.beta_program_settings (
  id integer primary key default 1 check (id = 1),
  enrollment_open boolean not null default true,
  promised_months integer not null default 12 check (promised_months between 1 and 24),
  terms_version text not null default 'founder-beta-v1' check (length(btrim(terms_version)) > 0),
  closes_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.beta_program_settings(id)
values (1)
on conflict (id) do nothing;

create table if not exists public.beta_participants (
  user_id uuid primary key references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  source text not null default 'beta-page' check (length(btrim(source)) between 1 and 80),
  reward_status text not null default 'eligible' check (reward_status in ('eligible', 'redeemed', 'revoked')),
  promised_months integer not null check (promised_months between 1 and 24),
  terms_version text not null check (length(btrim(terms_version)) > 0),
  redeemed_at timestamptz,
  revoked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((reward_status = 'redeemed') = (redeemed_at is not null))
);

create index if not exists beta_participants_joined_at_idx
  on public.beta_participants(joined_at desc);

alter table public.beta_program_settings enable row level security;
alter table public.beta_participants enable row level security;

revoke all on table public.beta_program_settings from public, anon, authenticated;
revoke all on table public.beta_participants from public, anon, authenticated;
grant select on table public.beta_participants to authenticated;
grant all on table public.beta_program_settings to service_role;
grant all on table public.beta_participants to service_role;

drop policy if exists beta_participants_owner_read on public.beta_participants;
create policy beta_participants_owner_read
on public.beta_participants
for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.beta_join(p_source text default 'beta-page')
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  settings public.beta_program_settings;
  participant public.beta_participants;
  safe_source text := left(coalesce(nullif(btrim(p_source), ''), 'beta-page'), 80);
begin
  if uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  select * into settings
  from public.beta_program_settings
  where id = 1;

  if settings.id is null
     or not settings.enrollment_open
     or (settings.closes_at is not null and now() >= settings.closes_at) then
    raise exception 'BETA_ENROLLMENT_CLOSED' using errcode = 'P0001';
  end if;

  insert into public.beta_participants(
    user_id, source, promised_months, terms_version
  ) values (
    uid, safe_source, settings.promised_months, settings.terms_version
  )
  on conflict (user_id) do update
    set updated_at = public.beta_participants.updated_at
  returning * into participant;

  return jsonb_build_object(
    'joined', true,
    'joined_at', participant.joined_at,
    'reward_status', participant.reward_status,
    'promised_months', participant.promised_months,
    'terms_version', participant.terms_version
  );
end;
$$;

create or replace function public.beta_my_status()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  participant public.beta_participants;
  settings public.beta_program_settings;
begin
  if uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  select * into participant
  from public.beta_participants
  where user_id = uid;

  select * into settings
  from public.beta_program_settings
  where id = 1;

  return jsonb_build_object(
    'joined', participant.user_id is not null,
    'joined_at', participant.joined_at,
    'reward_status', participant.reward_status,
    'promised_months', coalesce(participant.promised_months, settings.promised_months, 12),
    'terms_version', coalesce(participant.terms_version, settings.terms_version, 'founder-beta-v1'),
    'enrollment_open', coalesce(settings.enrollment_open, false)
      and (settings.closes_at is null or now() < settings.closes_at)
  );
end;
$$;

revoke all on function public.beta_join(text) from public, anon;
revoke all on function public.beta_my_status() from public, anon;
grant execute on function public.beta_join(text) to authenticated, service_role;
grant execute on function public.beta_my_status() to authenticated, service_role;

alter function public.beta_join(text) set statement_timeout = '4s';
alter function public.beta_join(text) set lock_timeout = '2s';
alter function public.beta_my_status() set statement_timeout = '4s';

comment on table public.beta_participants is
  'Account-backed record of founder beta enrollment and the promised future access benefit.';
comment on function public.beta_join(text) is
  'Idempotently enrolls the authenticated user in the open founder beta program.';

commit;
