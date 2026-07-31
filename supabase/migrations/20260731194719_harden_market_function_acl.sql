-- Manual Player Market function ACL hardening.
-- Supabase default privileges grant new functions directly to API roles, so
-- revoking only PostgreSQL's PUBLIC pseudo-role is not sufficient.

-- Start from an explicit deny-all baseline for every market RPC and trigger
-- helper, including roles that may have received default grants.
revoke all on function public.market_activate_catalogue(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.market_admin_update_player_value(text, int, int, timestamptz, text, text, text, uuid) from public, anon, authenticated, service_role;
revoke all on function public.market_brussels_date(timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.market_buy_player(uuid, text, int) from public, anon, authenticated, service_role;
revoke all on function public.market_create_or_get_portfolio() from public, anon, authenticated, service_role;
revoke all on function public.market_get_portfolio_snapshot() from public, anon, authenticated, service_role;
revoke all on function public.market_process_valuation_event(uuid, uuid, text, int, int, int, int, int, int, int, int, text, text, timestamptz, text) from public, anon, authenticated, service_role;
revoke all on function public.market_public_leaderboard_v1() from public, anon, authenticated, service_role;
revoke all on function public.market_public_players_v1() from public, anon, authenticated, service_role;
revoke all on function public.market_public_value_history_v1(uuid) from public, anon, authenticated, service_role;
revoke all on function public.market_rebuild_leaderboard_values() from public, anon, authenticated, service_role;
revoke all on function public.market_recalculate_portfolio_totals(uuid) from public, anon, authenticated, service_role;
revoke all on function public.market_refresh_player_season_stats(text) from public, anon, authenticated, service_role;
revoke all on function public.market_sell_player(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.market_sync_manual_availability() from public, anon, authenticated, service_role;
revoke all on function public.market_upsert_public_leaderboard_row(uuid, text, bigint) from public, anon, authenticated, service_role;
revoke all on function public.set_updated_at() from public, anon, authenticated, service_role;

-- Deliberately public, minimal, read-only projections.
grant execute on function public.market_public_players_v1() to anon, authenticated, service_role;
grant execute on function public.market_public_value_history_v1(uuid) to anon, authenticated, service_role;
grant execute on function public.market_public_leaderboard_v1() to anon, authenticated, service_role;

-- Authenticated user operations. Each mutation still performs its own auth.uid()
-- check and remains server-authoritative, atomic and idempotent.
grant execute on function public.market_brussels_date(timestamptz) to authenticated, service_role;
grant execute on function public.market_create_or_get_portfolio() to authenticated, service_role;
grant execute on function public.market_buy_player(uuid, text, int) to authenticated, service_role;
grant execute on function public.market_sell_player(uuid, text) to authenticated, service_role;
grant execute on function public.market_get_portfolio_snapshot() to authenticated, service_role;

-- Trusted infrastructure only.
grant execute on function public.market_activate_catalogue(uuid, text) to service_role;
grant execute on function public.market_admin_update_player_value(text, int, int, timestamptz, text, text, text, uuid) to service_role;
grant execute on function public.market_rebuild_leaderboard_values() to service_role;
grant execute on function public.market_recalculate_portfolio_totals(uuid) to service_role;
grant execute on function public.market_refresh_player_season_stats(text) to service_role;
grant execute on function public.market_upsert_public_leaderboard_row(uuid, text, bigint) to service_role;

-- Pin every function lookup path. Trigger helpers need no direct API execution.
alter function public.set_updated_at() set search_path = pg_catalog, public;
alter function public.market_activate_catalogue(uuid, text) set search_path = pg_catalog, public;
alter function public.market_admin_update_player_value(text, int, int, timestamptz, text, text, text, uuid) set search_path = pg_catalog, public;
alter function public.market_brussels_date(timestamptz) set search_path = pg_catalog, public;
alter function public.market_buy_player(uuid, text, int) set search_path = pg_catalog, public;
alter function public.market_create_or_get_portfolio() set search_path = pg_catalog, public;
alter function public.market_get_portfolio_snapshot() set search_path = pg_catalog, public;
alter function public.market_process_valuation_event(uuid, uuid, text, int, int, int, int, int, int, int, int, text, text, timestamptz, text) set search_path = pg_catalog, public;
alter function public.market_public_leaderboard_v1() set search_path = pg_catalog, public;
alter function public.market_public_players_v1() set search_path = pg_catalog, public;
alter function public.market_public_value_history_v1(uuid) set search_path = pg_catalog, public;
alter function public.market_rebuild_leaderboard_values() set search_path = pg_catalog, public;
alter function public.market_recalculate_portfolio_totals(uuid) set search_path = pg_catalog, public;
alter function public.market_refresh_player_season_stats(text) set search_path = pg_catalog, public;
alter function public.market_sell_player(uuid, text) set search_path = pg_catalog, public;
alter function public.market_sync_manual_availability() set search_path = pg_catalog, public;
alter function public.market_upsert_public_leaderboard_row(uuid, text, bigint) set search_path = pg_catalog, public;
