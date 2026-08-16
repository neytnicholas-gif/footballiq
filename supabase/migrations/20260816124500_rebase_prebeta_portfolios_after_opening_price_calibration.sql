begin;

-- Opening-price calibration is not gameplay profit. Before beta, rebase only
-- portfolios whose currently held players have never received a valuation event.
-- This keeps the roster intact while preserving the original starting total.
create temporary table opening_price_rebase_portfolios on commit drop as
select portfolio.id,
       portfolio.starting_balance_minor,
       coalesce(sum(holding.current_value_minor), 0)::integer as holdings_total
from public.market_portfolios portfolio
join public.market_holdings holding on holding.portfolio_id = portfolio.id
where not exists (
  select 1
  from public.market_valuation_events valuation
  join public.market_holdings held on held.player_id = valuation.player_id
  where held.portfolio_id = portfolio.id
)
group by portfolio.id, portfolio.starting_balance_minor;

do $$
begin
  if exists (
    select 1
    from opening_price_rebase_portfolios
    where holdings_total > starting_balance_minor
  ) then
    raise exception 'OPENING_PRICE_REBASE_WOULD_CREATE_NEGATIVE_CASH';
  end if;
end;
$$;

update public.market_holdings holding
set purchase_price_minor = holding.current_value_minor,
    unrealised_profit_minor = 0,
    updated_at = now()
from opening_price_rebase_portfolios eligible
where holding.portfolio_id = eligible.id;

update public.market_portfolios portfolio
set cash_balance_minor = eligible.starting_balance_minor - eligible.holdings_total,
    current_holdings_value_minor = eligible.holdings_total,
    total_portfolio_value_minor = eligible.starting_balance_minor,
    realised_profit_minor = 0,
    unrealised_profit_minor = 0,
    updated_at = now()
from opening_price_rebase_portfolios eligible
where portfolio.id = eligible.id;

insert into public.market_processing_runs (
  run_key,
  run_type,
  status,
  dry_run,
  started_at,
  finished_at,
  report
)
select 'opening-price-v3-prebeta-rebase',
       'opening_price_calibration',
       'completed',
       false,
       now(),
       now(),
       jsonb_build_object(
         'method_version', 'early-shout-opening-v3.0',
         'portfolios_rebased', count(*),
         'reason', 'Opening-price calibration is not gameplay profit.'
       )
from opening_price_rebase_portfolios
on conflict (run_key) do nothing;

commit;
