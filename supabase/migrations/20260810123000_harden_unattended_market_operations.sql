-- Safe degradation for unattended operation.
-- Authenticated writes are rejected while the operator has marked the market
-- updating or paused, and hot RPCs fail quickly instead of exhausting the pool.

create or replace function public.market_enforce_trading_open()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  status text;
begin
  -- Scheduled/service-role maintenance and direct administrative work are not
  -- user trades. The guard applies only to authenticated end-user mutations.
  if auth.uid() is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  select market_status into status
  from public.market_settings
  where id = 1;

  if status is distinct from 'open' then
    raise exception 'MARKET_TEMPORARILY_UNAVAILABLE'
      using errcode = 'P0001', hint = 'No portfolio change was committed.';
  end if;

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists market_holdings_require_open_market on public.market_holdings;
create trigger market_holdings_require_open_market
before insert or delete on public.market_holdings
for each row execute function public.market_enforce_trading_open();

revoke all on function public.market_enforce_trading_open() from public, anon, authenticated;

-- Keep hot user requests from queuing until the database becomes unavailable.
-- PostgreSQL rolls the entire RPC transaction back on either timeout.
alter function public.market_buy_player(text, text) set statement_timeout = '5s';
alter function public.market_buy_player(text, text) set lock_timeout = '2s';
alter function public.market_sell_player(text, text) set statement_timeout = '5s';
alter function public.market_sell_player(text, text) set lock_timeout = '2s';
alter function public.market_toggle_watchlist(text) set statement_timeout = '4s';
alter function public.market_toggle_watchlist(text) set lock_timeout = '2s';
alter function public.market_app_portfolio_snapshot() set statement_timeout = '4s';
alter function public.market_my_gameweek_status() set statement_timeout = '4s';
alter function public.market_import_guest_squad(text[], text[]) set statement_timeout = '8s';
alter function public.market_import_guest_squad(text[], text[]) set lock_timeout = '2s';

comment on function public.market_enforce_trading_open() is
  'Fail-closed guard for authenticated holding changes while market_status is not open.';
