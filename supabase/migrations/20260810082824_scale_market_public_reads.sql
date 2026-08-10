-- Keep the authenticated read path bounded as transaction history grows.
-- Authoritative holdings already join current market prices, so page views do
-- not need to perform a write-side portfolio refresh before reading.
create index if not exists market_transactions_portfolio_date_idx
  on public.market_transactions(portfolio_id, created_at desc);

create or replace function public.market_app_portfolio_snapshot()
returns jsonb language plpgsql security definer set search_path='pg_catalog','public' as $$
declare uid uuid:=auth.uid(); s public.market_settings; p public.market_portfolios;
  live_holdings integer:=0; live_unrealised integer:=0;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into s from public.market_settings where id=1;
  select * into p from public.market_portfolios where user_id=uid and season_id=s.active_season_id;
  if p.id is not null then
    select coalesce(sum(mp.current_price_minor),0)::integer,
      coalesce(sum(mp.current_price_minor-h.purchase_price_minor),0)::integer
    into live_holdings,live_unrealised
    from public.market_holdings h join public.market_players mp on mp.id=h.player_id where h.portfolio_id=p.id;
  end if;
  return jsonb_build_object(
    'portfolio', case when p.id is null then null else jsonb_build_object(
      'user_id',uid,'available_balance',p.cash_balance_minor,'starting_balance',p.starting_balance_minor,
      'portfolio_value',live_holdings,'total_account_value',p.cash_balance_minor+live_holdings,
      'realized_profit_loss',p.realised_profit_minor,'created_at',p.created_at,'updated_at',p.updated_at) end,
    'holdings', coalesce((select jsonb_agg(jsonb_build_object(
      'id',abs(hashtextextended(h.id::text,0)) % 2147483647,'user_id',uid,'player_id',mp.app_player_id,
      'acquisition_value',h.purchase_price_minor,'acquired_at',h.purchased_at,
      'current_value_snapshot',mp.current_price_minor,
      'unrealized_profit_loss',mp.current_price_minor-h.purchase_price_minor) order by h.purchased_at)
      from public.market_holdings h join public.market_players mp on mp.id=h.player_id where h.portfolio_id=p.id),'[]'::jsonb),
    'transactions', coalesce((select jsonb_agg(jsonb_build_object(
      'id',abs(hashtextextended(recent.id::text,0)) % 2147483647,'transaction_id',recent.id,'user_id',uid,
      'player_id',recent.app_player_id,'transaction_type',recent.transaction_type,'execution_value',recent.executed_price_minor,
      'balance_before',recent.balance_before_minor,'balance_after',recent.balance_after_minor,'created_at',recent.created_at,
      'trade_date_utc',(recent.created_at at time zone 'UTC')::date,'idempotency_key',recent.idempotency_key)
      order by recent.created_at desc)
      from (
        select t.*, mp.app_player_id
        from public.market_transactions t
        join public.market_players mp on mp.id=t.player_id
        where t.portfolio_id=p.id
        order by t.created_at desc
        limit 30
      ) recent),'[]'::jsonb),
    'watchlist', coalesce((select jsonb_agg(mp.app_player_id) from public.market_watchlist w
      join public.market_players mp on mp.id=w.player_id where w.user_id=uid),'[]'::jsonb)
  );
end; $$;

revoke all on function public.market_app_portfolio_snapshot() from public,anon;
grant execute on function public.market_app_portfolio_snapshot() to authenticated;

comment on function public.market_app_portfolio_snapshot() is
  'Returns one users authoritative portfolio with at most 30 recent transactions; bounded for launch-scale reads.';
