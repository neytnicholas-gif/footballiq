-- FootballIQ real-performance persistence boundary.
-- REVIEW ONLY: do not apply until provider licensing, staging tests, backups,
-- security advisors and an explicit production change window are approved.

begin;

create schema if not exists market_ingestion;
revoke all on schema market_ingestion from public, anon, authenticated;
grant usage on schema market_ingestion to service_role;

create table market_ingestion.providers (
  provider_key text primary key check (provider_key ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  display_name text not null,
  adapter_version text not null,
  enabled boolean not null default false,
  rating_scale_min numeric(4,2) not null default 0,
  rating_scale_max numeric(4,2) not null default 10,
  licence_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (rating_scale_min < rating_scale_max),
  check (not enabled or licence_verified_at is not null)
);

create table market_ingestion.methodologies (
  methodology_version text primary key,
  status text not null check (status in ('draft','approved','retired')),
  configuration jsonb not null,
  checksum text not null unique,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  check (status <> 'approved' or approved_at is not null)
);

create table market_ingestion.import_batches (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null references market_ingestion.providers(provider_key),
  provider_batch_id text not null,
  payload_checksum text not null,
  adapter_version text not null,
  status text not null default 'received' check (status in ('received','validated','rejected','processing','applied','failed','superseded')),
  retrieved_at timestamptz not null,
  verified_at timestamptz,
  processing_started_at timestamptz,
  processing_finished_at timestamptz,
  failure_code text,
  failure_detail text,
  record_count integer not null default 0 check (record_count >= 0),
  accepted_count integer not null default 0 check (accepted_count >= 0),
  rejected_count integer not null default 0 check (rejected_count >= 0),
  created_at timestamptz not null default now(),
  unique (provider_key, provider_batch_id),
  unique (provider_key, payload_checksum)
);

create table market_ingestion.provider_players (
  id bigint generated always as identity primary key,
  provider_key text not null references market_ingestion.providers(provider_key),
  provider_player_id text not null,
  provider_club_id text not null,
  market_player_id bigint references public.market_players(id) on delete restrict,
  display_name text not null,
  club_name text not null,
  position text not null check (position in ('GK','DEF','MID','FWD')),
  squad_status text not null check (squad_status in ('first_team','rotation','loaned_out','injured','departed','inactive')),
  effective_from date not null,
  effective_to date,
  source_batch_id uuid not null references market_ingestion.import_batches(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_key, provider_player_id, effective_from),
  check (effective_to is null or effective_to >= effective_from)
);

create unique index provider_players_current_identity_uidx
  on market_ingestion.provider_players(provider_key, provider_player_id)
  where effective_to is null;
create index provider_players_market_player_idx
  on market_ingestion.provider_players(market_player_id) where market_player_id is not null;

create table market_ingestion.provider_fixtures (
  id bigint generated always as identity primary key,
  provider_key text not null references market_ingestion.providers(provider_key),
  provider_fixture_id text not null,
  competition_id text not null,
  season_id text not null,
  gameweek integer check (gameweek is null or gameweek > 0),
  kickoff_at timestamptz not null,
  status text not null check (status in ('scheduled','postponed','cancelled','finished')),
  home_club_id text not null,
  away_club_id text not null,
  source_batch_id uuid not null references market_ingestion.import_batches(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_key, provider_fixture_id),
  check (home_club_id <> away_club_id)
);

create table market_ingestion.appearances (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null,
  fixture_id bigint not null references market_ingestion.provider_fixtures(id) on delete restrict,
  player_identity_id bigint not null references market_ingestion.provider_players(id) on delete restrict,
  provider_fixture_id text not null,
  provider_player_id text not null,
  provider_appearance_id text not null,
  version integer not null default 1 check (version > 0),
  appeared boolean not null,
  minutes_played integer not null check (minutes_played between 0 and 130),
  rating numeric(4,2),
  verification_status text not null check (verification_status in ('pending','verified','rejected')),
  source_reference text not null,
  retrieved_at timestamptz not null,
  source_batch_id uuid not null references market_ingestion.import_batches(id),
  supersedes_appearance_id uuid references market_ingestion.appearances(id) on delete restrict,
  correction_reason text,
  is_current boolean not null default true,
  raw_payload jsonb not null,
  raw_payload_checksum text not null,
  created_at timestamptz not null default now(),
  unique (provider_key, provider_fixture_id, provider_player_id, version),
  unique (provider_key, provider_appearance_id, version),
  check (rating is null or rating between 0 and 10),
  check ((appeared and minutes_played > 0) or (not appeared and minutes_played = 0)),
  check ((supersedes_appearance_id is null and version = 1) or (supersedes_appearance_id is not null and version > 1)),
  check (supersedes_appearance_id is null or correction_reason is not null)
);

-- Durable event grain: only one current provider/fixture/player performance can exist.
create unique index appearances_current_event_uidx
  on market_ingestion.appearances(provider_key, provider_fixture_id, provider_player_id)
  where is_current;
create index appearances_player_fixture_idx
  on market_ingestion.appearances(player_identity_id, fixture_id) where is_current;

create table market_ingestion.quarantined_records (
  id bigint generated always as identity primary key,
  batch_id uuid not null references market_ingestion.import_batches(id) on delete restrict,
  provider_key text not null,
  record_kind text not null check (record_kind in ('player','fixture','appearance','correction')),
  provider_record_id text,
  reason_code text not null,
  reason_detail text not null,
  raw_payload jsonb not null,
  raw_payload_checksum text not null,
  quarantined_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution text,
  resolution_batch_id uuid references market_ingestion.import_batches(id) on delete restrict
);

create table market_ingestion.corrections (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null,
  original_appearance_id uuid not null references market_ingestion.appearances(id) on delete restrict,
  corrected_appearance_id uuid not null references market_ingestion.appearances(id) on delete restrict,
  correction_batch_id uuid not null references market_ingestion.import_batches(id) on delete restrict,
  reason text not null,
  corrected_at timestamptz not null default now(),
  unique (corrected_appearance_id),
  check (original_appearance_id <> corrected_appearance_id)
);

create table market_ingestion.value_updates (
  id uuid primary key default gen_random_uuid(),
  appearance_id uuid not null references market_ingestion.appearances(id) on delete restrict,
  market_player_id bigint not null references public.market_players(id) on delete restrict,
  batch_id uuid not null references market_ingestion.import_batches(id) on delete restrict,
  methodology_version text not null references market_ingestion.methodologies(methodology_version),
  calculation_generation integer not null default 1 check (calculation_generation > 0),
  previous_value bigint not null,
  new_value bigint not null,
  movement bigint generated always as (new_value - previous_value) stored,
  rolling_rating numeric(5,3) not null,
  appearances_used integer not null check (appearances_used between 1 and 5),
  calculation_inputs jsonb not null,
  is_current boolean not null default true,
  supersedes_value_update_id uuid references market_ingestion.value_updates(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (appearance_id, calculation_generation),
  check (previous_value between 4000000 and 15000000),
  check (new_value between 4000000 and 15000000),
  check (new_value % 100000 = 0),
  check (abs(new_value - previous_value) <= 300000)
);

create unique index value_updates_current_appearance_uidx
  on market_ingestion.value_updates(appearance_id) where is_current;
create index value_updates_player_created_idx
  on market_ingestion.value_updates(market_player_id, created_at desc);

create table market_ingestion.revaluation_requests (
  id uuid primary key default gen_random_uuid(),
  market_player_id bigint not null references public.market_players(id) on delete restrict,
  correction_id uuid not null references market_ingestion.corrections(id) on delete restrict,
  rebuild_from timestamptz not null,
  status text not null default 'pending' check (status in ('pending','processing','applied','failed')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  failure_detail text,
  unique (correction_id)
);

-- The ingestion surface is private by default, even on projects retaining legacy grants.
revoke all on all tables in schema market_ingestion from public, anon, authenticated;
revoke all on all sequences in schema market_ingestion from public, anon, authenticated;
grant select, insert, update on all tables in schema market_ingestion to service_role;
grant usage, select on all sequences in schema market_ingestion to service_role;

alter table market_ingestion.providers enable row level security;
alter table market_ingestion.methodologies enable row level security;
alter table market_ingestion.import_batches enable row level security;
alter table market_ingestion.provider_players enable row level security;
alter table market_ingestion.provider_fixtures enable row level security;
alter table market_ingestion.appearances enable row level security;
alter table market_ingestion.quarantined_records enable row level security;
alter table market_ingestion.corrections enable row level security;
alter table market_ingestion.value_updates enable row level security;
alter table market_ingestion.revaluation_requests enable row level security;

-- No anon/authenticated policies are intentional. service_role bypasses RLS only
-- from a trusted server. Ordinary users keep their existing portfolio/trade access.

create or replace function market_ingestion.assert_batch_ready(p_batch_id uuid)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, market_ingestion, public
as $$
declare
  batch_row market_ingestion.import_batches;
begin
  select * into batch_row
  from market_ingestion.import_batches
  where id = p_batch_id
  for update;

  if not found then raise exception 'unknown import batch' using errcode = 'P0002'; end if;
  if batch_row.status = 'applied' then return; end if;
  if batch_row.status <> 'validated' then raise exception 'batch must be fully validated before processing'; end if;
  if exists (select 1 from market_ingestion.quarantined_records q where q.batch_id = p_batch_id and q.resolved_at is null) then
    raise exception 'batch contains unresolved quarantined records';
  end if;
  if exists (
    select 1
    from market_ingestion.appearances a
    join market_ingestion.provider_fixtures f on f.id = a.fixture_id
    join market_ingestion.provider_players pp on pp.id = a.player_identity_id
    where a.source_batch_id = p_batch_id
      and (not a.is_current or a.verification_status <> 'verified' or a.rating is null
        or not a.appeared or a.minutes_played = 0 or f.status <> 'finished'
        or pp.market_player_id is null)
  ) then
    raise exception 'batch contains an ineligible appearance';
  end if;
end;
$$;

revoke all on function market_ingestion.assert_batch_ready(uuid) from public, anon, authenticated;
grant execute on function market_ingestion.assert_batch_ready(uuid) to service_role;

-- Batch processing and correction replay are intentionally separate internal
-- entry points. Their implementation must be verified against a disposable
-- Supabase branch before this migration is approved. The application boundary
-- never calls these functions until the provider and migration are enabled.

commit;

-- Rollback plan (manual, only before any live provider ingestion):
-- drop schema market_ingestion cascade;
