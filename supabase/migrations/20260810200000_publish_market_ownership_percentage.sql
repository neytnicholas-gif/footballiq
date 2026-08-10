-- Publish one privacy-safe popularity percentage with the cached catalogue.
-- The denominator is active Player Market users (accounts holding at least one
-- player), not every FootballIQ account. No user IDs or raw owner totals leave
-- this function.
drop function if exists public.market_public_catalogue_v1(text);
create function public.market_public_catalogue_v1(p_competition_key text)
returns table (
  provider_player_id text, app_player_id bigint, slug text, display_name text,
  club_name text, competition_key text, competition_name text,
  position_group text, age integer, nationality text,
  opening_price_minor integer, current_price_minor integer,
  previous_price_minor integer, latest_rating_milli integer,
  ownership_percentage numeric, availability_status text,
  data_updated_at timestamptz, source_reference text
)
-- SECURITY DEFINER is intentional here: RLS must not turn the global percentage
-- into a per-user number. The function accepts only a competition key and emits
-- catalogue fields plus a rounded percentage; no identities or raw totals.
language sql stable security definer
set search_path = pg_catalog, public
as $$
  with active_users as (
    select distinct portfolio.user_id
    from public.market_portfolios portfolio
    join public.market_holdings holding on holding.portfolio_id = portfolio.id
  ),
  audience as (
    select count(*)::numeric as users from active_users
  ),
  ownership as (
    select holding.player_id, count(distinct portfolio.user_id)::numeric as owners
    from public.market_holdings holding
    join public.market_portfolios portfolio on portfolio.id = holding.portfolio_id
    group by holding.player_id
  )
  select distinct on (player.provider_player_id)
    player.provider_player_id, player.app_player_id, player.slug,
    player.display_name, club.name, season.competition_key,
    case season.competition_key
      when 'premier-league' then 'Premier League'
      when 'la-liga' then 'La Liga'
      when 'ligue-1' then 'Ligue 1'
      else season.name
    end,
    player.position_group, player.age, player.nationality,
    player.initial_price_minor, player.current_price_minor,
    coalesce(latest.previous_price_minor, player.current_price_minor),
    player.latest_rating_milli,
    case when audience.users = 0 then 0::numeric
      else round((100 * coalesce(ownership.owners, 0)) / audience.users, 1)
    end,
    player.availability_status, player.data_updated_at, player.source_reference
  from public.market_players player
  join public.market_catalogues catalogue
    on catalogue.id = player.catalogue_id
   and catalogue.season_id = player.season_id
   and catalogue.status = 'active'
  join public.market_seasons season on season.id = player.season_id
  join public.market_clubs club on club.id = player.club_id
  cross join audience
  left join ownership on ownership.player_id = player.id
  left join lateral (
    select event.previous_price_minor
    from public.market_valuation_events event
    where event.player_id = player.id
    order by event.effective_at desc, event.created_at desc limit 1
  ) latest on true
  where player.is_available
    and player.provider_player_id is not null
    and player.app_player_id is not null
    and season.competition_key = p_competition_key
  order by player.provider_player_id, player.updated_at desc;
$$;
revoke all on function public.market_public_catalogue_v1(text) from public;
grant execute on function public.market_public_catalogue_v1(text) to anon, authenticated, service_role;
