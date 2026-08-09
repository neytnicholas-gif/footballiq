-- Close launch-gate gaps found by the independent audit.
revoke all on function public.market_buy_player(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.market_sell_player(uuid, text) from public, anon, authenticated;
drop function if exists public.market_buy_player(uuid, text, integer);
drop function if exists public.market_sell_player(uuid, text);

revoke insert, update, delete, truncate, references, trigger on table public.market_players from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.market_catalogues from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.market_valuation_events from anon, authenticated;

drop policy if exists market_gameweeks_public_read on public.market_gameweeks;
revoke all on table public.market_gameweeks from anon, authenticated;

create index if not exists market_player_match_stats_player_fixture_date_idx
  on public.market_player_match_stats(player_id, fixture_date desc, imported_at desc)
  where minutes_played > 0;

drop function if exists public.market_public_price_book_v1();
create function public.market_public_price_book_v1()
returns table (
  provider_player_id text,
  opening_price_minor integer,
  current_price_minor integer,
  previous_price_minor integer,
  latest_rating_milli integer,
  value_updated_at timestamptz
)
language sql stable security invoker
set search_path = pg_catalog, public
as $$
  select distinct on (p.provider_player_id)
    p.provider_player_id, p.initial_price_minor, p.current_price_minor,
    coalesce(latest.previous_price_minor, p.current_price_minor),
    p.latest_rating_milli, p.data_updated_at
  from public.market_players p
  join public.market_catalogues c on c.id = p.catalogue_id and c.season_id = p.season_id
  left join lateral (
    select e.previous_price_minor, e.rating_milli, e.effective_at
    from public.market_valuation_events e
    where e.player_id = p.id
    order by e.effective_at desc, e.created_at desc limit 1
  ) latest on true
  where c.status = 'active' and p.is_available and p.provider_player_id is not null
  order by p.provider_player_id, p.updated_at desc;
$$;
revoke all on function public.market_public_price_book_v1() from public;
grant execute on function public.market_public_price_book_v1() to anon, authenticated, service_role;
grant select on table public.market_players, public.market_catalogues, public.market_valuation_events to anon, authenticated;
