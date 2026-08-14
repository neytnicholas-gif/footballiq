-- Establish the materialized public leaderboard contract in migration history.
-- Early prototypes exposed this name as a view outside the migration pipeline.
-- Preserve that legacy view under a diagnostic name before creating the table.
do $$
declare
  relation_kind "char";
begin
  select c.relkind into relation_kind
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'market_public_leaderboard';

  if relation_kind = 'v' then
    if to_regclass('public.market_public_leaderboard_legacy') is null then
      execute 'alter view public.market_public_leaderboard rename to market_public_leaderboard_legacy';
    else
      execute 'drop view public.market_public_leaderboard';
    end if;
  elsif relation_kind = 'm' then
    if to_regclass('public.market_public_leaderboard_legacy') is null then
      execute 'alter materialized view public.market_public_leaderboard rename to market_public_leaderboard_legacy';
    else
      execute 'drop materialized view public.market_public_leaderboard';
    end if;
  end if;
end
$$;

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
  return_basis_points integer not null default 0,
  calculated_at timestamptz not null default now(),
  check (total_wealth_minor = cash_balance_minor + holdings_value_minor),
  check (total_profit_minor = realised_profit_minor + unrealised_profit_minor)
);

alter table public.market_public_leaderboard enable row level security;
revoke all on table public.market_public_leaderboard from public, anon, authenticated;
grant select on table public.market_public_leaderboard to anon, authenticated;
grant all on table public.market_public_leaderboard to service_role;

drop policy if exists market_public_leaderboard_public_read on public.market_public_leaderboard;
create policy market_public_leaderboard_public_read
on public.market_public_leaderboard for select
to anon, authenticated
using (
  exists (
    select 1
    from public.market_catalogues catalogue
    where catalogue.season_id = market_public_leaderboard.season_id
      and catalogue.status = 'active'
  )
);

create index if not exists market_public_leaderboard_return_idx
  on public.market_public_leaderboard (season_id, return_basis_points desc, portfolio_id);
create index if not exists market_public_leaderboard_wealth_idx
  on public.market_public_leaderboard (season_id, total_wealth_minor desc, portfolio_id);
create index if not exists market_public_leaderboard_weekly_idx
  on public.market_public_leaderboard (season_id, weekly_change_minor desc, portfolio_id);

create or replace function public.market_upsert_public_leaderboard_row(
  p_portfolio_id uuid,
  p_display_name text,
  p_weekly_change_minor bigint
) returns void
language plpgsql
set search_path = 'pg_catalog', 'public'
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
        / portfolio_row.starting_balance_minor::numeric) * 10000)::integer end,
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

revoke all on function public.market_upsert_public_leaderboard_row(uuid, text, bigint)
from public, anon, authenticated;
grant execute on function public.market_upsert_public_leaderboard_row(uuid, text, bigint)
to service_role;
