-- FootballIQ Player Market security and transaction functions
-- Prepared for review only. Do NOT auto-apply in production without staged validation.

alter table public.market_seasons enable row level security;
alter table public.market_clubs enable row level security;
alter table public.market_players enable row level security;
alter table public.market_player_match_stats enable row level security;
alter table public.market_valuation_events enable row level security;
alter table public.market_portfolios enable row level security;
alter table public.market_holdings enable row level security;
alter table public.market_transactions enable row level security;
alter table public.market_daily_limits enable row level security;
alter table public.market_settings enable row level security;
alter table public.market_processing_runs enable row level security;
alter table public.market_import_logs enable row level security;

-- Public read market entities
drop policy if exists market_seasons_public_read on public.market_seasons;
create policy market_seasons_public_read
on public.market_seasons for select
using (true);

drop policy if exists market_clubs_public_read on public.market_clubs;
create policy market_clubs_public_read
on public.market_clubs for select
using (true);

drop policy if exists market_players_public_read on public.market_players;
create policy market_players_public_read
on public.market_players for select
using (true);

drop policy if exists market_settings_public_read on public.market_settings;
create policy market_settings_public_read
on public.market_settings for select
using (true);

drop policy if exists market_valuation_events_public_read on public.market_valuation_events;
create policy market_valuation_events_public_read
on public.market_valuation_events for select
using (true);

-- User-owned portfolio reads
drop policy if exists market_portfolios_owner_read on public.market_portfolios;
create policy market_portfolios_owner_read
on public.market_portfolios for select
using (auth.uid() = user_id);

drop policy if exists market_holdings_owner_read on public.market_holdings;
create policy market_holdings_owner_read
on public.market_holdings for select
using (
  exists (
    select 1
    from public.market_portfolios p
    where p.id = market_holdings.portfolio_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists market_transactions_owner_read on public.market_transactions;
create policy market_transactions_owner_read
on public.market_transactions for select
using (
  exists (
    select 1
    from public.market_portfolios p
    where p.id = market_transactions.portfolio_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists market_daily_limits_owner_read on public.market_daily_limits;
create policy market_daily_limits_owner_read
on public.market_daily_limits for select
using (
  exists (
    select 1
    from public.market_portfolios p
    where p.id = market_daily_limits.portfolio_id
      and p.user_id = auth.uid()
  )
);

-- Restrict direct writes to service role only.
drop policy if exists market_portfolios_service_write on public.market_portfolios;
create policy market_portfolios_service_write
on public.market_portfolios
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists market_holdings_service_write on public.market_holdings;
create policy market_holdings_service_write
on public.market_holdings
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists market_transactions_service_write on public.market_transactions;
create policy market_transactions_service_write
on public.market_transactions
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists market_daily_limits_service_write on public.market_daily_limits;
create policy market_daily_limits_service_write
on public.market_daily_limits
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists market_player_match_stats_service_write on public.market_player_match_stats;
create policy market_player_match_stats_service_write
on public.market_player_match_stats
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists market_valuation_events_service_write on public.market_valuation_events;
create policy market_valuation_events_service_write
on public.market_valuation_events
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists market_entities_service_write on public.market_players;
create policy market_entities_service_write
on public.market_players
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists market_clubs_service_write on public.market_clubs;
create policy market_clubs_service_write
on public.market_clubs
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists market_seasons_service_write on public.market_seasons;
create policy market_seasons_service_write
on public.market_seasons
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists market_settings_service_write on public.market_settings;
create policy market_settings_service_write
on public.market_settings
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists market_processing_runs_service_write on public.market_processing_runs;
create policy market_processing_runs_service_write
on public.market_processing_runs
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists market_import_logs_service_write on public.market_import_logs;
create policy market_import_logs_service_write
on public.market_import_logs
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- Helper: get or create active portfolio for auth user.
create or replace function public.market_create_or_get_portfolio()
returns public.market_portfolios
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  settings_row public.market_settings;
  existing_portfolio public.market_portfolios;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into settings_row from public.market_settings where id = 1;
  if settings_row.active_season_id is null then
    raise exception 'ACTIVE_SEASON_NOT_SET';
  end if;

  select * into existing_portfolio
  from public.market_portfolios
  where user_id = current_user_id
    and season_id = settings_row.active_season_id;

  if found then
    return existing_portfolio;
  end if;

  insert into public.market_portfolios (
    user_id,
    season_id,
    starting_balance_minor,
    cash_balance_minor,
    current_holdings_value_minor,
    total_portfolio_value_minor,
    realised_profit_minor,
    unrealised_profit_minor
  ) values (
    current_user_id,
    settings_row.active_season_id,
    settings_row.starting_balance_minor,
    settings_row.starting_balance_minor,
    0,
    settings_row.starting_balance_minor,
    0,
    0
  )
  returning * into existing_portfolio;

  return existing_portfolio;
end;
$$;

revoke all on function public.market_create_or_get_portfolio() from public;
grant execute on function public.market_create_or_get_portfolio() to authenticated;

create or replace function public.market_recalculate_portfolio_totals(p_portfolio_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total_holdings int := 0;
  total_unrealised int := 0;
  cash_balance int := 0;
begin
  select coalesce(sum(h.current_value_minor), 0), coalesce(sum(h.unrealised_profit_minor), 0)
  into total_holdings, total_unrealised
  from public.market_holdings h
  where h.portfolio_id = p_portfolio_id;

  select p.cash_balance_minor into cash_balance
  from public.market_portfolios p
  where p.id = p_portfolio_id
  for update;

  update public.market_portfolios
  set
    current_holdings_value_minor = total_holdings,
    unrealised_profit_minor = total_unrealised,
    total_portfolio_value_minor = cash_balance + total_holdings
  where id = p_portfolio_id;
end;
$$;

revoke all on function public.market_recalculate_portfolio_totals(uuid) from public;
grant execute on function public.market_recalculate_portfolio_totals(uuid) to service_role;

create or replace function public.market_buy_player(
  p_player_id uuid,
  p_idempotency_key text
)
returns public.market_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  now_date date := (now() at time zone 'utc')::date;
  settings_row public.market_settings;
  portfolio_row public.market_portfolios;
  player_row public.market_players;
  tx_row public.market_transactions;
  daily_row public.market_daily_limits;
  holdings_count int;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into tx_row
  from public.market_transactions
  where idempotency_key = p_idempotency_key;
  if found then
    return tx_row;
  end if;

  select * into settings_row from public.market_settings where id = 1;
  if settings_row.active_season_id is null then
    raise exception 'ACTIVE_SEASON_NOT_SET';
  end if;

  select * into portfolio_row
  from public.market_portfolios
  where user_id = current_user_id
    and season_id = settings_row.active_season_id
  for update;

  if not found then
    portfolio_row := public.market_create_or_get_portfolio();
    select * into portfolio_row
    from public.market_portfolios
    where id = portfolio_row.id
    for update;
  end if;

  select * into player_row
  from public.market_players
  where id = p_player_id
    and season_id = settings_row.active_season_id
  for update;

  if not found then
    raise exception 'PLAYER_NOT_FOUND';
  end if;

  if not player_row.is_available then
    raise exception 'PLAYER_UNAVAILABLE';
  end if;

  if exists (
    select 1
    from public.market_holdings h
    where h.portfolio_id = portfolio_row.id
      and h.player_id = player_row.id
  ) then
    raise exception 'ALREADY_OWNED';
  end if;

  select count(*) into holdings_count
  from public.market_holdings h
  where h.portfolio_id = portfolio_row.id;

  if holdings_count >= settings_row.maximum_holdings then
    raise exception 'MAX_HOLDINGS';
  end if;

  insert into public.market_daily_limits (portfolio_id, activity_date)
  values (portfolio_row.id, now_date)
  on conflict (portfolio_id, activity_date) do nothing;

  select * into daily_row
  from public.market_daily_limits
  where portfolio_id = portfolio_row.id
    and activity_date = now_date
  for update;

  if daily_row.purchases_count >= settings_row.maximum_daily_purchases then
    raise exception 'DAILY_PURCHASE_LIMIT';
  end if;

  if portfolio_row.cash_balance_minor < player_row.current_price_minor then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  insert into public.market_holdings (
    portfolio_id,
    player_id,
    quantity,
    purchase_price_minor,
    current_value_minor,
    unrealised_profit_minor
  ) values (
    portfolio_row.id,
    player_row.id,
    1,
    player_row.current_price_minor,
    player_row.current_price_minor,
    0
  );

  update public.market_portfolios
  set cash_balance_minor = cash_balance_minor - player_row.current_price_minor
  where id = portfolio_row.id
    and cash_balance_minor - player_row.current_price_minor >= 0;

  if not found then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  update public.market_daily_limits
  set purchases_count = purchases_count + 1
  where id = daily_row.id;

  insert into public.market_transactions (
    portfolio_id,
    player_id,
    transaction_type,
    executed_price_minor,
    balance_before_minor,
    balance_after_minor,
    holding_value_before_minor,
    holding_value_after_minor,
    idempotency_key
  )
  values (
    portfolio_row.id,
    player_row.id,
    'buy',
    player_row.current_price_minor,
    portfolio_row.cash_balance_minor,
    portfolio_row.cash_balance_minor - player_row.current_price_minor,
    0,
    player_row.current_price_minor,
    p_idempotency_key
  )
  returning * into tx_row;

  perform public.market_recalculate_portfolio_totals(portfolio_row.id);

  return tx_row;
end;
$$;

revoke all on function public.market_buy_player(uuid, text) from public;
grant execute on function public.market_buy_player(uuid, text) to authenticated;

create or replace function public.market_sell_player(
  p_player_id uuid,
  p_idempotency_key text
)
returns public.market_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  now_date date := (now() at time zone 'utc')::date;
  settings_row public.market_settings;
  portfolio_row public.market_portfolios;
  player_row public.market_players;
  holding_row public.market_holdings;
  tx_row public.market_transactions;
  daily_row public.market_daily_limits;
  proceeds int;
  realised int;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into tx_row
  from public.market_transactions
  where idempotency_key = p_idempotency_key;
  if found then
    return tx_row;
  end if;

  select * into settings_row from public.market_settings where id = 1;
  if settings_row.active_season_id is null then
    raise exception 'ACTIVE_SEASON_NOT_SET';
  end if;

  select * into portfolio_row
  from public.market_portfolios
  where user_id = current_user_id
    and season_id = settings_row.active_season_id
  for update;

  if not found then
    raise exception 'PORTFOLIO_NOT_FOUND';
  end if;

  select * into player_row
  from public.market_players
  where id = p_player_id
    and season_id = settings_row.active_season_id
  for update;

  if not found then
    raise exception 'PLAYER_NOT_FOUND';
  end if;

  select * into holding_row
  from public.market_holdings
  where portfolio_id = portfolio_row.id
    and player_id = p_player_id
  for update;

  if not found then
    raise exception 'NOT_OWNED';
  end if;

  insert into public.market_daily_limits (portfolio_id, activity_date)
  values (portfolio_row.id, now_date)
  on conflict (portfolio_id, activity_date) do nothing;

  select * into daily_row
  from public.market_daily_limits
  where portfolio_id = portfolio_row.id
    and activity_date = now_date
  for update;

  if daily_row.sales_count >= settings_row.maximum_daily_sales then
    raise exception 'DAILY_SALE_LIMIT';
  end if;

  proceeds := player_row.current_price_minor * holding_row.quantity;
  realised := (player_row.current_price_minor - holding_row.purchase_price_minor) * holding_row.quantity;

  delete from public.market_holdings where id = holding_row.id;

  update public.market_portfolios
  set
    cash_balance_minor = cash_balance_minor + proceeds,
    realised_profit_minor = realised_profit_minor + realised
  where id = portfolio_row.id;

  update public.market_daily_limits
  set sales_count = sales_count + 1
  where id = daily_row.id;

  insert into public.market_transactions (
    portfolio_id,
    player_id,
    transaction_type,
    executed_price_minor,
    balance_before_minor,
    balance_after_minor,
    holding_value_before_minor,
    holding_value_after_minor,
    idempotency_key
  )
  values (
    portfolio_row.id,
    player_row.id,
    'sell',
    player_row.current_price_minor,
    portfolio_row.cash_balance_minor,
    portfolio_row.cash_balance_minor + proceeds,
    holding_row.current_value_minor,
    0,
    p_idempotency_key
  )
  returning * into tx_row;

  perform public.market_recalculate_portfolio_totals(portfolio_row.id);

  return tx_row;
end;
$$;

revoke all on function public.market_sell_player(uuid, text) from public;
grant execute on function public.market_sell_player(uuid, text) to authenticated;

-- Idempotent valuation event processor
create or replace function public.market_process_valuation_event(
  p_player_id uuid,
  p_match_stat_id uuid,
  p_event_type text,
  p_previous_price_minor int,
  p_new_price_minor int,
  p_previous_bank_milli int,
  p_rating_milli int,
  p_baseline_rating_milli int,
  p_rating_delta_milli int,
  p_bank_after_event_milli int,
  p_price_change_minor int,
  p_reason text,
  p_calculation_version text,
  p_effective_at timestamptz,
  p_idempotency_key text
)
returns public.market_valuation_events
language plpgsql
security definer
set search_path = public
as $$
declare
  event_row public.market_valuation_events;
begin
  select * into event_row
  from public.market_valuation_events
  where idempotency_key = p_idempotency_key;
  if found then
    return event_row;
  end if;

  insert into public.market_valuation_events (
    player_id,
    match_stat_id,
    event_type,
    previous_price_minor,
    new_price_minor,
    previous_bank_milli,
    rating_milli,
    baseline_rating_milli,
    rating_delta_milli,
    bank_after_event_milli,
    price_change_minor,
    reason,
    calculation_version,
    effective_at,
    idempotency_key
  )
  values (
    p_player_id,
    p_match_stat_id,
    p_event_type,
    p_previous_price_minor,
    p_new_price_minor,
    p_previous_bank_milli,
    p_rating_milli,
    p_baseline_rating_milli,
    p_rating_delta_milli,
    p_bank_after_event_milli,
    p_price_change_minor,
    p_reason,
    p_calculation_version,
    p_effective_at,
    p_idempotency_key
  )
  returning * into event_row;

  update public.market_players
  set
    current_price_minor = p_new_price_minor,
    performance_bank_milli = p_bank_after_event_milli,
    latest_rating_milli = p_rating_milli
  where id = p_player_id;

  update public.market_player_match_stats
  set valuation_processed_at = now()
  where id = p_match_stat_id
    and valuation_processed_at is null;

  return event_row;
end;
$$;

revoke all on function public.market_process_valuation_event(
  uuid, uuid, text, int, int, int, int, int, int, int, int, text, text, timestamptz, text
) from public;
grant execute on function public.market_process_valuation_event(
  uuid, uuid, text, int, int, int, int, int, int, int, int, text, text, timestamptz, text
) to service_role;

create or replace function public.market_rebuild_leaderboard_values()
returns void
language sql
security definer
set search_path = public
as $$
  with holding_values as (
    select
      h.portfolio_id,
      coalesce(sum(p.current_price_minor * h.quantity), 0)::int as holdings_value,
      coalesce(sum((p.current_price_minor - h.purchase_price_minor) * h.quantity), 0)::int as unrealised
    from public.market_holdings h
    join public.market_players p on p.id = h.player_id
    group by h.portfolio_id
  )
  update public.market_portfolios mp
  set
    current_holdings_value_minor = coalesce(hv.holdings_value, 0),
    unrealised_profit_minor = coalesce(hv.unrealised, 0),
    total_portfolio_value_minor = mp.cash_balance_minor + coalesce(hv.holdings_value, 0)
  from holding_values hv
  where hv.portfolio_id = mp.id;
$$;

revoke all on function public.market_rebuild_leaderboard_values() from public;
grant execute on function public.market_rebuild_leaderboard_values() to service_role;
