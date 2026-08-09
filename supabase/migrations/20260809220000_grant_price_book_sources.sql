begin;

grant select on table public.market_players to anon,authenticated;
grant select on table public.market_catalogues to anon,authenticated;
grant select on table public.market_valuation_events to anon,authenticated;

commit;
