begin;

-- Apply only after the application release using the narrow public catalogue
-- and player-detail RPCs is live. Keeping this permission cutover separate
-- makes the production rollout backwards-compatible and avoids a broken page
-- while the new deployment is building.
revoke all on table public.market_players from anon, authenticated;
revoke all on table public.market_valuation_events from anon, authenticated;
grant all on table public.market_players, public.market_valuation_events to service_role;

revoke all on function public.market_public_price_book_v1()
  from public, anon, authenticated;
grant execute on function public.market_public_price_book_v1() to service_role;

commit;
