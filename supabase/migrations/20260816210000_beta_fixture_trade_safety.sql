begin;

-- The public beta starts on 17 August 2026. Results before this instant are
-- useful provider evidence, but they must not move prices in a game that users
-- could not yet play. Keep this value in the database so every unattended run
-- and every trade uses the same launch boundary.
alter table public.market_settings
  add column if not exists valuation_eligible_from timestamptz;

update public.market_settings
set valuation_eligible_from = timestamptz '2026-08-17 00:00:00+00',
    updated_at = now()
where id = 1
  and valuation_eligible_from is null;

alter table public.market_settings
  alter column valuation_eligible_from set default timestamptz '2026-08-17 00:00:00+00';
alter table public.market_settings
  alter column valuation_eligible_from set not null;

comment on column public.market_settings.valuation_eligible_from is
  'Earliest fixture kickoff allowed to affect Early Shout game prices.';

-- Sportmonks participant IDs give the trading guard a stable club identity.
-- Names remain presentation-only and are never used to decide whether a trade
-- is permitted.
alter table public.prediction_fixtures
  add column if not exists home_provider_team_id text;
alter table public.prediction_fixtures
  add column if not exists away_provider_team_id text;

create index if not exists prediction_fixtures_home_team_kickoff_idx
  on public.prediction_fixtures(home_provider_team_id, kickoff_at desc)
  where home_provider_team_id is not null;
create index if not exists prediction_fixtures_away_team_kickoff_idx
  on public.prediction_fixtures(away_provider_team_id, kickoff_at desc)
  where away_provider_team_id is not null;

-- A fixture is settled only after its completed result has been checked and
-- every eligible player row has been handled successfully. This is the durable
-- release switch for the affected clubs; retries upsert the same fixture.
create table if not exists public.market_fixture_settlements (
  provider_fixture_id text primary key,
  kickoff_at timestamptz not null,
  gameweek_id uuid references public.market_gameweeks(id) on delete set null,
  status text not null default 'processed' check (status in ('processed')),
  processed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists market_fixture_settlements_processed_idx
  on public.market_fixture_settlements(processed_at desc);

alter table public.market_fixture_settlements enable row level security;
revoke all on table public.market_fixture_settlements from public, anon, authenticated;
grant all on table public.market_fixture_settlements to service_role;

-- Return one fail-closed lock decision for a player. A club locks at kickoff
-- and remains locked until the fixture settlement is durably recorded. A
-- postponed or cancelled match does not lock trading.
create or replace function public.market_player_trade_lock(
  p_player_id uuid,
  p_at timestamptz default now()
) returns table (
  is_locked boolean,
  lock_reason text,
  lock_started_at timestamptz,
  lock_ends_at timestamptz
)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  with player_club as (
    select club.provider_club_id
    from public.market_players player
    join public.market_clubs club on club.id = player.club_id
    where player.id = p_player_id
    limit 1
  ), pending_fixture as (
    select candidate.fixture_id, candidate.kickoff_at
    from (
      select fixture.fixture_id, fixture.kickoff_at, fixture.status
      from player_club club
      join public.prediction_fixtures fixture
        on fixture.home_provider_team_id = club.provider_club_id
      union all
      select fixture.fixture_id, fixture.kickoff_at, fixture.status
      from player_club club
      join public.prediction_fixtures fixture
        on fixture.away_provider_team_id = club.provider_club_id
    ) candidate
    cross join public.market_settings settings
    left join public.market_fixture_settlements settlement
      on settlement.provider_fixture_id = candidate.fixture_id
    where settings.id = 1
      and candidate.kickoff_at >= settings.valuation_eligible_from
      and candidate.kickoff_at <= p_at
      and candidate.status not in ('postponed', 'cancelled')
      and settlement.processed_at is null
    order by candidate.kickoff_at desc
    limit 1
  )
  select exists(select 1 from pending_fixture),
    case when exists(select 1 from pending_fixture)
      then 'Match in progress or result awaiting price update'
      else null end,
    (select kickoff_at from pending_fixture),
    null::timestamptz;
$$;

revoke all on function public.market_player_trade_lock(uuid,timestamptz)
  from public, anon, authenticated;
grant execute on function public.market_player_trade_lock(uuid,timestamptz)
  to service_role;

-- Keep formation, weekly allowance, idempotency and fixture protection in the
-- same transaction. An exact retry is returned before a newly-started fixture
-- is considered, so a client never receives a false failure for a committed
-- trade whose response was lost.
create or replace function public.market_buy_player(p_player_slug text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); s public.market_settings; p public.market_portfolios; player public.market_players;
  tx public.market_transactions; position_count integer; player_locked boolean;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(btrim(coalesce(p_idempotency_key,'')))=0 then raise exception 'IDEMPOTENCY_KEY_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  select * into s from public.market_settings where id=1 for share;
  select mp.* into player from public.market_players mp
    join public.market_active_catalogues ac on ac.catalogue_id=mp.catalogue_id and ac.season_id=mp.season_id
    where (mp.slug=p_player_slug or mp.app_player_id::text=p_player_slug) and mp.is_available
    order by (mp.app_player_id::text=p_player_slug) desc,mp.updated_at desc limit 1 for update of mp;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
  select t.* into tx from public.market_transactions t join public.market_portfolios x on x.id=t.portfolio_id
    where t.idempotency_key=p_idempotency_key and x.user_id=uid;
  if found then return jsonb_build_object('ok',true,'message','Buy already executed','transaction_id',tx.id,'player_slug',player.slug,'execution_value',tx.executed_price_minor); end if;
  select lock_state.is_locked into player_locked from public.market_player_trade_lock(player.id) lock_state;
  if coalesce(player_locked,false) then raise exception 'PLAYER_TRADE_LOCKED'; end if;
  select * into p from public.market_portfolios where user_id=uid and season_id=s.active_season_id for update;
  if not found then p:=public.market_create_or_get_portfolio(); end if;
  if exists(select 1 from public.market_holdings where portfolio_id=p.id and player_id=player.id) then raise exception 'ALREADY_OWNED'; end if;
  if (select count(*) from public.market_holdings where portfolio_id=p.id)>=s.maximum_holdings then raise exception 'MAX_HOLDINGS'; end if;
  select count(*) into position_count from public.market_holdings h join public.market_players mp on mp.id=h.player_id
    where h.portfolio_id=p.id and mp.position_group=player.position_group;
  if position_count>=public.market_position_limit(uid,player.position_group) then raise exception 'FORMATION_LIMIT'; end if;
  if p.cash_balance_minor<player.current_price_minor then raise exception 'INSUFFICIENT_BALANCE'; end if;
  perform public.market_record_gameweek_trade(p.id,'buy');
  insert into public.market_holdings(portfolio_id,player_id,quantity,purchase_price_minor,current_value_minor,unrealised_profit_minor)
    values(p.id,player.id,1,player.current_price_minor,player.current_price_minor,0);
  update public.market_portfolios set cash_balance_minor=cash_balance_minor-player.current_price_minor where id=p.id;
  insert into public.market_transactions(portfolio_id,player_id,transaction_type,executed_price_minor,balance_before_minor,balance_after_minor,
    holding_value_before_minor,holding_value_after_minor,idempotency_key)
  values(p.id,player.id,'buy',player.current_price_minor,p.cash_balance_minor,p.cash_balance_minor-player.current_price_minor,0,player.current_price_minor,p_idempotency_key)
  returning * into tx;
  perform public.market_recalculate_portfolio_totals(p.id);
  perform public.market_refresh_my_progression();
  return jsonb_build_object('ok',true,'message','Buy executed','transaction_id',tx.id,'player_slug',player.slug,'execution_value',tx.executed_price_minor);
end $$;

create or replace function public.market_sell_player(p_player_slug text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); s public.market_settings; p public.market_portfolios; player public.market_players;
  holding public.market_holdings; tx public.market_transactions; player_locked boolean;
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
  perform public.market_record_gameweek_trade(p.id,'sell');
  delete from public.market_holdings where id=holding.id;
  update public.market_portfolios set cash_balance_minor=cash_balance_minor+player.current_price_minor,
    realised_profit_minor=realised_profit_minor+(player.current_price_minor-holding.purchase_price_minor) where id=p.id;
  insert into public.market_transactions(portfolio_id,player_id,transaction_type,executed_price_minor,balance_before_minor,balance_after_minor,
    holding_value_before_minor,holding_value_after_minor,idempotency_key)
  values(p.id,player.id,'sell',player.current_price_minor,p.cash_balance_minor,p.cash_balance_minor+player.current_price_minor,holding.purchase_price_minor,0,p_idempotency_key)
  returning * into tx;
  perform public.market_recalculate_portfolio_totals(p.id);
  perform public.market_refresh_my_progression();
  return jsonb_build_object('ok',true,'message','Sale executed','transaction_id',tx.id,'player_slug',player.slug,'execution_value',tx.executed_price_minor);
end $$;

revoke all on function public.market_buy_player(text,text),public.market_sell_player(text,text)
  from public,anon;
grant execute on function public.market_buy_player(text,text),public.market_sell_player(text,text)
  to authenticated;
alter function public.market_buy_player(text,text) set statement_timeout='5s';
alter function public.market_buy_player(text,text) set lock_timeout='2s';
alter function public.market_sell_player(text,text) set statement_timeout='5s';
alter function public.market_sell_player(text,text) set lock_timeout='2s';

-- Publish the lock state with the same privacy-safe catalogue projection used
-- by guests. The trade RPC remains the authority if the browser cache is stale.
drop function if exists public.market_public_catalogue_v1(text);
create function public.market_public_catalogue_v1(p_competition_key text)
returns table (
  provider_player_id text, app_player_id bigint, slug text, display_name text,
  club_name text, competition_key text, competition_name text,
  position_group text, age integer, nationality text,
  opening_price_minor integer, current_price_minor integer,
  previous_price_minor integer, latest_rating_milli integer,
  ownership_percentage numeric, availability_status text,
  data_updated_at timestamptz, source_reference text,
  is_trade_locked boolean, trade_lock_reason text,
  trade_lock_started_at timestamptz, trade_lock_ends_at timestamptz
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
    player.availability_status, player.data_updated_at, player.source_reference,
    trade_lock.is_locked, trade_lock.lock_reason,
    trade_lock.lock_started_at, trade_lock.lock_ends_at
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

commit;
