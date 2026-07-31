-- FootballIQ Player Market Foundation
-- Prepared for review only. Do NOT auto-apply in production without staged validation.

create extension if not exists pgcrypto;

create table if not exists public.market_seasons (
  id text primary key,
  name text not null,
  competition_key text not null,
  season_key text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default false,
  data_updated_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists market_seasons_competition_season_idx
  on public.market_seasons (competition_key, season_key);

create table if not exists public.market_clubs (
  id uuid primary key default gen_random_uuid(),
  season_id text not null references public.market_seasons(id) on delete cascade,
  provider_club_id text not null,
  name text not null,
  short_name text not null,
  slug text not null,
  primary_colour text not null,
  secondary_colour text not null,
  is_active boolean not null default true,
  data_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, provider_club_id),
  unique (season_id, slug)
);

create index if not exists market_clubs_season_idx on public.market_clubs (season_id);

create table if not exists public.market_players (
  id uuid primary key default gen_random_uuid(),
  season_id text not null references public.market_seasons(id) on delete cascade,
  club_id uuid references public.market_clubs(id) on delete set null,
  provider_player_id text not null,
  full_name text not null,
  display_name text not null,
  slug text not null,
  position_group text not null check (position_group in ('GK', 'DEF', 'MID', 'FWD')),
  detailed_position text,
  nationality text,
  date_of_birth date,
  shirt_number int,
  initial_price_minor int not null check (initial_price_minor >= 0),
  current_price_minor int not null check (current_price_minor >= 0),
  performance_bank_milli int not null default 0,
  latest_rating_milli int,
  is_available boolean not null default true,
  availability_status text not null default 'available',
  data_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, provider_player_id),
  unique (season_id, slug)
);

create index if not exists market_players_season_idx on public.market_players (season_id);
create index if not exists market_players_club_idx on public.market_players (club_id);
create index if not exists market_players_current_price_idx on public.market_players (current_price_minor);

create table if not exists public.market_player_match_stats (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.market_players(id) on delete cascade,
  provider_fixture_id text not null,
  fixture_date timestamptz not null,
  opponent_club_id uuid references public.market_clubs(id) on delete set null,
  home_or_away text check (home_or_away in ('home', 'away')),
  started boolean not null default false,
  minutes_played int not null default 0,
  provider_rating_milli int,
  goals int not null default 0,
  assists int not null default 0,
  shots int not null default 0,
  shots_on_target int not null default 0,
  key_passes int not null default 0,
  passes int not null default 0,
  pass_accuracy numeric(5,2),
  tackles int not null default 0,
  interceptions int not null default 0,
  clearances int not null default 0,
  blocks int not null default 0,
  saves int not null default 0,
  goals_conceded int not null default 0,
  clean_sheet boolean not null default false,
  yellow_cards int not null default 0,
  red_cards int not null default 0,
  penalties_scored int not null default 0,
  penalties_missed int not null default 0,
  own_goals int not null default 0,
  raw_provider_payload jsonb,
  provider_updated_at timestamptz,
  imported_at timestamptz not null default now(),
  valuation_processed_at timestamptz,
  unique (player_id, provider_fixture_id)
);

create index if not exists market_player_match_stats_player_date_idx
  on public.market_player_match_stats (player_id, fixture_date desc);
create index if not exists market_player_match_stats_pending_idx
  on public.market_player_match_stats (valuation_processed_at)
  where valuation_processed_at is null;

create table if not exists public.market_valuation_events (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.market_players(id) on delete cascade,
  match_stat_id uuid references public.market_player_match_stats(id) on delete set null,
  event_type text not null,
  previous_price_minor int not null,
  new_price_minor int not null,
  previous_bank_milli int not null,
  rating_milli int,
  baseline_rating_milli int not null,
  rating_delta_milli int not null,
  bank_after_event_milli int not null,
  price_change_minor int not null,
  reason text,
  calculation_version text not null,
  effective_at timestamptz not null,
  created_at timestamptz not null default now(),
  idempotency_key text not null unique
);

create index if not exists market_valuation_events_player_effective_idx
  on public.market_valuation_events (player_id, effective_at desc);

create table if not exists public.market_portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  season_id text not null references public.market_seasons(id) on delete cascade,
  starting_balance_minor int not null check (starting_balance_minor >= 0),
  cash_balance_minor int not null check (cash_balance_minor >= 0),
  current_holdings_value_minor int not null default 0,
  total_portfolio_value_minor int not null default 0,
  realised_profit_minor int not null default 0,
  unrealised_profit_minor int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, season_id)
);

create index if not exists market_portfolios_user_idx on public.market_portfolios (user_id);
create index if not exists market_portfolios_value_idx on public.market_portfolios (total_portfolio_value_minor desc);

create table if not exists public.market_holdings (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.market_portfolios(id) on delete cascade,
  player_id uuid not null references public.market_players(id) on delete cascade,
  quantity int not null default 1 check (quantity > 0),
  purchase_price_minor int not null check (purchase_price_minor >= 0),
  current_value_minor int not null default 0,
  unrealised_profit_minor int not null default 0,
  purchased_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (portfolio_id, player_id)
);

create index if not exists market_holdings_portfolio_idx on public.market_holdings (portfolio_id);
create index if not exists market_holdings_player_idx on public.market_holdings (player_id);

create table if not exists public.market_transactions (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.market_portfolios(id) on delete cascade,
  player_id uuid not null references public.market_players(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('buy', 'sell')),
  executed_price_minor int not null check (executed_price_minor >= 0),
  balance_before_minor int not null,
  balance_after_minor int not null,
  holding_value_before_minor int not null,
  holding_value_after_minor int not null,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  check (balance_after_minor >= 0)
);

create index if not exists market_transactions_portfolio_date_idx
  on public.market_transactions (portfolio_id, created_at desc);

create table if not exists public.market_daily_limits (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.market_portfolios(id) on delete cascade,
  activity_date date not null,
  purchases_count int not null default 0,
  sales_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (portfolio_id, activity_date)
);

create table if not exists public.market_settings (
  id int primary key default 1,
  active_season_id text references public.market_seasons(id),
  starting_balance_minor int not null default 1200,
  maximum_holdings int not null default 5,
  maximum_daily_purchases int not null default 3,
  maximum_daily_sales int not null default 3,
  universal_baseline_rating_milli int not null default 7000,
  minimum_minutes int not null default 25,
  substitute_minimum_minutes int not null default 20,
  price_step_minor int not null default 1,
  minimum_price_minor int not null default 10,
  maximum_weekly_price_change_minor int not null default 8,
  valuation_calculation_version text not null default 'v1.0.0',
  weekly_update_day int not null default 1,
  updated_at timestamptz not null default now(),
  check (id = 1)
);

insert into public.market_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.market_processing_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null unique,
  run_type text not null,
  status text not null,
  dry_run boolean not null default true,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  report jsonb,
  error_message text
);

create index if not exists market_processing_runs_status_idx
  on public.market_processing_runs (status, started_at desc);

create table if not exists public.market_import_logs (
  id uuid primary key default gen_random_uuid(),
  source_provider text not null,
  operation text not null,
  season_key text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  dry_run boolean not null default true,
  imported_count int not null default 0,
  skipped_count int not null default 0,
  error_count int not null default 0,
  notes jsonb,
  status text not null default 'started'
);

-- Timestamp auto-update helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Attach update triggers where mutable rows are expected.
drop trigger if exists trg_market_clubs_updated_at on public.market_clubs;
create trigger trg_market_clubs_updated_at
before update on public.market_clubs
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_market_players_updated_at on public.market_players;
create trigger trg_market_players_updated_at
before update on public.market_players
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_market_portfolios_updated_at on public.market_portfolios;
create trigger trg_market_portfolios_updated_at
before update on public.market_portfolios
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_market_holdings_updated_at on public.market_holdings;
create trigger trg_market_holdings_updated_at
before update on public.market_holdings
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_market_daily_limits_updated_at on public.market_daily_limits;
create trigger trg_market_daily_limits_updated_at
before update on public.market_daily_limits
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_market_settings_updated_at on public.market_settings;
create trigger trg_market_settings_updated_at
before update on public.market_settings
for each row execute procedure public.set_updated_at();
