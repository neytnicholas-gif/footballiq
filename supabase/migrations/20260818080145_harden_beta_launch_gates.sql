begin;

-- One atomic limiter shared by every serverless instance. Only the service
-- role can read or claim buckets; public clients never receive IP/user hashes.
create table if not exists public.api_rate_limits (
  scope text not null,
  subject_hash text not null,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0),
  updated_at timestamptz not null default now(),
  primary key (scope, subject_hash),
  constraint api_rate_limits_scope_format check (scope ~ '^[a-z0-9-]{2,40}$'),
  constraint api_rate_limits_subject_hash_format check (subject_hash ~ '^[0-9a-f]{64}$')
);

create index if not exists api_rate_limits_updated_at_idx
  on public.api_rate_limits(updated_at);

alter table public.api_rate_limits enable row level security;
revoke all on table public.api_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.api_rate_limits to service_role;

create or replace function public.claim_api_rate_limit(
  p_scope text,
  p_subject_hash text,
  p_limit integer,
  p_window_seconds integer
) returns table (
  allowed boolean,
  remaining integer,
  reset_at timestamptz
)
language plpgsql volatile security definer
set search_path = pg_catalog, public
as $$
declare
  bucket public.api_rate_limits%rowtype;
  current_instant timestamptz := now();
begin
  if p_scope !~ '^[a-z0-9-]{2,40}$'
    or p_subject_hash !~ '^[0-9a-f]{64}$'
    or p_limit not between 1 and 1000
    or p_window_seconds not between 1 and 86400 then
    raise exception 'INVALID_RATE_LIMIT';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('api-rate:' || p_scope || ':' || p_subject_hash, 0));
  insert into public.api_rate_limits(scope, subject_hash, window_started_at, attempts, updated_at)
  values(p_scope, p_subject_hash, current_instant, 0, current_instant)
  on conflict(scope, subject_hash) do nothing;

  select * into bucket
  from public.api_rate_limits
  where scope = p_scope and subject_hash = p_subject_hash
  for update;

  if bucket.window_started_at + make_interval(secs => p_window_seconds) <= current_instant then
    update public.api_rate_limits
    set window_started_at = current_instant, attempts = 1, updated_at = current_instant
    where scope = p_scope and subject_hash = p_subject_hash;
    return query select true, greatest(0, p_limit - 1), current_instant + make_interval(secs => p_window_seconds);
  elsif bucket.attempts >= p_limit then
    update public.api_rate_limits set updated_at = current_instant
    where scope = p_scope and subject_hash = p_subject_hash;
    return query select false, 0, bucket.window_started_at + make_interval(secs => p_window_seconds);
  else
    update public.api_rate_limits
    set attempts = attempts + 1, updated_at = current_instant
    where scope = p_scope and subject_hash = p_subject_hash;
    return query select true, greatest(0, p_limit - bucket.attempts - 1), bucket.window_started_at + make_interval(secs => p_window_seconds);
  end if;
end $$;

revoke all on function public.claim_api_rate_limit(text,text,integer,integer)
  from public, anon, authenticated;
grant execute on function public.claim_api_rate_limit(text,text,integer,integer)
  to service_role;

-- Re-publish only the fields the game UI needs. Provider IDs, source
-- references and residual-bank inputs intentionally never cross this boundary.
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
    coalesce(latest.previous_price_minor, player.current_price_minor),
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
grant execute on function public.market_public_catalogue_v1(text)
  to anon, authenticated, service_role;

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
    )
  ) else null::jsonb end;
$$;

revoke all on function public.market_public_player_detail_v1(bigint) from public;
grant execute on function public.market_public_player_detail_v1(bigint)
  to anon, authenticated, service_role;

-- Sportmonks may revise a rating after full time. Keep the original
-- fixture/player identity, replace only a newer changed provider record, and
-- apply the difference between the old and corrected rolling-form signals.
-- An unchanged retry remains a no-op.
create or replace function public.market_apply_verified_rating_corrections(
  p_gameweek_key text,
  p_updates jsonb
) returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  g public.market_gameweeks;
  item jsonb;
  mp public.market_players;
  existing_stat public.market_player_match_stats;
  incoming_updated_at timestamptz;
  baseline numeric;
  old_rolling numeric;
  new_rolling numeric;
  old_signal integer;
  new_signal integer;
  signal_difference integer;
  bank_before integer;
  bank_after integer;
  available_steps integer;
  applied_steps integer;
  week_movement integer;
  movement integer;
  old_price integer;
  new_price integer;
  latest_rating integer;
  corrected integer := 0;
  skipped integer := 0;
  failed_items jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_updates) is distinct from 'array' then raise exception 'INVALID_UPDATES'; end if;
  select * into g from public.market_gameweeks where gameweek_key = p_gameweek_key for update;
  if g.id is null then
    return jsonb_build_object('corrected_players', 0, 'skipped_corrections', jsonb_array_length(p_updates), 'failed_items', failed_items);
  end if;
  perform pg_advisory_xact_lock(hashtextextended('market-gameweek:' || p_gameweek_key, 0));

  for item in select value from jsonb_array_elements(p_updates) loop
    begin
      mp := null;
      existing_stat := null;
      if length(btrim(coalesce(item->>'provider_player_id', ''))) = 0
        or length(btrim(coalesce(item->>'provider_fixture_id', ''))) = 0
        or coalesce(item->>'rating', '') !~ '^[0-9]+([.][0-9]+)?$'
        or coalesce(item->>'minutes_played', '') !~ '^[0-9]+$' then
        skipped := skipped + 1; continue;
      end if;
      if (item->>'rating')::numeric not between 0 and 10
        or (item->>'minutes_played')::integer not between 1 and 130 then
        skipped := skipped + 1; continue;
      end if;

      select player.* into mp
      from public.market_players player
      where player.provider_player_id = item->>'provider_player_id' and player.is_available
      order by player.updated_at desc limit 1 for update;
      if mp.id is null then skipped := skipped + 1; continue; end if;

      select stat.* into existing_stat
      from public.market_player_match_stats stat
      where stat.player_id = mp.id and stat.provider_fixture_id = item->>'provider_fixture_id'
      for update;
      if existing_stat.id is null then skipped := skipped + 1; continue; end if;

      incoming_updated_at := coalesce((item->>'retrieved_at')::timestamptz, now());
      if incoming_updated_at <= existing_stat.provider_updated_at
        or (
          existing_stat.provider_rating_milli = round((item->>'rating')::numeric * 1000)::integer
          and existing_stat.minutes_played = (item->>'minutes_played')::integer
          and existing_stat.started = coalesce((item->>'started')::boolean, false)
        ) then
        skipped := skipped + 1; continue;
      end if;

      baseline := case mp.position_group when 'GK' then 6.75 when 'DEF' then 6.70 when 'MID' then 6.80 else 6.85 end;
      with ranked as (
        select stat.provider_rating_milli / 1000.0 rating, stat.minutes_played,
          row_number() over(order by stat.fixture_date desc, stat.imported_at desc) rn
        from public.market_player_match_stats stat
        where stat.player_id = mp.id and stat.minutes_played > 0 and stat.provider_rating_milli is not null
        order by stat.fixture_date desc, stat.imported_at desc limit 5
      ), weighted as (
        select rating,
          (case rn when 1 then 1.0 when 2 then 0.82 when 3 then 0.67 when 4 then 0.55 else 0.45 end)
          * greatest(0.25, least(1.0, minutes_played / 90.0)) weight
        from ranked
      ) select sum(rating * weight) / nullif(sum(weight), 0) into old_rolling from weighted;

      update public.market_player_match_stats
      set fixture_date = coalesce((item->>'fixture_date')::timestamptz, fixture_date),
        started = coalesce((item->>'started')::boolean, false),
        minutes_played = (item->>'minutes_played')::integer,
        provider_rating_milli = round((item->>'rating')::numeric * 1000)::integer,
        raw_provider_payload = item,
        provider_updated_at = incoming_updated_at,
        valuation_processed_at = now(),
        gameweek_id = g.id
      where id = existing_stat.id;

      with ranked as (
        select stat.provider_rating_milli / 1000.0 rating, stat.minutes_played,
          row_number() over(order by stat.fixture_date desc, stat.imported_at desc) rn
        from public.market_player_match_stats stat
        where stat.player_id = mp.id and stat.minutes_played > 0 and stat.provider_rating_milli is not null
        order by stat.fixture_date desc, stat.imported_at desc limit 5
      ), weighted as (
        select rating,
          (case rn when 1 then 1.0 when 2 then 0.82 when 3 then 0.67 when 4 then 0.55 else 0.45 end)
          * greatest(0.25, least(1.0, minutes_played / 90.0)) weight
        from ranked
      ) select sum(rating * weight) / nullif(sum(weight), 0) into new_rolling from weighted;

      old_signal := greatest(-660, least(660, round((old_rolling - baseline) * 1000)::integer));
      new_signal := greatest(-660, least(660, round((new_rolling - baseline) * 1000)::integer));
      signal_difference := new_signal - old_signal;
      bank_before := mp.performance_bank_milli + signal_difference;
      available_steps := trunc(bank_before / 220.0)::integer;
      movement := greatest(-300000, least(300000, available_steps * 100000));
      select coalesce(sum(event.price_change_minor), 0) into week_movement
      from public.market_valuation_events event
      join public.market_player_match_stats stat on stat.id = event.match_stat_id
      where event.player_id = mp.id and stat.gameweek_id = g.id;
      movement := case when movement > 0
        then least(movement, greatest(0, 600000 - greatest(0, week_movement)))
        else greatest(movement, -greatest(0, 600000 - greatest(0, -week_movement))) end;
      old_price := mp.current_price_minor;
      new_price := greatest(4000000, least(15000000, old_price + movement));
      movement := new_price - old_price;
      applied_steps := trunc(movement / 100000.0)::integer;
      bank_after := bank_before - (applied_steps * 220);

      insert into public.market_valuation_events(
        player_id, match_stat_id, event_type, previous_price_minor, new_price_minor,
        previous_bank_milli, rating_milli, baseline_rating_milli, rating_delta_milli,
        bank_after_event_milli, price_change_minor, reason, calculation_version,
        effective_at, idempotency_key
      ) values (
        mp.id, existing_stat.id, 'verified_rating_correction', old_price, new_price,
        mp.performance_bank_milli, round(new_rolling * 1000)::integer, round(baseline * 1000)::integer,
        new_signal, bank_after, movement,
        'Newer Sportmonks correction replaced the prior fixture rating; only the rolling-signal difference was applied',
        'fiq-real-performance-v2.2.0', incoming_updated_at,
        'sportmonks-correction:' || (item->>'provider_fixture_id') || ':' || (item->>'provider_player_id') || ':' ||
          round((item->>'rating')::numeric * 1000)::text || ':' || (item->>'minutes_played')
      );

      select stat.provider_rating_milli into latest_rating
      from public.market_player_match_stats stat
      where stat.player_id = mp.id
      order by stat.fixture_date desc, stat.imported_at desc limit 1;
      update public.market_players
      set current_price_minor = new_price,
        performance_bank_milli = bank_after,
        latest_rating_milli = latest_rating,
        data_updated_at = now(),
        updated_at = now()
      where id = mp.id;
      corrected := corrected + 1;
    exception when unique_violation then
      skipped := skipped + 1;
    when others then
      skipped := skipped + 1;
      failed_items := failed_items || jsonb_build_array(jsonb_build_object(
        'provider_player_id', left(coalesce(item->>'provider_player_id', 'unknown'), 80),
        'provider_fixture_id', left(coalesce(item->>'provider_fixture_id', 'unknown'), 80),
        'sqlstate', sqlstate,
        'message', left(sqlerrm, 240)
      ));
    end;
  end loop;

  if corrected > 0 then
    update public.market_holdings holding
    set current_value_minor = player.current_price_minor,
      unrealised_profit_minor = player.current_price_minor - holding.purchase_price_minor,
      updated_at = now()
    from public.market_players player
    where player.id = holding.player_id;

    with totals as (
      select portfolio.id,
        coalesce(sum(holding.current_value_minor), 0)::integer holdings_total,
        coalesce(sum(holding.unrealised_profit_minor), 0)::integer unrealised_total
      from public.market_portfolios portfolio
      left join public.market_holdings holding on holding.portfolio_id = portfolio.id
      group by portfolio.id
    ) update public.market_portfolios portfolio
    set current_holdings_value_minor = totals.holdings_total,
      total_portfolio_value_minor = portfolio.cash_balance_minor + totals.holdings_total,
      unrealised_profit_minor = totals.unrealised_total,
      updated_at = now()
    from totals where totals.id = portfolio.id;

    update public.market_gameweek_reveals reveal
    set new_portfolio_value_minor = portfolio.total_portfolio_value_minor,
      cash_after_minor = portfolio.cash_balance_minor,
      invested_after_minor = portfolio.current_holdings_value_minor,
      weekly_change_minor = portfolio.total_portfolio_value_minor - reveal.previous_portfolio_value_minor,
      holding_movements = coalesce((
        select jsonb_agg(jsonb_build_object(
          'player_id', player.app_player_id,
          'player_name', player.display_name,
          'position', player.position_group,
          'purchase_price', holding.purchase_price_minor,
          'previous_value', coalesce(first_event.previous_price_minor, player.current_price_minor),
          'current_value', player.current_price_minor,
          'delta', player.current_price_minor - coalesce(first_event.previous_price_minor, player.current_price_minor),
          'return_pct', round(((player.current_price_minor - holding.purchase_price_minor)::numeric / nullif(holding.purchase_price_minor, 0)) * 100, 2),
          'explanation', 'Verified ratings and any later provider correction updated this value.'
        ) order by player.display_name)
        from public.market_holdings holding
        join public.market_players player on player.id = holding.player_id
        left join lateral (
          select event.previous_price_minor
          from public.market_valuation_events event
          join public.market_player_match_stats stat on stat.id = event.match_stat_id
          where event.player_id = player.id and stat.gameweek_id = g.id
          order by event.effective_at asc, event.created_at asc limit 1
        ) first_event on true
        where holding.portfolio_id = portfolio.id
      ), '[]'::jsonb),
      created_at = now()
    from public.market_portfolios portfolio
    where reveal.portfolio_id = portfolio.id and reveal.gameweek_id = g.id;
  end if;

  return jsonb_build_object(
    'corrected_players', corrected,
    'skipped_corrections', skipped,
    'failed_items', failed_items
  );
end $$;

revoke all on function public.market_apply_verified_rating_corrections(text,jsonb)
  from public, anon, authenticated;
grant execute on function public.market_apply_verified_rating_corrections(text,jsonb)
  to service_role;

commit;
