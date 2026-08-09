-- Serve the public market from the already-verified database snapshot instead
-- of rebuilding hundreds of provider requests for every browsing session.
revoke insert, update, delete, truncate, references, trigger
  on table public.market_clubs, public.market_seasons
  from anon, authenticated;
grant select on table public.market_clubs, public.market_seasons to anon, authenticated;

drop function if exists public.market_public_catalogue_v1();
create function public.market_public_catalogue_v1()
returns table (
  provider_player_id text,
  app_player_id bigint,
  slug text,
  display_name text,
  club_name text,
  competition_key text,
  competition_name text,
  position_group text,
  age integer,
  nationality text,
  opening_price_minor integer,
  current_price_minor integer,
  previous_price_minor integer,
  latest_rating_milli integer,
  availability_status text,
  data_updated_at timestamptz,
  source_reference text
)
language sql stable security invoker
set search_path = pg_catalog, public
as $$
  select distinct on (player.provider_player_id)
    player.provider_player_id, player.app_player_id, player.slug,
    player.display_name, club.name, season.competition_key, season.name,
    player.position_group, player.age, player.nationality,
    player.initial_price_minor, player.current_price_minor,
    coalesce(latest.previous_price_minor, player.current_price_minor),
    player.latest_rating_milli, player.availability_status,
    player.data_updated_at, player.source_reference
  from public.market_players player
  join public.market_catalogues catalogue
    on catalogue.id = player.catalogue_id
   and catalogue.season_id = player.season_id
   and catalogue.status = 'active'
  join public.market_seasons season on season.id = player.season_id
  join public.market_clubs club on club.id = player.club_id
  left join lateral (
    select event.previous_price_minor
    from public.market_valuation_events event
    where event.player_id = player.id
    order by event.effective_at desc, event.created_at desc
    limit 1
  ) latest on true
  where player.is_available
    and player.provider_player_id is not null
    and player.app_player_id is not null
  order by player.provider_player_id, player.updated_at desc;
$$;

revoke all on function public.market_public_catalogue_v1() from public;
grant execute on function public.market_public_catalogue_v1() to anon, authenticated, service_role;
