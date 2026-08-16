begin;

alter table public.market_players
  add column if not exists opening_price_method_version text not null default 'legacy-age-position-v1',
  add column if not exists opening_price_confidence text not null default 'fallback',
  add column if not exists opening_price_evidence jsonb not null default '{}'::jsonb;

alter table public.market_players
  drop constraint if exists market_players_opening_price_confidence_check;

alter table public.market_players
  add constraint market_players_opening_price_confidence_check
  check (opening_price_confidence in ('fallback', 'limited', 'established', 'high'));

alter table public.market_players
  drop constraint if exists market_players_opening_price_evidence_check;

alter table public.market_players
  add constraint market_players_opening_price_evidence_check
  check (jsonb_typeof(opening_price_evidence) = 'object');

comment on column public.market_players.opening_price_method_version is
  'Version of the Early Shout game-price model that produced initial_price_minor.';
comment on column public.market_players.opening_price_confidence is
  'Evidence confidence for the opening game price; sparse samples are capped.';
comment on column public.market_players.opening_price_evidence is
  'Auditable inputs and score breakdown used to calculate the opening game price.';

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
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED';
  end if;

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
