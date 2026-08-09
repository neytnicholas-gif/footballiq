-- Public catalogue metadata is already restricted to active rows by RLS.
-- Leaderboard and season read policies depend on this table, so PostgREST's
-- anon/authenticated roles need SELECT for those policies to evaluate.
grant select on table public.market_catalogues to anon, authenticated;
