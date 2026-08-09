begin;

-- Repair any stale holding snapshots left by earlier preview-only price proofs.
update public.market_holdings h set
  current_value_minor=p.current_price_minor,
  unrealised_profit_minor=p.current_price_minor-h.purchase_price_minor,
  updated_at=now()
from public.market_players p where p.id=h.player_id
  and (h.current_value_minor<>p.current_price_minor or h.unrealised_profit_minor<>p.current_price_minor-h.purchase_price_minor);

with totals as (
  select p.id,coalesce(sum(h.current_value_minor),0)::integer holdings_total,
    coalesce(sum(h.unrealised_profit_minor),0)::integer unrealised_total
  from public.market_portfolios p left join public.market_holdings h on h.portfolio_id=p.id group by p.id
) update public.market_portfolios p set
  current_holdings_value_minor=t.holdings_total,
  total_portfolio_value_minor=p.cash_balance_minor+t.holdings_total,
  unrealised_profit_minor=t.unrealised_total,
  updated_at=now()
from totals t where t.id=p.id;

create or replace function public.market_refresh_my_portfolio()
returns void language plpgsql security definer set search_path='pg_catalog','public' as $$
declare uid uuid:=auth.uid(); pid uuid;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select p.id into pid from public.market_portfolios p join public.market_settings s on s.active_season_id=p.season_id
    where p.user_id=uid and s.id=1;
  if pid is not null then
    update public.market_holdings h set current_value_minor=mp.current_price_minor,
      unrealised_profit_minor=mp.current_price_minor-h.purchase_price_minor,updated_at=now()
    from public.market_players mp where mp.id=h.player_id and h.portfolio_id=pid;
    perform public.market_recalculate_portfolio_totals(pid);
  end if;
end; $$;

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
      'id',abs(hashtextextended(t.id::text,0)) % 2147483647,'transaction_id',t.id,'user_id',uid,
      'player_id',mp.app_player_id,'transaction_type',t.transaction_type,'execution_value',t.executed_price_minor,
      'balance_before',t.balance_before_minor,'balance_after',t.balance_after_minor,'created_at',t.created_at,
      'trade_date_utc',(t.created_at at time zone 'UTC')::date,'idempotency_key',t.idempotency_key) order by t.created_at desc)
      from public.market_transactions t join public.market_players mp on mp.id=t.player_id where t.portfolio_id=p.id),'[]'::jsonb),
    'watchlist', coalesce((select jsonb_agg(mp.app_player_id) from public.market_watchlist w
      join public.market_players mp on mp.id=w.player_id where w.user_id=uid),'[]'::jsonb)
  );
end; $$;

revoke all on function public.market_refresh_my_portfolio() from public,anon;
revoke all on function public.market_app_portfolio_snapshot() from public,anon;
grant execute on function public.market_refresh_my_portfolio() to authenticated;
grant execute on function public.market_app_portfolio_snapshot() to authenticated;

commit;
