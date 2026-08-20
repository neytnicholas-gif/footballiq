begin;

-- Opening-price calibration and verified match movement are separate events.
-- If a calibration changes the player's public price after a valuation event,
-- the event's old absolute price no longer belongs to the current price chain.
-- Preserve the verified signed movement instead of publishing a fabricated
-- multi-million rise or fall.
drop function if exists public.market_public_catalogue_v1(text);
create function public.market_public_catalogue_v1(p_competition_key text)
returns table (
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
  ownership_percentage numeric,
  availability_status text,
  data_updated_at timestamptz,
  is_trade_locked boolean,
  trade_lock_reason text,
  trade_lock_started_at timestamptz,
  trade_lock_ends_at timestamptz
)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  with active_users as (
    select distinct portfolio.user_id
    from public.market_portfolios portfolio
    join public.market_holdings holding on holding.portfolio_id = portfolio.id
  ), audience as (
    select count(*)::numeric as users from active_users
  ), ownership as (
    select holding.player_id, count(distinct portfolio.user_id)::numeric as owners
    from public.market_holdings holding
    join public.market_portfolios portfolio on portfolio.id = holding.portfolio_id
    group by holding.player_id
  )
  select distinct on (player.provider_player_id)
    player.app_player_id,
    player.slug,
    player.display_name,
    club.name,
    season.competition_key,
    case season.competition_key
      when 'premier-league' then 'Premier League'
      when 'la-liga' then 'La Liga'
      when 'ligue-1' then 'Ligue 1'
      else season.name
    end,
    player.position_group,
    player.age,
    player.nationality,
    player.initial_price_minor,
    player.current_price_minor,
    case
      when latest.new_price_minor is null then player.current_price_minor
      when latest.new_price_minor = player.current_price_minor then latest.previous_price_minor
      else greatest(4000000, least(15000000,
        player.current_price_minor - latest.price_change_minor
      ))
    end,
    player.latest_rating_milli,
    case when audience.users = 0 then 0::numeric
      else round((100 * coalesce(ownership.owners, 0)) / audience.users, 1)
    end,
    player.availability_status,
    player.data_updated_at,
    trade_lock.is_locked,
    trade_lock.lock_reason,
    trade_lock.lock_started_at,
    trade_lock.lock_ends_at
  from public.market_players player
  join public.market_catalogues catalogue
    on catalogue.id = player.catalogue_id
   and catalogue.season_id = player.season_id
   and catalogue.status = 'active'
  join public.market_seasons season on season.id = player.season_id
  join public.market_clubs club on club.id = player.club_id
  cross join audience
  cross join lateral public.market_player_trade_lock(player.id) trade_lock
  left join ownership on ownership.player_id = player.id
  left join lateral (
    select event.previous_price_minor, event.new_price_minor, event.price_change_minor
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
grant execute on function public.market_public_catalogue_v1(text)
  to anon, authenticated, service_role;

-- The player page previously queried a legacy market_value_history table that
-- is not part of the production gameweek engine. Publish the real valuation
-- event chain through the existing reviewed player-detail boundary instead.
-- Reconstruct each point from signed changes so an opening-price recalibration
-- cannot create the same fabricated multi-million jump in the history chart.
create or replace function public.market_public_player_detail_v1(p_app_player_id bigint)
returns jsonb
language sql stable security definer
set search_path = pg_catalog, public
as $$
  with chosen as (
    select player.*
    from public.market_players player
    join public.market_catalogues catalogue
      on catalogue.id = player.catalogue_id
     and catalogue.season_id = player.season_id
     and catalogue.status = 'active'
    where player.app_player_id = p_app_player_id and player.is_available
    order by player.updated_at desc
    limit 1
  ), event_chain as (
    select
      row_number() over (
        order by event.effective_at, event.created_at, event.id
      ) + 1 as display_id,
      player.app_player_id,
      greatest(4000000, least(15000000,
        player.current_price_minor - coalesce(sum(event.price_change_minor) over (
          order by event.effective_at desc, event.created_at desc, event.id desc
          rows between unbounded preceding and 1 preceding
        ), 0)::integer
      )) as reconstructed_price_minor,
      event.effective_at,
      coalesce(event.reason, event.event_type) as reason_category,
      event.calculation_version,
      event.created_at
    from chosen player
    join public.market_valuation_events event on event.player_id = player.id
  ), history_rows as (
    select
      1::bigint as display_id,
      player.app_player_id,
      greatest(4000000, least(15000000,
        player.current_price_minor - coalesce((
          select sum(event.price_change_minor)::integer
          from public.market_valuation_events event
          where event.player_id = player.id
        ), 0)
      )) as reconstructed_price_minor,
      coalesce((select min(chain.effective_at) from event_chain chain) - interval '1 microsecond', player.updated_at) as effective_at,
      'opening-price'::text as reason_category,
      coalesce(player.opening_price_method_version, 'opening-price') as calculation_version,
      player.updated_at as created_at
    from chosen player
    where exists(select 1 from event_chain)
    union all
    select
      chain.display_id,
      chain.app_player_id,
      chain.reconstructed_price_minor,
      chain.effective_at,
      chain.reason_category,
      chain.calculation_version,
      chain.created_at
    from event_chain chain
  )
  select case when exists(select 1 from chosen) then jsonb_build_object(
    'season_stats', coalesce((
      select jsonb_agg(jsonb_build_object(
        'season_id', stat.season_id,
        'appearances', stat.appearances,
        'starts', stat.starts,
        'minutes_played', stat.minutes_played,
        'goals', stat.goals,
        'assists', stat.assists,
        'clean_sheets', stat.clean_sheets,
        'yellow_cards', stat.yellow_cards,
        'red_cards', stat.red_cards,
        'average_rating_milli', stat.average_rating_milli,
        'source_through_at', stat.source_through_at,
        'updated_at', stat.updated_at
      ) order by stat.season_id desc)
      from public.player_season_stats stat
      join chosen player on player.id = stat.player_id
    ), '[]'::jsonb),
    'opening_price', (
      select jsonb_build_object(
        'initial_price_minor', player.initial_price_minor,
        'opening_price_method_version', player.opening_price_method_version,
        'opening_price_confidence', player.opening_price_confidence,
        'opening_price_evidence', player.opening_price_evidence
      ) from chosen player
    ),
    'value_history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', history.display_id,
        'player_id', history.app_player_id,
        'value', history.reconstructed_price_minor,
        'recorded_at', history.effective_at,
        'reason_category', history.reason_category,
        'methodology_version', history.calculation_version,
        'created_at', history.created_at
      ) order by history.effective_at, history.display_id)
      from history_rows history
    ), '[]'::jsonb)
  ) else null::jsonb end;
$$;

revoke all on function public.market_public_player_detail_v1(bigint) from public;
grant execute on function public.market_public_player_detail_v1(bigint)
  to anon, authenticated, service_role;

commit;
