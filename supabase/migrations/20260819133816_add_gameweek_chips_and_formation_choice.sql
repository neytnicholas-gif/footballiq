begin;

-- Formations are a squad-building choice. The balanced 4-4-2 is available to
-- everybody; the more attacking 3-4-3 remains a permanent Clubhouse reward.
alter table public.market_profile_preferences
  drop constraint if exists market_profile_preferences_active_formation_check;
alter table public.market_profile_preferences
  add constraint market_profile_preferences_active_formation_check
  check (active_formation in ('4-3-3', '4-4-2', '3-4-3'));

create or replace function public.market_position_limit(p_user_id uuid, p_position text)
returns integer
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case coalesce(
    (select active_formation from public.market_profile_preferences where user_id = p_user_id),
    '4-3-3'
  )
    when '4-4-2' then case p_position when 'GK' then 1 when 'DEF' then 4 when 'MID' then 4 when 'FWD' then 2 else 0 end
    when '3-4-3' then case p_position when 'GK' then 1 when 'DEF' then 3 when 'MID' then 4 when 'FWD' then 3 else 0 end
    else case p_position when 'GK' then 1 when 'DEF' then 4 when 'MID' then 3 when 'FWD' then 3 else 0 end
  end;
$$;

create or replace function public.market_set_formation(p_formation text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  pid uuid;
  position_row record;
  position_limit integer;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_formation not in ('4-3-3', '4-4-2', '3-4-3') then raise exception 'FORMATION_UNKNOWN'; end if;
  if p_formation = '3-4-3' and not exists (
    select 1 from public.market_user_items where user_id = uid and item_key = 'formation_343'
  ) then raise exception 'FORMATION_NOT_UNLOCKED'; end if;

  perform pg_advisory_xact_lock(hashtextextended('market-formation:' || uid::text, 0));
  select p.id into pid
  from public.market_portfolios p
  join public.market_settings settings on settings.active_season_id = p.season_id and settings.id = 1
  where p.user_id = uid
  limit 1;

  if pid is not null then
    for position_row in
      select player.position_group, count(*)::integer as player_count
      from public.market_holdings holding
      join public.market_players player on player.id = holding.player_id
      where holding.portfolio_id = pid
      group by player.position_group
    loop
      position_limit := case p_formation
        when '4-4-2' then case position_row.position_group when 'GK' then 1 when 'DEF' then 4 when 'MID' then 4 when 'FWD' then 2 else 0 end
        when '3-4-3' then case position_row.position_group when 'GK' then 1 when 'DEF' then 3 when 'MID' then 4 when 'FWD' then 3 else 0 end
        else case position_row.position_group when 'GK' then 1 when 'DEF' then 4 when 'MID' then 3 when 'FWD' then 3 else 0 end
      end;
      if position_row.player_count > position_limit then
        raise exception 'FORMATION_SQUAD_CONFLICT:%:%', position_row.position_group, position_limit;
      end if;
    end loop;
  end if;

  insert into public.market_profile_preferences(user_id, active_formation)
  values(uid, p_formation)
  on conflict(user_id) do update
    set active_formation = excluded.active_formation, updated_at = now();

  return jsonb_build_object('ok', true, 'active_formation', p_formation);
end;
$$;

revoke all on function public.market_position_limit(uuid, text), public.market_set_formation(text)
  from public, anon;
grant execute on function public.market_position_limit(uuid, text) to service_role;
grant execute on function public.market_set_formation(text) to authenticated;
alter function public.market_set_formation(text) set statement_timeout = '3s';
alter function public.market_set_formation(text) set lock_timeout = '2s';

-- One durable chip choice per portfolio and transfer gameweek. Target holding
-- IDs freeze the exact copies that were in the roster when the chip was played.
create table if not exists public.market_gameweek_chip_plays (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.market_portfolios(id) on delete cascade,
  transfer_gameweek_id uuid not null references public.market_gameweeks(id) on delete restrict,
  chip_key text not null check (chip_key in ('triple_shout', 'power_pair', 'position_pulse', 'full_xi_surge', 'lockdown')),
  target_holding_ids uuid[] not null check (cardinality(target_holding_ids) between 1 and 11),
  target_snapshot jsonb not null check (jsonb_typeof(target_snapshot) = 'array'),
  target_position text check (target_position is null or target_position in ('DEF', 'MID', 'FWD')),
  state text not null default 'armed' check (state in ('armed', 'applied', 'void')),
  deadline_at timestamptz not null,
  activated_at timestamptz not null default now(),
  first_applied_at timestamptz,
  last_applied_at timestamptz,
  total_adjustment_minor integer not null default 0,
  unique (portfolio_id, transfer_gameweek_id)
);

create index if not exists market_gameweek_chip_plays_week_idx
  on public.market_gameweek_chip_plays(transfer_gameweek_id, portfolio_id);

create table if not exists public.market_holding_value_adjustments (
  id uuid primary key default gen_random_uuid(),
  chip_play_id uuid not null references public.market_gameweek_chip_plays(id) on delete cascade,
  -- Kept as an immutable identifier rather than a cascading foreign key so a
  -- completed chip remains auditable after the manager sells that held copy.
  holding_id uuid not null,
  valuation_event_id uuid not null references public.market_valuation_events(id) on delete restrict,
  base_movement_minor integer not null,
  multiplier_basis_points integer not null check (multiplier_basis_points between 0 and 30000),
  adjustment_minor integer not null,
  created_at timestamptz not null default now(),
  unique (chip_play_id, holding_id, valuation_event_id)
);

create index if not exists market_holding_value_adjustments_holding_idx
  on public.market_holding_value_adjustments(holding_id, created_at);
create index if not exists market_holding_value_adjustments_event_idx
  on public.market_holding_value_adjustments(valuation_event_id, holding_id);

alter table public.market_gameweek_chip_plays enable row level security;
alter table public.market_holding_value_adjustments enable row level security;

revoke all on table public.market_gameweek_chip_plays from public, anon, authenticated;
revoke all on table public.market_holding_value_adjustments from public, anon, authenticated;
grant select on table public.market_gameweek_chip_plays to authenticated;
grant all on table public.market_gameweek_chip_plays, public.market_holding_value_adjustments to service_role;

drop policy if exists market_gameweek_chip_plays_owner_read on public.market_gameweek_chip_plays;
create policy market_gameweek_chip_plays_owner_read
on public.market_gameweek_chip_plays for select to authenticated
using (exists (
  select 1 from public.market_portfolios portfolio
  where portfolio.id = portfolio_id and portfolio.user_id = (select auth.uid())
));

create or replace function public.market_gameweek_chip_deadline(p_transfer_gameweek_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with transfer_week as (
    select * from public.market_gameweeks
    where id = p_transfer_gameweek_id and gameweek_type = 'transfer'
  ), tracked_fixtures as (
    select fixture.kickoff_at
    from transfer_week week
    join public.prediction_fixtures fixture
      on fixture.kickoff_at >= week.opens_at and fixture.kickoff_at < week.closes_at
    where fixture.status not in ('postponed', 'cancelled')
      and exists (
        select 1
        from public.market_clubs club
        join public.market_players player on player.club_id = club.id and player.is_available
        where club.provider_club_id in (fixture.home_provider_team_id, fixture.away_provider_team_id)
      )
  ), safe_fallback as (
    -- Fixture sync should normally win. If it has not run yet, close chips at
    -- 17:00 Brussels time on Friday rather than leaving a weekend loophole.
    select least(
      closes_at,
      (date_trunc('week', opens_at at time zone 'Europe/Brussels') + interval '4 days 17 hours')
        at time zone 'Europe/Brussels'
    ) as deadline_at
    from transfer_week
  )
  select least(
    (select closes_at from transfer_week),
    coalesce((select min(kickoff_at) from tracked_fixtures), (select deadline_at from safe_fallback))
  );
$$;

create or replace function public.market_my_gameweek_chip()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  g public.market_gameweeks;
  p public.market_portfolios;
  play public.market_gameweek_chip_plays;
  deadline timestamptz;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into g from public.market_ensure_current_gameweek();
  deadline := public.market_gameweek_chip_deadline(g.id);
  select portfolio.* into p
  from public.market_portfolios portfolio
  join public.market_settings settings on settings.active_season_id = portfolio.season_id and settings.id = 1
  where portfolio.user_id = uid
  limit 1;

  if p.id is not null then
    select * into play from public.market_gameweek_chip_plays
    where portfolio_id = p.id and transfer_gameweek_id = g.id;
  end if;

  return jsonb_build_object(
    'gameweek_id', g.id,
    'gameweek_key', g.gameweek_key,
    'label', g.label,
    'deadline_at', deadline,
    'can_play', play.id is null and g.state in ('open', 'revealed') and now() < deadline,
    'chip_used', play.id is not null,
    'active_chip', case when play.id is null then null else jsonb_build_object(
      'id', play.id,
      'chip_key', play.chip_key,
      'target_position', play.target_position,
      'targets', play.target_snapshot,
      'state', play.state,
      'activated_at', play.activated_at,
      'first_applied_at', play.first_applied_at,
      'total_adjustment_minor', play.total_adjustment_minor
    ) end
  );
end;
$$;

create or replace function public.market_play_gameweek_chip(
  p_chip_key text,
  p_target_player_ids bigint[] default null,
  p_target_position text default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  g public.market_gameweeks;
  p public.market_portfolios;
  deadline timestamptz;
  target_ids uuid[];
  target_snapshot jsonb := '[]'::jsonb;
  requested_count integer := coalesce(cardinality(p_target_player_ids), 0);
  resolved_count integer := 0;
  distinct_count integer := 0;
  total_holdings integer := 0;
  formation text := '4-3-3';
  position_row record;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_chip_key not in ('triple_shout', 'power_pair', 'position_pulse', 'full_xi_surge', 'lockdown') then
    raise exception 'CHIP_UNKNOWN';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('market-chip:' || uid::text, 0));
  select * into g from public.market_ensure_current_gameweek();
  deadline := public.market_gameweek_chip_deadline(g.id);
  if g.state not in ('open', 'revealed') then raise exception 'CHIP_GAMEWEEK_LOCKED'; end if;
  if now() >= deadline then raise exception 'CHIP_DEADLINE_PASSED'; end if;

  select portfolio.* into p
  from public.market_portfolios portfolio
  join public.market_settings settings on settings.active_season_id = portfolio.season_id and settings.id = 1
  where portfolio.user_id = uid
  for update of portfolio;
  if p.id is null then raise exception 'PORTFOLIO_NOT_FOUND'; end if;
  if exists (
    select 1 from public.market_gameweek_chip_plays
    where portfolio_id = p.id and transfer_gameweek_id = g.id
  ) then raise exception 'CHIP_ALREADY_PLAYED'; end if;

  if p_chip_key in ('triple_shout', 'power_pair', 'lockdown') then
    if p_target_position is not null then raise exception 'CHIP_TARGET_INVALID'; end if;
    if (p_chip_key = 'triple_shout' and requested_count <> 1)
      or (p_chip_key in ('power_pair', 'lockdown') and requested_count <> 2) then
      raise exception 'CHIP_TARGET_COUNT';
    end if;

    select array_agg(holding.id order by requested.ordinality), count(*)::integer,
      count(distinct holding.id)::integer
    into target_ids, resolved_count, distinct_count
    from unnest(p_target_player_ids) with ordinality requested(app_player_id, ordinality)
    join public.market_players player on player.app_player_id = requested.app_player_id
    join public.market_holdings holding on holding.player_id = player.id and holding.portfolio_id = p.id;
    if resolved_count <> requested_count or distinct_count <> requested_count then raise exception 'CHIP_TARGET_NOT_OWNED'; end if;

  elsif p_chip_key = 'position_pulse' then
    if p_target_position not in ('DEF', 'MID', 'FWD') or requested_count <> 0 then raise exception 'CHIP_POSITION_INVALID'; end if;
    select array_agg(holding.id order by holding.purchased_at), count(*)::integer
    into target_ids, resolved_count
    from public.market_holdings holding
    join public.market_players player on player.id = holding.player_id
    where holding.portfolio_id = p.id and player.position_group = p_target_position;
    if resolved_count = 0 then raise exception 'CHIP_POSITION_EMPTY'; end if;

  else
    if requested_count <> 0 or p_target_position is not null then raise exception 'CHIP_TARGET_INVALID'; end if;
    select coalesce(preference.active_formation, '4-3-3') into formation
    from (select uid as user_id) source
    left join public.market_profile_preferences preference on preference.user_id = source.user_id;
    select array_agg(holding.id order by player.position_group, holding.purchased_at), count(*)::integer
    into target_ids, total_holdings
    from public.market_holdings holding
    join public.market_players player on player.id = holding.player_id
    where holding.portfolio_id = p.id;
    if total_holdings <> 11 then raise exception 'CHIP_FULL_XI_REQUIRED'; end if;
    for position_row in
      select player.position_group, count(*)::integer as player_count
      from public.market_holdings holding
      join public.market_players player on player.id = holding.player_id
      where holding.portfolio_id = p.id
      group by player.position_group
    loop
      if position_row.player_count <> public.market_position_limit(uid, position_row.position_group) then
        raise exception 'CHIP_VALID_FORMATION_REQUIRED';
      end if;
    end loop;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'holding_id', holding.id,
    'player_id', player.app_player_id,
    'player_name', player.display_name,
    'position', player.position_group
  ) order by target.ordinality), '[]'::jsonb)
  into target_snapshot
  from unnest(target_ids) with ordinality target(holding_id, ordinality)
  join public.market_holdings holding on holding.id = target.holding_id
  join public.market_players player on player.id = holding.player_id;

  if jsonb_array_length(target_snapshot) <> cardinality(target_ids) then
    raise exception 'CHIP_TARGET_NOT_OWNED';
  end if;

  insert into public.market_gameweek_chip_plays(
    portfolio_id, transfer_gameweek_id, chip_key, target_holding_ids, target_snapshot, target_position, deadline_at
  ) values (
    p.id, g.id, p_chip_key, target_ids, target_snapshot,
    case when p_chip_key = 'position_pulse' then p_target_position else null end,
    deadline
  );

  return public.market_my_gameweek_chip();
end;
$$;

revoke all on function public.market_gameweek_chip_deadline(uuid), public.market_my_gameweek_chip(),
  public.market_play_gameweek_chip(text, bigint[], text) from public, anon, authenticated;
grant execute on function public.market_my_gameweek_chip(), public.market_play_gameweek_chip(text, bigint[], text)
  to authenticated;
grant execute on function public.market_gameweek_chip_deadline(uuid) to service_role;
alter function public.market_my_gameweek_chip() set statement_timeout = '4s';
alter function public.market_play_gameweek_chip(text, bigint[], text) set statement_timeout = '5s';
alter function public.market_play_gameweek_chip(text, bigint[], text) set lock_timeout = '2s';

-- Convert each verified public price movement into a private, immutable holding
-- adjustment. The public market price is never changed by this trigger.
create or replace function public.market_record_gameweek_chip_adjustment()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target record;
  multiplier integer;
  adjustment integer;
begin
  for target in
    select play.id as chip_play_id, play.chip_key, holding.id as holding_id
    from public.market_gameweek_chip_plays play
    join public.market_gameweeks transfer_week on transfer_week.id = play.transfer_gameweek_id
    join public.market_holdings holding
      on holding.portfolio_id = play.portfolio_id
     and holding.player_id = new.player_id
     and holding.id = any(play.target_holding_ids)
    where play.state in ('armed', 'applied')
      and date_trunc('week', transfer_week.opens_at at time zone 'Europe/Brussels')
        = date_trunc('week', new.effective_at at time zone 'Europe/Brussels')
  loop
    multiplier := case target.chip_key
      when 'triple_shout' then 30000
      when 'power_pair' then 20000
      when 'position_pulse' then 15000
      when 'full_xi_surge' then 12000
      when 'lockdown' then 0
      else 10000
    end;
    adjustment := round(new.price_change_minor::numeric * (multiplier - 10000) / 10000)::integer;

    insert into public.market_holding_value_adjustments(
      chip_play_id, holding_id, valuation_event_id, base_movement_minor,
      multiplier_basis_points, adjustment_minor
    ) values (
      target.chip_play_id, target.holding_id, new.id, new.price_change_minor,
      multiplier, adjustment
    ) on conflict (chip_play_id, holding_id, valuation_event_id) do nothing;

    if found then
      update public.market_gameweek_chip_plays
      set state = 'applied',
        first_applied_at = coalesce(first_applied_at, now()),
        last_applied_at = now(),
        total_adjustment_minor = total_adjustment_minor + adjustment
      where id = target.chip_play_id;
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists market_record_gameweek_chip_adjustment_trigger on public.market_valuation_events;
create trigger market_record_gameweek_chip_adjustment_trigger
after insert on public.market_valuation_events
for each row execute function public.market_record_gameweek_chip_adjustment();

revoke all on function public.market_record_gameweek_chip_adjustment()
  from public, anon, authenticated;

-- Settlement functions intentionally reset every holding to the public price.
-- Intercept only that reset and add the durable, holding-specific chip ledger.
create or replace function public.market_preserve_holding_value_adjustments()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  public_price integer;
  durable_adjustment integer;
begin
  select player.current_price_minor into public_price
  from public.market_players player where player.id = new.player_id;
  if new.current_value_minor = public_price then
    select coalesce(sum(entry.adjustment_minor), 0)::integer into durable_adjustment
    from public.market_holding_value_adjustments entry
    where entry.holding_id = new.id;
    new.current_value_minor := greatest(0, public_price + durable_adjustment);
    new.unrealised_profit_minor := new.current_value_minor - new.purchase_price_minor;
  end if;
  return new;
end;
$$;

drop trigger if exists market_preserve_holding_value_adjustments_trigger on public.market_holdings;
create trigger market_preserve_holding_value_adjustments_trigger
before update of current_value_minor on public.market_holdings
for each row execute function public.market_preserve_holding_value_adjustments();

revoke all on function public.market_preserve_holding_value_adjustments()
  from public, anon, authenticated;

-- Reveal cards must show the manager's held value, not the public buy price.
create or replace function public.market_enrich_gameweek_reveal()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  select coalesce(jsonb_agg(jsonb_build_object(
    'player_id', movement.app_player_id,
    'player_name', movement.display_name,
    'position', movement.position_group,
    'purchase_price', movement.purchase_price_minor,
    'previous_value', movement.current_value_minor - movement.base_movement - movement.chip_adjustment,
    'current_value', movement.current_value_minor,
    'delta', movement.base_movement + movement.chip_adjustment,
    'market_delta', movement.base_movement,
    'chip_adjustment', movement.chip_adjustment,
    'chip_key', movement.chip_key,
    'return_pct', round(((movement.current_value_minor - movement.purchase_price_minor)::numeric
      / nullif(movement.purchase_price_minor, 0)) * 100, 2),
    'explanation', case when movement.chip_adjustment <> 0
      then 'Verified ratings moved the public price, then your weekly chip changed only this held copy.'
      else 'Verified ratings updated this value using five-match rolling form and banked residual movement.' end
  ) order by movement.display_name), '[]'::jsonb)
  into new.holding_movements
  from (
    select holding.id, holding.purchase_price_minor, holding.current_value_minor,
      player.app_player_id, player.display_name, player.position_group,
      coalesce((
        select sum(event.price_change_minor)::integer
        from public.market_valuation_events event
        join public.market_player_match_stats stat on stat.id = event.match_stat_id
        where event.player_id = player.id and stat.gameweek_id = new.gameweek_id
          and event.created_at >= holding.purchased_at
      ), 0) as base_movement,
      coalesce((
        select sum(entry.adjustment_minor)::integer
        from public.market_holding_value_adjustments entry
        join public.market_valuation_events event on event.id = entry.valuation_event_id
        join public.market_player_match_stats stat on stat.id = event.match_stat_id
        where entry.holding_id = holding.id and stat.gameweek_id = new.gameweek_id
      ), 0) as chip_adjustment,
      (
        select play.chip_key
        from public.market_holding_value_adjustments entry
        join public.market_gameweek_chip_plays play on play.id = entry.chip_play_id
        join public.market_valuation_events event on event.id = entry.valuation_event_id
        join public.market_player_match_stats stat on stat.id = event.match_stat_id
        where entry.holding_id = holding.id and stat.gameweek_id = new.gameweek_id
        order by entry.created_at desc limit 1
      ) as chip_key
    from public.market_holdings holding
    join public.market_players player on player.id = holding.player_id
    where holding.portfolio_id = new.portfolio_id
  ) movement;
  return new;
end;
$$;

drop trigger if exists market_enrich_gameweek_reveal_trigger on public.market_gameweek_reveals;
create trigger market_enrich_gameweek_reveal_trigger
before insert or update of holding_movements on public.market_gameweek_reveals
for each row execute function public.market_enrich_gameweek_reveal();

revoke all on function public.market_enrich_gameweek_reveal()
  from public, anon, authenticated;

-- The app snapshot now reads the held copy's value. Cash and future purchase
-- prices still come from the ordinary public market ledger.
create or replace function public.market_app_portfolio_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  s public.market_settings;
  p public.market_portfolios;
  live_holdings integer := 0;
  live_unrealised integer := 0;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into s from public.market_settings where id = 1;
  select * into p from public.market_portfolios where user_id = uid and season_id = s.active_season_id;
  if p.id is not null then
    select coalesce(sum(h.current_value_minor), 0)::integer,
      coalesce(sum(h.unrealised_profit_minor), 0)::integer
    into live_holdings, live_unrealised
    from public.market_holdings h where h.portfolio_id = p.id;
  end if;
  return jsonb_build_object(
    'portfolio', case when p.id is null then null else jsonb_build_object(
      'user_id', uid, 'available_balance', p.cash_balance_minor,
      'starting_balance', p.starting_balance_minor,
      'portfolio_value', live_holdings,
      'total_account_value', p.cash_balance_minor + live_holdings,
      'realized_profit_loss', p.realised_profit_minor,
      'created_at', p.created_at, 'updated_at', p.updated_at
    ) end,
    'holdings', coalesce((select jsonb_agg(jsonb_build_object(
      'id', abs(hashtextextended(h.id::text, 0)) % 2147483647,
      'user_id', uid, 'player_id', mp.app_player_id,
      'acquisition_value', h.purchase_price_minor, 'acquired_at', h.purchased_at,
      'current_value_snapshot', h.current_value_minor,
      'unrealized_profit_loss', h.unrealised_profit_minor
    ) order by h.purchased_at)
      from public.market_holdings h
      join public.market_players mp on mp.id = h.player_id
      where h.portfolio_id = p.id), '[]'::jsonb),
    'transactions', coalesce((select jsonb_agg(jsonb_build_object(
      'id', abs(hashtextextended(recent.id::text, 0)) % 2147483647,
      'transaction_id', recent.id, 'user_id', uid,
      'player_id', recent.app_player_id, 'transaction_type', recent.transaction_type,
      'execution_value', recent.executed_price_minor,
      'balance_before', recent.balance_before_minor, 'balance_after', recent.balance_after_minor,
      'created_at', recent.created_at,
      'trade_date_utc', (recent.created_at at time zone 'UTC')::date,
      'idempotency_key', recent.idempotency_key
    ) order by recent.created_at desc)
      from (
        select t.*, mp.app_player_id
        from public.market_transactions t
        join public.market_players mp on mp.id = t.player_id
        where t.portfolio_id = p.id
        order by t.created_at desc
        limit 30
      ) recent), '[]'::jsonb),
    'watchlist', coalesce((select jsonb_agg(mp.app_player_id)
      from public.market_watchlist w
      join public.market_players mp on mp.id = w.player_id
      where w.user_id = uid), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.market_app_portfolio_snapshot() from public, anon;
grant execute on function public.market_app_portfolio_snapshot() to authenticated;

-- A chip belongs to a held copy, so a sale settles that copy's personalised
-- value. The public market price remains unchanged for every future buyer.
create or replace function public.market_sell_player(p_player_slug text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); s public.market_settings; p public.market_portfolios; player public.market_players;
  holding public.market_holdings; tx public.market_transactions; player_locked boolean; sale_price integer;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(btrim(coalesce(p_idempotency_key,'')))=0 then raise exception 'IDEMPOTENCY_KEY_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  select * into s from public.market_settings where id=1 for share;
  select * into p from public.market_portfolios where user_id=uid and season_id=s.active_season_id for update;
  if not found then raise exception 'PORTFOLIO_NOT_FOUND'; end if;
  select mp.* into player from public.market_players mp join public.market_active_catalogues ac on ac.catalogue_id=mp.catalogue_id and ac.season_id=mp.season_id
    where (mp.slug=p_player_slug or mp.app_player_id::text=p_player_slug) order by (mp.app_player_id::text=p_player_slug) desc,mp.updated_at desc limit 1 for update of mp;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
  select * into tx from public.market_transactions t where t.idempotency_key=p_idempotency_key and t.portfolio_id=p.id;
  if found then return jsonb_build_object('ok',true,'message','Sale already executed','transaction_id',tx.id,'player_slug',player.slug,'execution_value',tx.executed_price_minor); end if;
  select lock_state.is_locked into player_locked from public.market_player_trade_lock(player.id) lock_state;
  if coalesce(player_locked,false) then raise exception 'PLAYER_TRADE_LOCKED'; end if;
  select * into holding from public.market_holdings where portfolio_id=p.id and player_id=player.id for update;
  if not found then raise exception 'NOT_OWNED'; end if;
  sale_price:=holding.current_value_minor;
  if sale_price is null or sale_price<0 then raise exception 'HOLDING_VALUE_INVALID'; end if;
  perform public.market_record_gameweek_trade(p.id,'sell');
  delete from public.market_holdings where id=holding.id;
  update public.market_portfolios set cash_balance_minor=cash_balance_minor+sale_price,
    realised_profit_minor=realised_profit_minor+(sale_price-holding.purchase_price_minor) where id=p.id;
  insert into public.market_transactions(portfolio_id,player_id,transaction_type,executed_price_minor,balance_before_minor,balance_after_minor,
    holding_value_before_minor,holding_value_after_minor,idempotency_key)
  values(p.id,player.id,'sell',sale_price,p.cash_balance_minor,p.cash_balance_minor+sale_price,holding.current_value_minor,0,p_idempotency_key)
  returning * into tx;
  perform public.market_recalculate_portfolio_totals(p.id);
  perform public.market_refresh_my_progression();
  return jsonb_build_object('ok',true,'message','Sale executed at your held value','transaction_id',tx.id,'player_slug',player.slug,
    'execution_value',tx.executed_price_minor,'public_market_value',player.current_price_minor);
end $$;

revoke all on function public.market_sell_player(text,text) from public,anon;
grant execute on function public.market_sell_player(text,text) to authenticated;
alter function public.market_sell_player(text,text) set statement_timeout='5s';
alter function public.market_sell_player(text,text) set lock_timeout='2s';

comment on table public.market_gameweek_chip_plays is
  'One immutable weekly chip selection per manager; targets are held copies, never public market prices.';
comment on table public.market_holding_value_adjustments is
  'Append-only private valuation adjustments created from verified public valuation events.';
comment on function public.market_play_gameweek_chip(text, bigint[], text) is
  'Arms exactly one balanced gameweek chip before the first tracked fixture kickoff.';
comment on function public.market_app_portfolio_snapshot() is
  'Returns one users authoritative held-copy values and at most 30 recent transactions.';
comment on function public.market_sell_player(text, text) is
  'Settles a managers held-copy value without changing the public price used by future buyers.';

commit;
