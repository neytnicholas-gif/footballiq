-- These legacy read/portfolio RPCs are no longer used by the application.
-- Keep them service-only for operational compatibility and remove exposed
-- SECURITY DEFINER entry points from anonymous and account sessions.
revoke all on function public.market_public_players_v1() from public, anon, authenticated;
revoke all on function public.market_public_leaderboard_v1() from public, anon, authenticated;
revoke all on function public.market_public_value_history_v1(uuid) from public, anon, authenticated;
revoke all on function public.market_create_or_get_portfolio() from public, anon, authenticated;
revoke all on function public.market_get_portfolio_snapshot() from public, anon, authenticated;
