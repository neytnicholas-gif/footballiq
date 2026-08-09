-- ARCHIVED LEGACY REFERENCE — DO NOT APPLY. This targets the obsolete root MVP
-- model. Current schema changes belong only in supabase/migrations/.
-- FootballIQ Flagship Market Phase 1
-- Apply AFTER SUPABASE_PLAYER_MARKET_MODEL_REVISION_V1.sql
-- Manual apply only.

begin;

alter table if exists public.market_players
  add column if not exists age integer check (age between 15 and 45);

update public.market_settings
set max_portfolio_size = 11
where singleton = true;

-- Enforce exact squad architecture limits for buys:
-- 1 GK, 4 DEF, 3 MID, 3 FWD (11 total).
drop function if exists public.market_buy_player(text, text);
create or replace function public.market_buy_player(
  p_player_slug text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  market_status text;
  today_utc date := (now() at time zone 'UTC')::date;
  p public.market_portfolios;
  player_row public.market_players;
  holdings_count integer := 0;
  holdings_gk integer := 0;
  holdings_def integer := 0;
  holdings_mid integer := 0;
  holdings_fwd integer := 0;
  todays_buys integer := 0;
  duplicate_tx public.market_transactions;
  tx public.market_transactions;
  buy_value bigint := 0;
  max_portfolio_size integer := 11;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if coalesce(length(trim(p_idempotency_key)), 0) < 8 then
    raise exception 'Invalid idempotency key';
  end if;

  select market_settings.market_status, market_settings.max_portfolio_size
  into market_status, max_portfolio_size
  from public.market_settings
  where singleton = true;

  if market_status is distinct from 'open' then
    raise exception 'Market is currently paused or updating';
  end if;

  select * into duplicate_tx
  from public.market_transactions
  where user_id = uid
    and idempotency_key = p_idempotency_key
  limit 1;

  if duplicate_tx.id is not null then
    perform public.market_ensure_portfolio(uid);
    perform public.market_recalculate_portfolio_totals(uid);
    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'message', 'Duplicate request ignored',
      'transaction_id', duplicate_tx.transaction_id
    );
  end if;

  perform public.market_ensure_portfolio(uid);

  select * into p
  from public.market_portfolios
  where user_id = uid
  for update;

  select * into player_row
  from public.market_players
  where slug = p_player_slug
  for update;

  if player_row.id is null then
    raise exception 'Player not found';
  end if;

  if not player_row.active then
    raise exception 'Player is inactive';
  end if;

  if player_row.is_trade_locked and (player_row.trade_lock_ends_at is null or player_row.trade_lock_ends_at > now()) then
    raise exception 'Player trading is temporarily locked: %', coalesce(player_row.trade_lock_reason, 'market review in progress');
  end if;

  if exists (
    select 1 from public.market_holdings
    where user_id = uid and player_id = player_row.id
  ) then
    raise exception 'Player already owned';
  end if;

  select count(*) into holdings_count
  from public.market_holdings
  where user_id = uid;

  if holdings_count >= max_portfolio_size then
    raise exception 'Squad is full (exactly % players max)', max_portfolio_size;
  end if;

  select
    count(*) filter (where mp.position = 'GK'),
    count(*) filter (where mp.position = 'DEF'),
    count(*) filter (where mp.position = 'MID'),
    count(*) filter (where mp.position = 'FWD')
  into holdings_gk, holdings_def, holdings_mid, holdings_fwd
  from public.market_holdings h
  join public.market_players mp on mp.id = h.player_id
  where h.user_id = uid;

  if player_row.position = 'GK' and holdings_gk >= 1 then
    raise exception 'Formation limit reached for GK (1)';
  elsif player_row.position = 'DEF' and holdings_def >= 4 then
    raise exception 'Formation limit reached for DEF (4)';
  elsif player_row.position = 'MID' and holdings_mid >= 3 then
    raise exception 'Formation limit reached for MID (3)';
  elsif player_row.position = 'FWD' and holdings_fwd >= 3 then
    raise exception 'Formation limit reached for FWD (3)';
  end if;

  select count(*) into todays_buys
  from public.market_transactions
  where user_id = uid
    and trade_date_utc = today_utc
    and transaction_type = 'buy';

  if todays_buys >= 3 then
    raise exception 'Daily buy limit reached';
  end if;

  buy_value := player_row.current_value;
  if p.available_balance < buy_value then
    raise exception 'Insufficient balance';
  end if;

  insert into public.market_holdings(
    user_id,
    player_id,
    acquisition_value,
    current_value_snapshot,
    unrealized_profit_loss
  )
  values (uid, player_row.id, buy_value, buy_value, 0);

  insert into public.market_transactions(
    user_id,
    player_id,
    transaction_type,
    execution_value,
    balance_before,
    balance_after,
    idempotency_key
  )
  values (
    uid,
    player_row.id,
    'buy',
    buy_value,
    p.available_balance,
    p.available_balance - buy_value,
    p_idempotency_key
  )
  returning * into tx;

  update public.market_portfolios
  set available_balance = p.available_balance - buy_value
  where user_id = uid;

  perform public.market_recalculate_portfolio_totals(uid);
  perform public.market_capture_snapshot(uid);

  perform public.market_award_xp_event(uid, 'market_first_buy', 25);

  select count(*) into holdings_count
  from public.market_holdings
  where user_id = uid;

  if holdings_count = max_portfolio_size then
    perform public.market_award_xp_event(uid, 'market_first_full_portfolio', 50);
  end if;

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'message', 'Buy executed',
    'transaction_id', tx.transaction_id,
    'player_slug', player_row.slug,
    'execution_value', buy_value,
    'max_portfolio_size', max_portfolio_size
  );
exception
  when unique_violation then
    if exists (
      select 1 from public.market_transactions
      where user_id = uid and idempotency_key = p_idempotency_key
    ) then
      return jsonb_build_object('ok', true, 'duplicate', true, 'message', 'Duplicate request ignored');
    end if;
    raise exception 'Buy blocked by uniqueness guard';
end;
$$;

commit;
