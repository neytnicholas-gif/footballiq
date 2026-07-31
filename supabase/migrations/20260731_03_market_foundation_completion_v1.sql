-- FootballIQ Player Market Foundation Completion V1
-- Repository-only migration. Review and validate in a non-production project before applying remotely.

create table if not exists public.market_catalogues (
  id uuid primary key default gen_random_uuid(),
  season_id text not null references public.market_seasons(id) on delete restrict,
  fingerprint text not null unique check (fingerprint ~ '^[0-9a-f]{64}$'),
  status text not null check (status in ('validated', 'approved', 'active', 'retired')),
  source_type text not null check (source_type in ('approved-provider', 'licensed-local')),
  source_reference text not null check (length(btrim(source_reference)) > 0),
  record_count int not null check (record_count > 0),
  rejected_count int not null default 0 check (rejected_count = 0),
  validated_at timestamptz not null,
  approved_at timestamptz,
  approved_by text,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'validated' and approved_at is null and approved_by is null and activated_at is null)
    or
    (status = 'approved' and approved_at is not null and length(btrim(approved_by)) > 0 and activated_at is null)
    or
    (status = 'active' and approved_at is not null and length(btrim(approved_by)) > 0 and activated_at is not null)
    or
    (status = 'retired')
  )
);

create unique index if not exists market_catalogues_one_active_idx
  on public.market_catalogues ((status)) where status = 'active';
create index if not exists market_catalogues_season_status_idx
  on public.market_catalogues (season_id, status);

alter table public.market_players
  add column if not exists catalogue_id uuid references public.market_catalogues(id) on delete restrict,
  add column if not exists source_type text,
  add column if not exists source_reference text,
  add column if not exists source_verified_at timestamptz;

alter table public.market_settings
  add column if not exists active_catalogue_id uuid references public.market_catalogues(id) on delete restrict;

alter table public.market_holdings
  drop constraint if exists market_holdings_quantity_check;
alter table public.market_holdings
  add constraint market_holdings_quantity_one_check check (quantity = 1);

alter table public.market_daily_limits
  drop constraint if exists market_daily_limits_purchases_count_check,
  drop constraint if exists market_daily_limits_sales_count_check;
alter table public.market_daily_limits
  add constraint market_daily_limits_purchases_count_check check (purchases_count between 0 and 3),
  add constraint market_daily_limits_sales_count_check check (sales_count between 0 and 3);

create index if not exists market_players_catalogue_idx on public.market_players (catalogue_id);
create index if not exists market_players_active_catalogue_idx
  on public.market_players (catalogue_id, is_available, full_name);

create table if not exists public.player_season_stats (
  player_id uuid primary key references public.market_players(id) on delete cascade,
  season_id text not null references public.market_seasons(id) on delete cascade,
  rated_matches int not null default 0 check (rated_matches >= 0),
  appearances int not null default 0 check (appearances >= 0),
  starts int not null default 0 check (starts >= 0),
  minutes_played int not null default 0 check (minutes_played >= 0),
  rating_sum_milli bigint not null default 0,
  average_rating_milli int,
  goals int not null default 0 check (goals >= 0),
  assists int not null default 0 check (assists >= 0),
  clean_sheets int not null default 0 check (clean_sheets >= 0),
  yellow_cards int not null default 0 check (yellow_cards >= 0),
  red_cards int not null default 0 check (red_cards >= 0),
  source_through_at timestamptz,
  updated_at timestamptz not null default now(),
  check (rated_matches <= appearances),
  check (starts <= appearances),
  check (average_rating_milli is null or average_rating_milli between 0 and 10000)
);

create index if not exists player_season_stats_season_rating_idx
  on public.player_season_stats (season_id, average_rating_milli desc nulls last);

create table if not exists public.market_public_leaderboard (
  portfolio_id uuid primary key references public.market_portfolios(id) on delete cascade,
  season_id text not null references public.market_seasons(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) between 1 and 40),
  cash_balance_minor bigint not null check (cash_balance_minor >= 0),
  holdings_value_minor bigint not null check (holdings_value_minor >= 0),
  total_wealth_minor bigint not null check (total_wealth_minor >= 0),
  realised_profit_minor bigint not null,
  unrealised_profit_minor bigint not null,
  total_profit_minor bigint not null,
  weekly_change_minor bigint not null default 0,
  return_basis_points int not null default 0,
  calculated_at timestamptz not null default now(),
  check (total_wealth_minor = cash_balance_minor + holdings_value_minor),
  check (total_profit_minor = realised_profit_minor + unrealised_profit_minor)
);

create index if not exists market_public_leaderboard_wealth_idx
  on public.market_public_leaderboard (season_id, total_wealth_minor desc, portfolio_id);
create index if not exists market_public_leaderboard_weekly_idx
  on public.market_public_leaderboard (season_id, weekly_change_minor desc, portfolio_id);
create index if not exists market_public_leaderboard_return_idx
  on public.market_public_leaderboard (season_id, return_basis_points desc, portfolio_id);

alter table public.market_catalogues enable row level security;
alter table public.player_season_stats enable row level security;
alter table public.market_public_leaderboard enable row level security;

drop policy if exists market_catalogues_public_active_read on public.market_catalogues;
create policy market_catalogues_public_active_read
on public.market_catalogues for select to anon, authenticated
using (status = 'active');

drop policy if exists player_season_stats_public_active_read on public.player_season_stats;
create policy player_season_stats_public_active_read
on public.player_season_stats for select to anon, authenticated
using (
  exists (
    select 1
    from public.market_players player
    join public.market_catalogues catalogue on catalogue.id = player.catalogue_id
    where player.id = player_season_stats.player_id
      and catalogue.status = 'active'
      and player.season_id = catalogue.season_id
  )
);

drop policy if exists market_public_leaderboard_public_read on public.market_public_leaderboard;
create policy market_public_leaderboard_public_read
on public.market_public_leaderboard for select to anon, authenticated
using (
  exists (
    select 1 from public.market_catalogues catalogue
    where catalogue.season_id = market_public_leaderboard.season_id
      and catalogue.status = 'active'
  )
);

revoke all on table public.market_catalogues from anon, authenticated;
revoke all on table public.player_season_stats from anon, authenticated;
revoke all on table public.market_public_leaderboard from anon, authenticated;
grant select on table public.market_catalogues to anon, authenticated;
grant select on table public.player_season_stats to anon, authenticated;
grant select on table public.market_public_leaderboard to anon, authenticated;
grant all on table public.market_catalogues to service_role;
grant all on table public.player_season_stats to service_role;
grant all on table public.market_public_leaderboard to service_role;

-- Existing public reads are constrained to the explicitly active catalogue.
drop policy if exists market_players_public_read on public.market_players;
create policy market_players_public_read
on public.market_players for select to anon, authenticated
using (
  exists (
    select 1 from public.market_catalogues catalogue
    where catalogue.id = market_players.catalogue_id
      and catalogue.status = 'active'
      and catalogue.season_id = market_players.season_id
  )
);

drop policy if exists market_clubs_public_read on public.market_clubs;
create policy market_clubs_public_read
on public.market_clubs for select to anon, authenticated
using (
  exists (
    select 1 from public.market_catalogues catalogue
    where catalogue.season_id = market_clubs.season_id
      and catalogue.status = 'active'
  )
);

drop policy if exists market_seasons_public_read on public.market_seasons;
create policy market_seasons_public_read
on public.market_seasons for select to anon, authenticated
using (
  exists (
    select 1 from public.market_catalogues catalogue
    where catalogue.season_id = market_seasons.id and catalogue.status = 'active'
  )
);

grant select on table public.market_seasons to anon, authenticated;
grant select on table public.market_clubs to anon, authenticated;
grant select on table public.market_players to anon, authenticated;
grant select on table public.market_valuation_events to anon, authenticated;
grant select on table public.market_settings to anon, authenticated;

drop policy if exists market_valuation_events_public_read on public.market_valuation_events;
create policy market_valuation_events_public_read
on public.market_valuation_events for select to anon, authenticated
using (
  exists (
    select 1
    from public.market_players player
    join public.market_catalogues catalogue on catalogue.id = player.catalogue_id
    where player.id = market_valuation_events.player_id and catalogue.status = 'active'
  )
);

-- Replace legacy auth.role()-based service policies with explicit role targets.
drop policy if exists market_entities_service_write on public.market_players;
create policy market_entities_service_write on public.market_players for all to service_role using (true) with check (true);
drop policy if exists market_clubs_service_write on public.market_clubs;
create policy market_clubs_service_write on public.market_clubs for all to service_role using (true) with check (true);
drop policy if exists market_seasons_service_write on public.market_seasons;
create policy market_seasons_service_write on public.market_seasons for all to service_role using (true) with check (true);
drop policy if exists market_settings_service_write on public.market_settings;
create policy market_settings_service_write on public.market_settings for all to service_role using (true) with check (true);
drop policy if exists market_player_match_stats_service_write on public.market_player_match_stats;
create policy market_player_match_stats_service_write on public.market_player_match_stats for all to service_role using (true) with check (true);
drop policy if exists market_valuation_events_service_write on public.market_valuation_events;
create policy market_valuation_events_service_write on public.market_valuation_events for all to service_role using (true) with check (true);
drop policy if exists market_portfolios_service_write on public.market_portfolios;
create policy market_portfolios_service_write on public.market_portfolios for all to service_role using (true) with check (true);
drop policy if exists market_holdings_service_write on public.market_holdings;
create policy market_holdings_service_write on public.market_holdings for all to service_role using (true) with check (true);
drop policy if exists market_transactions_service_write on public.market_transactions;
create policy market_transactions_service_write on public.market_transactions for all to service_role using (true) with check (true);
drop policy if exists market_daily_limits_service_write on public.market_daily_limits;
create policy market_daily_limits_service_write on public.market_daily_limits for all to service_role using (true) with check (true);
drop policy if exists market_processing_runs_service_write on public.market_processing_runs;
create policy market_processing_runs_service_write on public.market_processing_runs for all to service_role using (true) with check (true);
drop policy if exists market_import_logs_service_write on public.market_import_logs;
create policy market_import_logs_service_write on public.market_import_logs for all to service_role using (true) with check (true);

create or replace function public.market_activate_catalogue(p_catalogue_id uuid, p_fingerprint text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  catalogue_row public.market_catalogues;
  actual_count int;
begin
  select * into catalogue_row from public.market_catalogues
  where id = p_catalogue_id for update;

  if not found then raise exception 'CATALOGUE_NOT_FOUND'; end if;
  if catalogue_row.status <> 'approved' then raise exception 'CATALOGUE_NOT_APPROVED'; end if;
  if catalogue_row.fingerprint <> p_fingerprint then raise exception 'CATALOGUE_FINGERPRINT_MISMATCH'; end if;
  if catalogue_row.rejected_count <> 0 then raise exception 'CATALOGUE_HAS_REJECTIONS'; end if;

  select count(*) into actual_count
  from public.market_players player
  where player.catalogue_id = catalogue_row.id
    and player.season_id = catalogue_row.season_id
    and player.source_type in ('approved-provider', 'licensed-local')
    and length(btrim(player.source_reference)) > 0
    and player.source_verified_at is not null;
  if actual_count <> catalogue_row.record_count then raise exception 'CATALOGUE_RECORD_COUNT_MISMATCH'; end if;

  update public.market_catalogues
  set status = 'retired', updated_at = now()
  where status = 'active' and id <> catalogue_row.id;
  update public.market_seasons set is_active = (id = catalogue_row.season_id);
  update public.market_catalogues
  set status = 'active', activated_at = now(), updated_at = now()
  where id = catalogue_row.id;
  update public.market_settings
  set active_season_id = catalogue_row.season_id,
      active_catalogue_id = catalogue_row.id,
      updated_at = now()
  where id = 1;
end;
$$;

revoke all on function public.market_activate_catalogue(uuid, text) from public;
grant execute on function public.market_activate_catalogue(uuid, text) to service_role;

create or replace function public.market_brussels_date(p_at timestamptz default now())
returns date
language sql
immutable
set search_path = public
as $$
  select (p_at at time zone 'Europe/Brussels')::date;
$$;

revoke all on function public.market_brussels_date(timestamptz) from public;
grant execute on function public.market_brussels_date(timestamptz) to authenticated, service_role;

-- Refresh factual season aggregates separately from FootballIQ valuation events.
create or replace function public.market_refresh_player_season_stats(p_season_id text)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.player_season_stats (
    player_id, season_id, rated_matches, appearances, starts, minutes_played,
    rating_sum_milli, average_rating_milli, goals, assists, clean_sheets,
    yellow_cards, red_cards, source_through_at, updated_at
  )
  select
    player.id,
    player.season_id,
    count(stat.provider_rating_milli)::int,
    count(*) filter (where stat.minutes_played > 0)::int,
    count(*) filter (where stat.started)::int,
    coalesce(sum(stat.minutes_played), 0)::int,
    coalesce(sum(stat.provider_rating_milli), 0)::bigint,
    round(avg(stat.provider_rating_milli))::int,
    coalesce(sum(stat.goals), 0)::int,
    coalesce(sum(stat.assists), 0)::int,
    count(*) filter (where stat.clean_sheet)::int,
    coalesce(sum(stat.yellow_cards), 0)::int,
    coalesce(sum(stat.red_cards), 0)::int,
    max(stat.provider_updated_at),
    now()
  from public.market_players player
  left join public.market_player_match_stats stat on stat.player_id = player.id
  where player.season_id = p_season_id
  group by player.id, player.season_id
  on conflict (player_id) do update set
    season_id = excluded.season_id,
    rated_matches = excluded.rated_matches,
    appearances = excluded.appearances,
    starts = excluded.starts,
    minutes_played = excluded.minutes_played,
    rating_sum_milli = excluded.rating_sum_milli,
    average_rating_milli = excluded.average_rating_milli,
    goals = excluded.goals,
    assists = excluded.assists,
    clean_sheets = excluded.clean_sheets,
    yellow_cards = excluded.yellow_cards,
    red_cards = excluded.red_cards,
    source_through_at = excluded.source_through_at,
    updated_at = excluded.updated_at;
$$;

revoke all on function public.market_refresh_player_season_stats(text) from public;
grant execute on function public.market_refresh_player_season_stats(text) to service_role;

-- The public leaderboard is a deliberately de-identified projection. A service
-- process supplies a reviewed display name; private user IDs and transactions
-- never become public through this table.
create or replace function public.market_upsert_public_leaderboard_row(
  p_portfolio_id uuid,
  p_display_name text,
  p_weekly_change_minor bigint
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  portfolio_row public.market_portfolios;
begin
  select * into portfolio_row
  from public.market_portfolios
  where id = p_portfolio_id;

  if not found then raise exception 'PORTFOLIO_NOT_FOUND'; end if;
  if length(btrim(p_display_name)) not between 1 and 40 then raise exception 'INVALID_DISPLAY_NAME'; end if;

  insert into public.market_public_leaderboard (
    portfolio_id, season_id, display_name, cash_balance_minor,
    holdings_value_minor, total_wealth_minor, realised_profit_minor,
    unrealised_profit_minor, total_profit_minor, weekly_change_minor,
    return_basis_points, calculated_at
  ) values (
    portfolio_row.id,
    portfolio_row.season_id,
    btrim(p_display_name),
    portfolio_row.cash_balance_minor,
    portfolio_row.current_holdings_value_minor,
    portfolio_row.total_portfolio_value_minor,
    portfolio_row.realised_profit_minor,
    portfolio_row.unrealised_profit_minor,
    portfolio_row.realised_profit_minor + portfolio_row.unrealised_profit_minor,
    p_weekly_change_minor,
    case when portfolio_row.starting_balance_minor = 0 then 0 else
      round(((portfolio_row.total_portfolio_value_minor - portfolio_row.starting_balance_minor)::numeric
        / portfolio_row.starting_balance_minor::numeric) * 10000)::int end,
    now()
  )
  on conflict (portfolio_id) do update set
    season_id = excluded.season_id,
    display_name = excluded.display_name,
    cash_balance_minor = excluded.cash_balance_minor,
    holdings_value_minor = excluded.holdings_value_minor,
    total_wealth_minor = excluded.total_wealth_minor,
    realised_profit_minor = excluded.realised_profit_minor,
    unrealised_profit_minor = excluded.unrealised_profit_minor,
    total_profit_minor = excluded.total_profit_minor,
    weekly_change_minor = excluded.weekly_change_minor,
    return_basis_points = excluded.return_basis_points,
    calculated_at = excluded.calculated_at;
end;
$$;

revoke all on function public.market_upsert_public_leaderboard_row(uuid, text, bigint) from public;
grant execute on function public.market_upsert_public_leaderboard_row(uuid, text, bigint) to service_role;

-- The V1 economy is one ownership position per player. Quantity is always one;
-- buying an already-held player is rejected rather than counted as another buy.
-- New buy calls must provide the last price shown to the user.
drop function if exists public.market_buy_player(uuid, text);
create or replace function public.market_buy_player(
  p_player_id uuid,
  p_idempotency_key text,
  p_expected_price_minor int
)
returns public.market_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  today_brussels date := public.market_brussels_date(now());
  settings_row public.market_settings;
  catalogue_row public.market_catalogues;
  portfolio_row public.market_portfolios;
  player_row public.market_players;
  daily_row public.market_daily_limits;
  tx_row public.market_transactions;
begin
  if current_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(btrim(coalesce(p_idempotency_key, ''))) = 0 then raise exception 'IDEMPOTENCY_KEY_REQUIRED'; end if;

  select * into settings_row from public.market_settings where id = 1 for share;
  select * into catalogue_row from public.market_catalogues
    where id = settings_row.active_catalogue_id and status = 'active' for share;
  if not found or settings_row.active_season_id is distinct from catalogue_row.season_id then
    raise exception 'ACTIVE_CATALOGUE_REQUIRED';
  end if;

  select * into player_row from public.market_players
    where id = p_player_id
      and season_id = catalogue_row.season_id
      and catalogue_id = catalogue_row.id
    for update;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
  if not player_row.is_available then raise exception 'PLAYER_UNAVAILABLE'; end if;
  if p_expected_price_minor is distinct from player_row.current_price_minor then raise exception 'STALE_PRICE'; end if;

  select tx.* into tx_row
  from public.market_transactions tx
  join public.market_portfolios portfolio on portfolio.id = tx.portfolio_id
  where tx.idempotency_key = p_idempotency_key;
  if found then
    if tx_row.player_id <> p_player_id or tx_row.transaction_type <> 'buy' or
       not exists (select 1 from public.market_portfolios p where p.id = tx_row.portfolio_id and p.user_id = current_user_id)
    then raise exception 'IDEMPOTENCY_KEY_CONFLICT'; end if;
    return tx_row;
  end if;

  select * into portfolio_row from public.market_portfolios
    where user_id = current_user_id and season_id = catalogue_row.season_id for update;
  if not found then
    insert into public.market_portfolios (
      user_id, season_id, starting_balance_minor, cash_balance_minor, total_portfolio_value_minor
    ) values (
      current_user_id, catalogue_row.season_id, settings_row.starting_balance_minor,
      settings_row.starting_balance_minor, settings_row.starting_balance_minor
    ) returning * into portfolio_row;
  end if;

  if exists (select 1 from public.market_holdings where portfolio_id = portfolio_row.id and player_id = p_player_id)
    then raise exception 'ALREADY_OWNED'; end if;
  if (select count(*) from public.market_holdings where portfolio_id = portfolio_row.id) >= 5
    then raise exception 'MAX_HOLDINGS'; end if;
  if portfolio_row.cash_balance_minor < player_row.current_price_minor then raise exception 'INSUFFICIENT_BALANCE'; end if;

  insert into public.market_daily_limits (portfolio_id, activity_date)
  values (portfolio_row.id, today_brussels) on conflict (portfolio_id, activity_date) do nothing;
  select * into daily_row from public.market_daily_limits
    where portfolio_id = portfolio_row.id and activity_date = today_brussels for update;
  if daily_row.purchases_count >= 3 then raise exception 'DAILY_PURCHASE_LIMIT'; end if;

  insert into public.market_holdings (
    portfolio_id, player_id, quantity, purchase_price_minor, current_value_minor, unrealised_profit_minor
  ) values (portfolio_row.id, player_row.id, 1, player_row.current_price_minor, player_row.current_price_minor, 0);

  update public.market_portfolios set cash_balance_minor = cash_balance_minor - player_row.current_price_minor
    where id = portfolio_row.id and cash_balance_minor >= player_row.current_price_minor;
  if not found then raise exception 'INSUFFICIENT_BALANCE'; end if;
  update public.market_daily_limits set purchases_count = purchases_count + 1 where id = daily_row.id;

  insert into public.market_transactions (
    portfolio_id, player_id, transaction_type, executed_price_minor,
    balance_before_minor, balance_after_minor, holding_value_before_minor,
    holding_value_after_minor, idempotency_key
  ) values (
    portfolio_row.id, player_row.id, 'buy', player_row.current_price_minor,
    portfolio_row.cash_balance_minor, portfolio_row.cash_balance_minor - player_row.current_price_minor,
    0, player_row.current_price_minor, p_idempotency_key
  ) returning * into tx_row;

  perform public.market_recalculate_portfolio_totals(portfolio_row.id);
  return tx_row;
end;
$$;

revoke all on function public.market_buy_player(uuid, text, int) from public;
grant execute on function public.market_buy_player(uuid, text, int) to authenticated;

create or replace function public.market_sell_player(p_player_id uuid, p_idempotency_key text)
returns public.market_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  today_brussels date := public.market_brussels_date(now());
  settings_row public.market_settings;
  catalogue_row public.market_catalogues;
  portfolio_row public.market_portfolios;
  player_row public.market_players;
  holding_row public.market_holdings;
  daily_row public.market_daily_limits;
  tx_row public.market_transactions;
  proceeds int;
begin
  if current_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(btrim(coalesce(p_idempotency_key, ''))) = 0 then raise exception 'IDEMPOTENCY_KEY_REQUIRED'; end if;

  select * into settings_row from public.market_settings where id = 1 for share;
  select * into catalogue_row from public.market_catalogues
    where id = settings_row.active_catalogue_id and status = 'active' for share;
  if not found or settings_row.active_season_id is distinct from catalogue_row.season_id then
    raise exception 'ACTIVE_CATALOGUE_REQUIRED';
  end if;

  select tx.* into tx_row
  from public.market_transactions tx
  where tx.idempotency_key = p_idempotency_key;
  if found then
    if tx_row.player_id <> p_player_id or tx_row.transaction_type <> 'sell' or
       not exists (select 1 from public.market_portfolios p where p.id = tx_row.portfolio_id and p.user_id = current_user_id)
    then raise exception 'IDEMPOTENCY_KEY_CONFLICT'; end if;
    return tx_row;
  end if;

  select * into portfolio_row from public.market_portfolios
    where user_id = current_user_id and season_id = catalogue_row.season_id for update;
  if not found then raise exception 'PORTFOLIO_NOT_FOUND'; end if;
  select * into player_row from public.market_players
    where id = p_player_id and season_id = catalogue_row.season_id for update;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
  select * into holding_row from public.market_holdings
    where portfolio_id = portfolio_row.id and player_id = p_player_id for update;
  if not found then raise exception 'NOT_OWNED'; end if;

  insert into public.market_daily_limits (portfolio_id, activity_date)
  values (portfolio_row.id, today_brussels) on conflict (portfolio_id, activity_date) do nothing;
  select * into daily_row from public.market_daily_limits
    where portfolio_id = portfolio_row.id and activity_date = today_brussels for update;
  if daily_row.sales_count >= 3 then raise exception 'DAILY_SALE_LIMIT'; end if;

  proceeds := player_row.current_price_minor;
  delete from public.market_holdings where id = holding_row.id;
  update public.market_portfolios set
    cash_balance_minor = cash_balance_minor + proceeds,
    realised_profit_minor = realised_profit_minor + (player_row.current_price_minor - holding_row.purchase_price_minor)
    where id = portfolio_row.id;
  update public.market_daily_limits set sales_count = sales_count + 1 where id = daily_row.id;

  insert into public.market_transactions (
    portfolio_id, player_id, transaction_type, executed_price_minor,
    balance_before_minor, balance_after_minor, holding_value_before_minor,
    holding_value_after_minor, idempotency_key
  ) values (
    portfolio_row.id, player_row.id, 'sell', player_row.current_price_minor,
    portfolio_row.cash_balance_minor, portfolio_row.cash_balance_minor + proceeds,
    holding_row.current_value_minor, 0, p_idempotency_key
  ) returning * into tx_row;

  perform public.market_recalculate_portfolio_totals(portfolio_row.id);
  return tx_row;
end;
$$;

revoke all on function public.market_sell_player(uuid, text) from public;
grant execute on function public.market_sell_player(uuid, text) to authenticated;

create or replace function public.market_get_portfolio_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  settings_row public.market_settings;
  portfolio_row public.market_portfolios;
  daily_row public.market_daily_limits;
  snapshot jsonb;
begin
  if current_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into settings_row from public.market_settings where id = 1;
  if settings_row.active_catalogue_id is null or settings_row.active_season_id is null then
    raise exception 'ACTIVE_CATALOGUE_REQUIRED';
  end if;
  select * into portfolio_row from public.market_portfolios
  where user_id = current_user_id and season_id = settings_row.active_season_id;
  if not found then return null; end if;

  select * into daily_row from public.market_daily_limits
  where portfolio_id = portfolio_row.id and activity_date = public.market_brussels_date(now());

  select jsonb_build_object(
    'portfolio', jsonb_build_object(
      'id', portfolio_row.id, 'userId', portfolio_row.user_id, 'seasonId', portfolio_row.season_id,
      'startingBalanceMinor', portfolio_row.starting_balance_minor,
      'cashBalanceMinor', portfolio_row.cash_balance_minor,
      'currentHoldingsValueMinor', portfolio_row.current_holdings_value_minor,
      'totalPortfolioValueMinor', portfolio_row.total_portfolio_value_minor,
      'realisedProfitMinor', portfolio_row.realised_profit_minor,
      'unrealisedProfitMinor', portfolio_row.unrealised_profit_minor,
      'createdAt', portfolio_row.created_at, 'updatedAt', portfolio_row.updated_at
    ),
    'holdings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', holding.id, 'portfolioId', holding.portfolio_id, 'playerId', holding.player_id,
        'quantity', holding.quantity, 'purchasePriceMinor', holding.purchase_price_minor,
        'currentValueMinor', holding.current_value_minor,
        'unrealisedProfitMinor', holding.unrealised_profit_minor,
        'purchasedAt', holding.purchased_at, 'updatedAt', holding.updated_at,
        'player', jsonb_build_object(
          'id', player.id, 'seasonId', player.season_id, 'clubId', player.club_id,
          'providerPlayerId', player.provider_player_id, 'fullName', player.full_name,
          'displayName', player.display_name, 'slug', player.slug,
          'positionGroup', player.position_group, 'detailedPosition', coalesce(player.detailed_position, player.position_group),
          'nationality', player.nationality, 'shirtNumber', player.shirt_number,
          'currentPriceMinor', player.current_price_minor, 'initialPriceMinor', player.initial_price_minor,
          'performanceBankMilli', player.performance_bank_milli, 'latestRatingMilli', player.latest_rating_milli,
          'isAvailable', player.is_available, 'availabilityStatus', player.availability_status,
          'dataUpdatedAt', player.data_updated_at, 'isDemoSeed', false
        ),
        'club', jsonb_build_object(
          'id', club.id, 'seasonId', club.season_id, 'providerClubId', club.provider_club_id,
          'name', club.name, 'shortName', club.short_name, 'slug', club.slug,
          'primaryColour', club.primary_colour, 'secondaryColour', club.secondary_colour,
          'isActive', club.is_active, 'dataUpdatedAt', club.data_updated_at
        )
      ) order by holding.purchased_at)
      from public.market_holdings holding
      join public.market_players player on player.id = holding.player_id
      join public.market_clubs club on club.id = player.club_id
      where holding.portfolio_id = portfolio_row.id
    ), '[]'::jsonb),
    'transactions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', tx.id, 'portfolioId', tx.portfolio_id, 'playerId', tx.player_id,
        'transactionType', tx.transaction_type, 'executedPriceMinor', tx.executed_price_minor,
        'balanceBeforeMinor', tx.balance_before_minor, 'balanceAfterMinor', tx.balance_after_minor,
        'holdingValueBeforeMinor', tx.holding_value_before_minor,
        'holdingValueAfterMinor', tx.holding_value_after_minor,
        'idempotencyKey', tx.idempotency_key, 'createdAt', tx.created_at,
        'player', jsonb_build_object(
          'id', player.id, 'seasonId', player.season_id, 'clubId', player.club_id,
          'providerPlayerId', player.provider_player_id, 'fullName', player.full_name,
          'displayName', player.display_name, 'slug', player.slug,
          'positionGroup', player.position_group, 'detailedPosition', coalesce(player.detailed_position, player.position_group),
          'currentPriceMinor', player.current_price_minor, 'initialPriceMinor', player.initial_price_minor,
          'performanceBankMilli', player.performance_bank_milli, 'isAvailable', player.is_available,
          'availabilityStatus', player.availability_status, 'dataUpdatedAt', player.data_updated_at,
          'isDemoSeed', false
        )
      ) order by tx.created_at desc)
      from public.market_transactions tx
      join public.market_players player on player.id = tx.player_id
      where tx.portfolio_id = portfolio_row.id
    ), '[]'::jsonb),
    'dailyLimit', jsonb_build_object(
      'id', coalesce(daily_row.id::text, portfolio_row.id::text || ':' || public.market_brussels_date(now())::text),
      'portfolioId', portfolio_row.id, 'activityDate', public.market_brussels_date(now()),
      'purchasesCount', coalesce(daily_row.purchases_count, 0), 'salesCount', coalesce(daily_row.sales_count, 0),
      'createdAt', coalesce(daily_row.created_at, now()), 'updatedAt', coalesce(daily_row.updated_at, now())
    ),
    'purchasesRemaining', greatest(0, 3 - coalesce(daily_row.purchases_count, 0)),
    'salesRemaining', greatest(0, 3 - coalesce(daily_row.sales_count, 0)),
    'weeklyChangeMinor', coalesce((
      select sum(event.price_change_minor)
      from public.market_valuation_events event
      join public.market_holdings holding on holding.player_id = event.player_id
      where holding.portfolio_id = portfolio_row.id
        and event.effective_at >= date_trunc('week', now() at time zone 'Europe/Brussels') at time zone 'Europe/Brussels'
    ), 0),
    'allTimeProfitMinor', portfolio_row.realised_profit_minor + portfolio_row.unrealised_profit_minor
  ) into snapshot;
  return snapshot;
end;
$$;

revoke all on function public.market_get_portfolio_snapshot() from public;
grant execute on function public.market_get_portfolio_snapshot() to authenticated;

drop trigger if exists trg_market_catalogues_updated_at on public.market_catalogues;
create trigger trg_market_catalogues_updated_at before update on public.market_catalogues
for each row execute procedure public.set_updated_at();
