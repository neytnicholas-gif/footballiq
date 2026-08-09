-- Player-card statistics are public only for players in active catalogues; RLS
-- enforces that filter. These grants let PostgREST evaluate the policy chain.
grant select on table public.market_players, public.player_season_stats to anon, authenticated;
