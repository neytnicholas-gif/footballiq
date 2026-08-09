-- RLS already limits this table to active-catalogue rows. The Data API also
-- requires an explicit table grant before those policies can be evaluated.
grant select on table public.market_public_leaderboard to anon, authenticated;
