-- FootballIQ account-backed Market hardening and one-time guest squad import.
-- This migration deliberately keeps balances, holdings, and transactions
-- server-owned. A guest import preserves player selections at current prices;
-- it never trusts browser-supplied balances or acquisition prices.

begin;

create table if not exists public.market_guest_imports (
  user_id uuid primary key references auth.users(id) on delete cascade,
  imported_holdings integer not null default 0 check (imported_holdings between 0 and 11),
  imported_watchlist integer not null default 0 check (imported_watchlist >= 0),
  created_at timestamptz not null default now()
);

alter table public.market_guest_imports enable row level security;

drop policy if exists "Users read own guest import" on public.market_guest_imports;
create policy "Users read own guest import"
on public.market_guest_imports for select
to authenticated
using ((select auth.uid()) = user_id);

-- Private Market state is readable by its owner, but all mutations go through
-- atomic RPCs. Remove the older browser-write policies from the draft schema.
drop policy if exists "Users update own market portfolio" on public.market_portfolios;
drop policy if exists "Users insert own market portfolio" on public.market_portfolios;
drop policy if exists "Users insert own holdings" on public.market_holdings;
drop policy if exists "Users update own holdings" on public.market_holdings;
drop policy if exists "Users delete own holdings" on public.market_holdings;
drop policy if exists "Users insert own market transactions" on public.market_transactions;
drop policy if exists "Users write own watchlist" on public.market_watchlist;
drop policy if exists "Users delete own watchlist" on public.market_watchlist;

-- 2026 Supabase projects may not expose new tables automatically. Grant only
-- the reads the application needs; RLS still restricts every private row.
revoke all on table public.market_portfolios from anon, authenticated;
revoke all on table public.market_holdings from anon, authenticated;
revoke all on table public.market_transactions from anon, authenticated;
revoke all on table public.market_watchlist from anon, authenticated;
revoke all on table public.market_portfolio_snapshots from anon, authenticated;
revoke all on table public.market_xp_events from anon, authenticated;
revoke all on table public.market_guest_imports from anon, authenticated;

grant select on table public.market_portfolios to authenticated;
grant select on table public.market_holdings to authenticated;
grant select on table public.market_transactions to authenticated;
grant select on table public.market_watchlist to authenticated;
grant select on table public.market_portfolio_snapshots to authenticated;
grant select on table public.market_xp_events to authenticated;
grant select on table public.market_guest_imports to authenticated;

grant select on table public.market_players to anon, authenticated;
grant select on table public.player_season_stats to anon, authenticated;
grant select on table public.market_value_history to anon, authenticated;
grant select on table public.market_settings to anon, authenticated;

create or replace function public.market_import_guest_squad(
  p_player_slugs text[],
  p_watchlist_slugs text[] default array[]::text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  requested_count integer := coalesce(cardinality(p_player_slugs), 0);
  distinct_count integer := 0;
  matched_count integer := 0;
  watch_count integer := 0;
  holdings_gk integer := 0;
  holdings_def integer := 0;
  holdings_mid integer := 0;
  holdings_fwd integer := 0;
  total_cost bigint := 0;
  v_starting_balance bigint := 100000000;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.market_guest_imports where user_id = uid) then
    return jsonb_build_object('ok', true, 'imported', false, 'reason', 'already_imported');
  end if;

  -- Never overwrite an account that has already started trading.
  if exists (select 1 from public.market_holdings where user_id = uid)
    or exists (select 1 from public.market_transactions where user_id = uid) then
    insert into public.market_guest_imports(user_id)
    values (uid)
    on conflict (user_id) do nothing;
    return jsonb_build_object('ok', true, 'imported', false, 'reason', 'account_already_initialized');
  end if;

  if requested_count > 11 then
    raise exception 'Guest squad exceeds 11-player limit';
  end if;

  select count(distinct slug)
  into distinct_count
  from unnest(coalesce(p_player_slugs, array[]::text[])) as slug;

  if distinct_count <> requested_count then
    raise exception 'Guest squad contains duplicate players';
  end if;

  select
    count(*),
    coalesce(sum(current_value), 0),
    count(*) filter (where position = 'GK'),
    count(*) filter (where position = 'DEF'),
    count(*) filter (where position = 'MID'),
    count(*) filter (where position = 'FWD')
  into matched_count, total_cost, holdings_gk, holdings_def, holdings_mid, holdings_fwd
  from public.market_players
  where active = true
    and slug = any(coalesce(p_player_slugs, array[]::text[]));

  if matched_count <> requested_count then
    raise exception 'One or more guest players are unavailable';
  end if;

  if holdings_gk > 1 or holdings_def > 4 or holdings_mid > 3 or holdings_fwd > 3 then
    raise exception 'Guest squad does not fit the 1-4-3-3 formation limits';
  end if;

  if total_cost > v_starting_balance then
    raise exception 'Guest squad exceeds the 100m FIQ starting balance';
  end if;

  perform public.market_ensure_portfolio(uid);

  insert into public.market_holdings(
    user_id,
    player_id,
    acquisition_value,
    current_value_snapshot,
    unrealized_profit_loss
  )
  select uid, id, current_value, current_value, 0
  from public.market_players
  where active = true
    and slug = any(coalesce(p_player_slugs, array[]::text[]))
  on conflict (user_id, player_id) do nothing;

  update public.market_portfolios
  set available_balance = v_starting_balance - total_cost,
      starting_balance = v_starting_balance,
      realized_profit_loss = 0
  where user_id = uid;

  insert into public.market_watchlist(user_id, player_id)
  select uid, id
  from public.market_players
  where active = true
    and slug = any(coalesce(p_watchlist_slugs, array[]::text[]))
  on conflict (user_id, player_id) do nothing;

  get diagnostics watch_count = row_count;

  perform public.market_recalculate_portfolio_totals(uid);
  perform public.market_capture_snapshot(uid);

  insert into public.market_guest_imports(user_id, imported_holdings, imported_watchlist)
  values (uid, matched_count, watch_count);

  return jsonb_build_object(
    'ok', true,
    'imported', true,
    'holdings', matched_count,
    'watchlist', watch_count,
    'available_balance', v_starting_balance - total_cost,
    'pricing', 'current_market_value'
  );
end;
$$;

-- SECURITY DEFINER helpers are internal implementation details, not public RPCs.
revoke all on function public.market_ensure_portfolio(uuid) from public, anon, authenticated;
revoke all on function public.market_recalculate_portfolio_totals(uuid) from public, anon, authenticated;
revoke all on function public.market_capture_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.market_award_xp_event(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.market_admin_update_player_value(text, bigint, text, text, boolean) from public, anon, authenticated;
revoke all on function public.market_apply_simulated_matchweek(text, jsonb, text) from public, anon, authenticated;

revoke all on function public.market_buy_player(text, text) from public, anon;
revoke all on function public.market_sell_player(text, text) from public, anon;
revoke all on function public.market_toggle_watchlist(text) from public, anon;
revoke all on function public.market_refresh_my_portfolio() from public, anon;
revoke all on function public.market_import_guest_squad(text[], text[]) from public, anon;

grant execute on function public.market_buy_player(text, text) to authenticated;
grant execute on function public.market_sell_player(text, text) to authenticated;
grant execute on function public.market_toggle_watchlist(text) to authenticated;
grant execute on function public.market_refresh_my_portfolio() to authenticated;
grant execute on function public.market_import_guest_squad(text[], text[]) to authenticated;
grant execute on function public.market_admin_update_player_value(text, bigint, text, text, boolean) to service_role;

commit;
