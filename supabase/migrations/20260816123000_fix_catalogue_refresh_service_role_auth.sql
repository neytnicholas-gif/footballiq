begin;

-- Execution is already restricted to service_role below. Checking the JWT claim
-- inside the function breaks Supabase secret/service keys that authenticate as the
-- service_role database role without exposing request.jwt.claim.role.
create or replace function public.market_refresh_all_portfolios_after_catalogue_sync()
returns jsonb
language plpgsql
security invoker
set search_path = 'pg_catalog', 'public'
as $$
declare
  refreshed_holdings integer := 0;
  refreshed_portfolios integer := 0;
begin
  update public.market_holdings h
  set current_value_minor = p.current_price_minor,
      unrealised_profit_minor = p.current_price_minor - h.purchase_price_minor,
      updated_at = now()
  from public.market_players p
  where p.id = h.player_id
    and (
      h.current_value_minor <> p.current_price_minor
      or h.unrealised_profit_minor <> p.current_price_minor - h.purchase_price_minor
    );
  get diagnostics refreshed_holdings = row_count;

  with totals as (
    select portfolio.id,
      coalesce(sum(holding.current_value_minor), 0)::integer as holdings_total,
      coalesce(sum(holding.unrealised_profit_minor), 0)::integer as unrealised_total
    from public.market_portfolios portfolio
    left join public.market_holdings holding on holding.portfolio_id = portfolio.id
    group by portfolio.id
  )
  update public.market_portfolios portfolio
  set current_holdings_value_minor = totals.holdings_total,
      total_portfolio_value_minor = portfolio.cash_balance_minor + totals.holdings_total,
      unrealised_profit_minor = totals.unrealised_total,
      updated_at = now()
  from totals
  where totals.id = portfolio.id;
  get diagnostics refreshed_portfolios = row_count;

  return jsonb_build_object(
    'refreshed_holdings', refreshed_holdings,
    'refreshed_portfolios', refreshed_portfolios
  );
end;
$$;

revoke all on function public.market_refresh_all_portfolios_after_catalogue_sync() from public, anon, authenticated;
grant execute on function public.market_refresh_all_portfolios_after_catalogue_sync() to service_role;

commit;
