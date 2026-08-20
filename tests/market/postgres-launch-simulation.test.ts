// @vitest-environment node
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const foundation = readFileSync('supabase/migrations/20260809203000_market_gameweek_engine.sql', 'utf8')
const progression = readFileSync('supabase/migrations/20260811120000_market_progression_rewards.sql', 'utf8')
const unattended = readFileSync('supabase/migrations/20260810123000_harden_unattended_market_operations.sql', 'utf8')
const residualBank = readFileSync('supabase/migrations/20260810170000_bank_subthreshold_market_performance.sql', 'utf8')
const isolatedFailures = readFileSync('supabase/migrations/20260814180347_isolate_gameweek_player_failures.sql', 'utf8')
const fixtureSafety = readFileSync('supabase/migrations/20260816210000_beta_fixture_trade_safety.sql', 'utf8')
const valuationCutoff = readFileSync('supabase/migrations/20260816210500_enforce_valuation_cutoff.sql', 'utf8')
const launchHardening = readFileSync('supabase/migrations/20260818080145_harden_beta_launch_gates.sql', 'utf8')
const gameweekChips = readFileSync('supabase/migrations/20260819133816_add_gameweek_chips_and_formation_choice.sql', 'utf8')
const chipDeadline = readFileSync('supabase/migrations/20260819162000_harden_gameweek_chip_deadline.sql', 'utf8')
const chipReveal = readFileSync('supabase/migrations/20260819164000_show_chip_effect_in_reveals.sql', 'utf8')
const chipTargetLifecycle = readFileSync('supabase/migrations/20260819195045_rebalance_gameweek_chips_and_track_targets.sql', 'utf8')

function functionSql(source: string, signature: string) {
  const start = source.indexOf(`create or replace function ${signature}`)
  if (start < 0) throw new Error(`Missing SQL function ${signature}`)
  const candidates = [
    source.indexOf('\ncreate or replace function ', start + 1),
    source.indexOf('\n-- ', start + 1),
    source.indexOf('\nrevoke all on function ', start + 1),
  ].filter((index) => index > start)
  return source.slice(start, Math.min(...candidates)).trim()
}

const schema = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;

create table public.market_settings(
  id integer primary key, active_season_id uuid not null, maximum_holdings integer not null,
  market_status text not null check(market_status in ('open','updating','paused')),
  valuation_eligible_from timestamptz not null
);
create table public.market_catalogues(id uuid primary key,season_id uuid not null,status text not null);
create table public.market_active_catalogues(catalogue_id uuid not null,season_id uuid not null,primary key(catalogue_id,season_id));
create table public.market_clubs(
  id uuid primary key default gen_random_uuid(),provider_club_id text not null unique,name text not null
);
create table public.market_players(
  id uuid primary key default gen_random_uuid(),catalogue_id uuid not null,season_id uuid not null,club_id uuid references public.market_clubs(id),
  app_player_id integer not null unique,provider_player_id text not null,slug text not null,display_name text not null,
  position_group text not null check(position_group in ('GK','DEF','MID','FWD')),
  initial_price_minor integer not null,current_price_minor integer not null,is_available boolean not null default true,
  performance_bank_milli integer not null default 0,latest_rating_milli integer,data_updated_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.market_portfolios(
  id uuid primary key default gen_random_uuid(),user_id uuid not null,season_id uuid not null,
  starting_balance_minor integer not null,cash_balance_minor integer not null,current_holdings_value_minor integer not null default 0,
  total_portfolio_value_minor integer not null,realised_profit_minor integer not null default 0,
  unrealised_profit_minor integer not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  unique(user_id,season_id)
);
create table public.market_holdings(
  id uuid primary key default gen_random_uuid(),portfolio_id uuid not null references public.market_portfolios(id) on delete cascade,
  player_id uuid not null references public.market_players(id),quantity integer not null default 1,
  purchase_price_minor integer not null,current_value_minor integer not null,unrealised_profit_minor integer not null default 0,
  purchased_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(portfolio_id,player_id)
);
create table public.market_transactions(
  id uuid primary key default gen_random_uuid(),portfolio_id uuid not null references public.market_portfolios(id) on delete cascade,
  player_id uuid not null references public.market_players(id),transaction_type text not null check(transaction_type in ('buy','sell')),
  executed_price_minor integer not null,balance_before_minor integer not null,balance_after_minor integer not null,
  holding_value_before_minor integer not null,holding_value_after_minor integer not null,idempotency_key text not null,
  created_at timestamptz not null default now(),unique(portfolio_id,idempotency_key)
);
create table public.market_profile_preferences(user_id uuid primary key,active_formation text not null default '4-3-3',updated_at timestamptz not null default now());
create table public.market_user_items(user_id uuid not null,item_key text not null,purchased_at timestamptz not null default now(),primary key(user_id,item_key));
create table public.market_watchlist(user_id uuid not null,player_id uuid not null references public.market_players(id),created_at timestamptz not null default now(),primary key(user_id,player_id));
create table public.market_gameweeks(
  id uuid primary key default gen_random_uuid(),gameweek_key text not null unique,week_number integer not null,label text not null,
  state text not null,opens_at timestamptz not null,closes_at timestamptz not null,processed_at timestamptz,
  gameweek_type text not null default 'transfer',
  source_fixture_count integer not null default 0,processed_player_count integer not null default 0,error_message text,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.market_player_match_stats(
  id uuid primary key default gen_random_uuid(),player_id uuid not null references public.market_players(id),provider_fixture_id text not null,
  fixture_date timestamptz not null,started boolean not null,minutes_played integer not null,provider_rating_milli integer,
  raw_provider_payload jsonb not null,provider_updated_at timestamptz not null,gameweek_id uuid references public.market_gameweeks(id),
  imported_at timestamptz not null default now(),valuation_processed_at timestamptz,unique(provider_fixture_id,player_id)
);
create table public.market_valuation_events(
  id uuid primary key default gen_random_uuid(),player_id uuid not null references public.market_players(id),match_stat_id uuid references public.market_player_match_stats(id),
  event_type text not null,previous_price_minor integer not null,new_price_minor integer not null,previous_bank_milli integer not null,
  rating_milli integer not null,baseline_rating_milli integer not null,rating_delta_milli integer not null,bank_after_event_milli integer not null,
  price_change_minor integer not null,reason text not null,calculation_version text not null,effective_at timestamptz not null,
  idempotency_key text not null unique,created_at timestamptz not null default now()
);
create table public.market_gameweek_reveals(
  id uuid primary key default gen_random_uuid(),portfolio_id uuid not null references public.market_portfolios(id),gameweek_id uuid not null references public.market_gameweeks(id),
  previous_portfolio_value_minor integer not null,new_portfolio_value_minor integer not null,cash_after_minor integer not null,
  invested_after_minor integer not null,weekly_change_minor integer not null,holding_movements jsonb not null,created_at timestamptz not null default now(),
  unique(portfolio_id,gameweek_id)
);
create table public.market_gameweek_allowances(
  portfolio_id uuid not null references public.market_portfolios(id) on delete cascade,
  gameweek_id uuid not null references public.market_gameweeks(id) on delete cascade,
  signings_used integer not null default 0 check(signings_used between 0 and 11),sales_count integer not null default 0,
  updated_at timestamptz not null default now(),primary key(portfolio_id,gameweek_id)
);
create table public.prediction_fixtures(
  fixture_id text primary key,home_provider_team_id text,away_provider_team_id text,
  kickoff_at timestamptz not null,status text not null
);
create table public.market_fixture_settlements(
  provider_fixture_id text primary key,kickoff_at timestamptz not null,
  gameweek_id uuid references public.market_gameweeks(id),status text not null,
  processed_at timestamptz not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);

create function public.market_create_or_get_portfolio() returns public.market_portfolios language plpgsql security definer set search_path=pg_catalog,public as $$
declare p public.market_portfolios;s public.market_settings;begin
 select * into s from public.market_settings where id=1;
 insert into public.market_portfolios(user_id,season_id,starting_balance_minor,cash_balance_minor,total_portfolio_value_minor)
 values(auth.uid(),s.active_season_id,100000000,100000000,100000000) on conflict(user_id,season_id) do update set updated_at=now() returning * into p;
 return p;end $$;
create function public.market_recalculate_portfolio_totals(pid uuid) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare holdings_total integer;unrealised_total integer;begin
 select coalesce(sum(current_value_minor),0),coalesce(sum(unrealised_profit_minor),0) into holdings_total,unrealised_total from public.market_holdings where portfolio_id=pid;
 update public.market_portfolios set current_holdings_value_minor=holdings_total,total_portfolio_value_minor=cash_balance_minor+holdings_total,
 unrealised_profit_minor=unrealised_total,updated_at=now() where id=pid;end $$;
create function public.market_refresh_my_progression() returns jsonb language sql as $$ select '{}'::jsonb $$;
`;

const db = new PGlite()
const socketServer = new PGLiteSocketServer({ db, host: '127.0.0.1', port: 0, maxConnections: 64 })
const seasonId = '10000000-0000-0000-0000-000000000001'
const catalogueId = '20000000-0000-0000-0000-000000000001'
const userA = '30000000-0000-0000-0000-000000000001'
const userB = '30000000-0000-0000-0000-000000000002'

async function asUser(userId: string) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [userId])
}

async function count(table: string, where = 'true') {
  const result = await db.query<{ count: number }>(`select count(*)::integer count from ${table} where ${where}`)
  return result.rows[0]!.count
}

describe('executed PostgreSQL launch simulation', () => {
  beforeAll(async () => {
    await db.exec(schema)
    await db.exec(valuationCutoff)
    await db.exec(functionSql(foundation, 'public.market_current_gameweek()'))
    await db.exec(functionSql(foundation, 'public.market_ensure_current_gameweek()'))
    await db.exec(functionSql(foundation, 'public.market_record_gameweek_trade(p_portfolio_id uuid,p_transaction_type text)'))
    await db.exec(functionSql(progression, 'public.market_position_limit(p_user_id uuid,p_position text)'))
    await db.exec(functionSql(fixtureSafety, 'public.market_player_trade_lock('))
    await db.exec(functionSql(fixtureSafety, 'public.market_buy_player(p_player_slug text,p_idempotency_key text)'))
    await db.exec(functionSql(fixtureSafety, 'public.market_sell_player(p_player_slug text,p_idempotency_key text)'))
    await db.exec(functionSql(residualBank, 'public.market_apply_verified_gameweek('))
    await db.exec(functionSql(isolatedFailures, 'public.market_apply_verified_gameweek('))
    await db.exec(functionSql(launchHardening, 'public.market_apply_verified_rating_corrections('))
    const triggerStart = unattended.indexOf('create or replace function public.market_enforce_trading_open()')
    const triggerEnd = unattended.indexOf('-- Keep hot user requests', triggerStart)
    await db.exec(unattended.slice(triggerStart, triggerEnd))
    await db.exec(gameweekChips)
    await db.exec(chipDeadline)
    await db.exec(chipReveal)
    await db.exec(chipTargetLifecycle)
    await db.query('insert into public.market_settings values(1,$1,11,$2,$3)', [seasonId, 'open', '2026-01-01T00:00:00Z'])
    await db.query("insert into public.market_catalogues values($1,$2,'active')", [catalogueId, seasonId])
    await db.query('insert into public.market_active_catalogues values($1,$2)', [catalogueId, seasonId])
    const clubId = '25000000-0000-0000-0000-000000000001'
    await db.query("insert into public.market_clubs values($1,'provider-club-1','Test Club')", [clubId])
    const positions = ['GK', 'GK', 'DEF', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD', 'FWD']
    for (let index = 0; index < positions.length; index += 1) {
      await db.query(`insert into public.market_players(catalogue_id,season_id,club_id,app_player_id,provider_player_id,slug,display_name,position_group,initial_price_minor,current_price_minor)
        values($1,$2,$3,$4,$5,$6,$7,$8,5000000,5000000)`,
      [catalogueId, seasonId, clubId, index + 1, `provider-${index + 1}`, `player-${index + 1}`, `Player ${index + 1}`, positions[index]])
    }
    for (const userId of [userA, userB]) {
      await db.query(`insert into public.market_portfolios(user_id,season_id,starting_balance_minor,cash_balance_minor,total_portfolio_value_minor)
        values($1,$2,100000000,100000000,100000000)`, [userId, seasonId])
    }
    await socketServer.start()
  }, 30_000)

  afterAll(async () => {
    await socketServer.stop()
    await db.close()
  })

  it('keeps independent authenticated sessions isolated under retry and roster races', async () => {
    const racingUser = '30000000-0000-0000-0000-000000000003'
    await db.query(`insert into public.market_portfolios(user_id,season_id,starting_balance_minor,cash_balance_minor,total_portfolio_value_minor)
      values($1,$2,100000000,100000000,100000000)`, [racingUser, seasonId])
    const [host, portText] = socketServer.getServerConn().split(':')
    const clients = await Promise.all(Array.from({ length: 25 }, async () => {
      const client = new pg.Client({ host, port: Number(portText), database: 'postgres', user: 'postgres', ssl: false })
      await client.connect()
      await client.query("select set_config('request.jwt.claim.sub',$1,false)", [racingUser])
      return client
    }))

    try {
      const duplicateRetries = await Promise.all(clients.map((client) =>
        client.query('select public.market_buy_player($1,$2)', ['player-1', 'racing-same-request'])))
      expect(duplicateRetries).toHaveLength(25)
      expect(await count('public.market_transactions', `idempotency_key='racing-same-request'`)).toBe(1)

      const candidates = ['player-2', 'player-3', 'player-4', 'player-5', 'player-6', 'player-7', 'player-8', 'player-9', 'player-10', 'player-11', 'player-12', 'player-13', 'player-14', 'player-15']
      const outcomes = await Promise.allSettled(candidates.map((slug, index) =>
        clients[index]!.query('select public.market_buy_player($1,$2)', [slug, `racing-${slug}`])))
      expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(10)

      const snapshot = await db.query<{ holdings: number; cash: number; signings: number; gk: number; def: number; mid: number; fwd: number }>(`
        select count(h.id)::integer holdings,p.cash_balance_minor cash,a.signings_used signings,
          count(h.id) filter(where mp.position_group='GK')::integer gk,
          count(h.id) filter(where mp.position_group='DEF')::integer def,
          count(h.id) filter(where mp.position_group='MID')::integer mid,
          count(h.id) filter(where mp.position_group='FWD')::integer fwd
        from public.market_portfolios p
        join public.market_holdings h on h.portfolio_id=p.id
        join public.market_players mp on mp.id=h.player_id
        join public.market_gameweek_allowances a on a.portfolio_id=p.id
        where p.user_id=$1 group by p.id,a.signings_used`, [racingUser])
      expect(snapshot.rows[0]).toEqual({ holdings: 11, cash: 45_000_000, signings: 11, gk: 1, def: 4, mid: 3, fwd: 3 })
    } finally {
      await Promise.all(clients.map((client) => client.end()))
    }
  }, 30_000)

  it('executes a complete authenticated 1-4-3-3 purchase ledger and idempotent retry', async () => {
    await asUser(userA)
    const slugs = ['player-1', 'player-3', 'player-4', 'player-5', 'player-6', 'player-8', 'player-9', 'player-10', 'player-12', 'player-13', 'player-14']
    for (const [index, slug] of slugs.entries()) await db.query('select public.market_buy_player($1,$2)', [slug, `user-a-buy-${index}`])
    const duplicate = await Promise.all([
      db.query('select public.market_buy_player($1,$2)', ['player-14', 'user-a-buy-10']),
      db.query('select public.market_buy_player($1,$2)', ['player-14', 'user-a-buy-10']),
    ])
    expect(duplicate).toHaveLength(2)
    expect(await count('public.market_holdings', `portfolio_id in (select id from public.market_portfolios where user_id='${userA}')`)).toBe(11)
    expect(await count('public.market_transactions', `portfolio_id in (select id from public.market_portfolios where user_id='${userA}')`)).toBe(11)
    const snapshot = await db.query<{ cash: number; invested: number; total: number; signings: number }>(`
      select p.cash_balance_minor cash,p.current_holdings_value_minor invested,p.total_portfolio_value_minor total,a.signings_used signings
      from public.market_portfolios p join public.market_gameweek_allowances a on a.portfolio_id=p.id where p.user_id=$1`, [userA])
    expect(snapshot.rows[0]).toEqual({ cash: 45_000_000, invested: 55_000_000, total: 100_000_000, signings: 11 })
  })

  it('balances Position Pulse and clearly ends it after every confirmed target is sold', async () => {
    const pulseUser = '30000000-0000-0000-0000-000000000098'
    await db.query(`insert into public.market_portfolios(user_id,season_id,starting_balance_minor,cash_balance_minor,total_portfolio_value_minor)
      values($1,$2,100000000,100000000,100000000)`, [pulseUser, seasonId])
    await asUser(pulseUser)
    await db.query('select public.market_buy_player($1,$2)', ['player-12', 'pulse-user-buy-1'])
    await db.query('select public.market_buy_player($1,$2)', ['player-13', 'pulse-user-buy-2'])

    const play = await db.query<{ result: { active_chip: { multiplier_basis_points: number; state: string; targets: Array<{ player_name: string; still_held: boolean; events_applied: number }> } } }>(
      "select public.market_play_gameweek_chip('position_pulse',null,'FWD') result",
    )
    expect(play.rows[0]!.result.active_chip).toMatchObject({ multiplier_basis_points: 20_000, state: 'armed' })
    expect(play.rows[0]!.result.active_chip.targets).toHaveLength(2)
    expect(play.rows[0]!.result.active_chip.targets).toEqual(expect.arrayContaining([
      expect.objectContaining({ still_held: true, events_applied: 0 }),
    ]))

    await db.query("select public.market_sell_player('player-12','pulse-user-sell-1')")
    const afterOneSale = await db.query<{ result: { active_chip: { state: string; targets: Array<{ player_name: string; still_held: boolean }> } } }>('select public.market_my_gameweek_chip() result')
    expect(afterOneSale.rows[0]!.result.active_chip.state).toBe('armed')
    expect(afterOneSale.rows[0]!.result.active_chip.targets).toEqual(expect.arrayContaining([
      expect.objectContaining({ player_name: 'Player 12', still_held: false }),
      expect.objectContaining({ player_name: 'Player 13', still_held: true }),
    ]))

    await db.query("select public.market_sell_player('player-13','pulse-user-sell-2')")
    const afterAllSold = await db.query<{ result: { active_chip: { state: string; targets: Array<{ still_held: boolean }> } } }>('select public.market_my_gameweek_chip() result')
    expect(afterAllSold.rows[0]!.result.active_chip.state).toBe('void')
    expect(afterAllSold.rows[0]!.result.active_chip.targets.every((target) => !target.still_held)).toBe(true)

    await asUser('')
    await db.query('delete from public.market_gameweek_chip_plays where portfolio_id in (select id from public.market_portfolios where user_id=$1)', [pulseUser])
    await db.query('delete from public.market_transactions where portfolio_id in (select id from public.market_portfolios where user_id=$1)', [pulseUser])
    await db.query('delete from public.market_gameweek_allowances where portfolio_id in (select id from public.market_portfolios where user_id=$1)', [pulseUser])
    await db.query('delete from public.market_portfolios where user_id=$1', [pulseUser])
  })

  it('executes a private Triple Shout up-move, keeps the public price normal and settles the held value', async () => {
    const chipUser = '30000000-0000-0000-0000-000000000099'
    await db.query(`insert into public.market_portfolios(user_id,season_id,starting_balance_minor,cash_balance_minor,total_portfolio_value_minor)
      values($1,$2,100000000,100000000,100000000)`, [chipUser, seasonId])
    await asUser(chipUser)
    await db.query('select public.market_buy_player($1,$2)', ['player-2', 'chip-user-buy'])

    const formation = await db.query<{ result: { active_formation: string } }>("select public.market_set_formation('4-4-2') result")
    expect(formation.rows[0]!.result.active_formation).toBe('4-4-2')

    const deadline = await db.query<{ safe: boolean }>(`select public.market_gameweek_chip_deadline(id) < closes_at as safe
      from public.market_gameweeks where gameweek_type='transfer' order by opens_at desc limit 1`)
    expect(deadline.rows[0]!.safe).toBe(true)

    const play = await db.query<{ result: { chip_used: boolean; active_chip: { chip_key: string; targets: Array<{ player_name: string }> } } }>(
      "select public.market_play_gameweek_chip('triple_shout',array[2]::bigint[],null) result",
    )
    expect(play.rows[0]!.result).toMatchObject({ chip_used: true, active_chip: { chip_key: 'triple_shout' } })
    expect(play.rows[0]!.result.active_chip.targets).toEqual([expect.objectContaining({ player_name: 'Player 2' })])
    await expect(db.query("select public.market_play_gameweek_chip('lockdown',array[2,2]::bigint[],null)"))
      .rejects.toThrow('CHIP_ALREADY_PLAYED')

    const playerRow = await db.query<{ id: string }>("select id from public.market_players where app_player_id=2")
    const playerId = playerRow.rows[0]!.id
    const statId = '71000000-0000-0000-0000-000000000001'
    const eventId = '72000000-0000-0000-0000-000000000001'
    await db.query(`insert into public.market_player_match_stats(
      id,player_id,provider_fixture_id,fixture_date,started,minutes_played,provider_rating_milli,raw_provider_payload,provider_updated_at
    ) values($1,$2,'chip-fixture',now(),true,90,8000,'{}',now())`, [statId, playerId])
    await db.query(`insert into public.market_valuation_events(
      id,player_id,match_stat_id,event_type,previous_price_minor,new_price_minor,previous_bank_milli,rating_milli,
      baseline_rating_milli,rating_delta_milli,bank_after_event_milli,price_change_minor,reason,calculation_version,effective_at,idempotency_key
    ) values($1,$2,$3,'verified_rating',5000000,5100000,0,8000,6800,1200,0,100000,'chip test','chip-test-v1',now(),'chip-test-event')`,
    [eventId, playerId, statId])
    await db.query('update public.market_players set current_price_minor=5100000 where id=$1', [playerId])
    await db.query(`update public.market_holdings holding set current_value_minor=player.current_price_minor,
      unrealised_profit_minor=player.current_price_minor-holding.purchase_price_minor
      from public.market_players player where player.id=holding.player_id and holding.portfolio_id in (
        select id from public.market_portfolios where user_id=$1
      )`, [chipUser])

    const held = await db.query<{ held: number; public_price: number; adjustment: number }>(`
      select holding.current_value_minor held,player.current_price_minor public_price,
        (select sum(adjustment_minor)::integer from public.market_holding_value_adjustments where holding_id=holding.id) adjustment
      from public.market_holdings holding join public.market_players player on player.id=holding.player_id
      join public.market_portfolios portfolio on portfolio.id=holding.portfolio_id where portfolio.user_id=$1`, [chipUser])
    expect(held.rows[0]).toEqual({ held: 5_300_000, public_price: 5_100_000, adjustment: 200_000 })

    const resultGameweekId = '73000000-0000-0000-0000-000000000001'
    await db.query(`insert into public.market_gameweeks(
      id,gameweek_key,week_number,label,state,opens_at,closes_at,gameweek_type
    ) values($1,'chip-results',99,'Chip results','processing',now()-interval '1 day',now()+interval '1 day','results')`, [resultGameweekId])
    await db.query('update public.market_player_match_stats set gameweek_id=$1 where id=$2', [resultGameweekId, statId])
    await db.query(`insert into public.market_gameweek_reveals(
      portfolio_id,gameweek_id,previous_portfolio_value_minor,new_portfolio_value_minor,cash_after_minor,
      invested_after_minor,weekly_change_minor,holding_movements
    ) select id,$1,100000000,100300000,cash_balance_minor,5300000,300000,'[]'::jsonb
      from public.market_portfolios where user_id=$2`, [resultGameweekId, chipUser])
    const reveal = await db.query<{ movement: { market_delta: number; chip_adjustment: number; chip_key: string; current_value: number; delta: number } }>(`
      select holding_movements->0 movement from public.market_gameweek_reveals
      where gameweek_id=$1`, [resultGameweekId])
    expect(reveal.rows[0]!.movement).toMatchObject({
      market_delta: 100_000,
      chip_adjustment: 200_000,
      chip_key: 'triple_shout',
      current_value: 5_300_000,
      delta: 300_000,
    })

    const sale = await db.query<{ result: { execution_value: number; public_market_value: number } }>(
      "select public.market_sell_player('player-2','chip-user-sell') result",
    )
    expect(sale.rows[0]!.result).toMatchObject({ execution_value: 5_300_000, public_market_value: 5_100_000 })
    const statusAfterSale = await db.query<{ result: { active_chip: { state: string; targets: Array<{ player_name: string; still_held: boolean; events_applied: number }> } } }>('select public.market_my_gameweek_chip() result')
    expect(statusAfterSale.rows[0]!.result.active_chip.state).toBe('applied')
    expect(statusAfterSale.rows[0]!.result.active_chip.targets).toEqual([
      expect.objectContaining({ player_name: 'Player 2', still_held: false, events_applied: 1 }),
    ])

    await asUser('')
    await db.query('delete from public.market_gameweek_reveals where gameweek_id=$1', [resultGameweekId])
    await db.query('delete from public.market_gameweek_chip_plays where portfolio_id in (select id from public.market_portfolios where user_id=$1)', [chipUser])
    await db.query('delete from public.market_transactions where portfolio_id in (select id from public.market_portfolios where user_id=$1)', [chipUser])
    await db.query('delete from public.market_gameweek_allowances where portfolio_id in (select id from public.market_portfolios where user_id=$1)', [chipUser])
    await db.query('delete from public.market_portfolios where user_id=$1', [chipUser])
    await db.query('delete from public.market_valuation_events where id=$1', [eventId])
    await db.query('delete from public.market_player_match_stats where id=$1', [statId])
    await db.query('delete from public.market_gameweeks where id=$1', [resultGameweekId])
    await db.query('update public.market_players set current_price_minor=5000000 where id=$1', [playerId])
  })

  it('rolls back formation, transfer-limit and paused-market failures completely', async () => {
    await asUser(userB)
    await db.query('select public.market_buy_player($1,$2)', ['player-1', 'user-b-gk'])
    const before = await db.query<{ cash: number }>('select cash_balance_minor cash from public.market_portfolios where user_id=$1', [userB])
    await expect(db.query('select public.market_buy_player($1,$2)', ['player-2', 'user-b-second-gk'])).rejects.toThrow('FORMATION_LIMIT')
    expect((await db.query<{ cash: number }>('select cash_balance_minor cash from public.market_portfolios where user_id=$1', [userB])).rows[0]).toEqual(before.rows[0])
    expect(await count('public.market_transactions', `idempotency_key='user-b-second-gk'`)).toBe(0)

    await db.query("update public.market_settings set market_status='paused' where id=1")
    await expect(db.query('select public.market_buy_player($1,$2)', ['player-3', 'user-b-paused'])).rejects.toThrow('MARKET_TEMPORARILY_UNAVAILABLE')
    expect(await count('public.market_transactions', `idempotency_key='user-b-paused'`)).toBe(0)
    const allowance = await db.query<{ signings: number }>(`select signings_used signings from public.market_gameweek_allowances a join public.market_portfolios p on p.id=a.portfolio_id where p.user_id=$1`, [userB])
    expect(allowance.rows[0]!.signings).toBe(1)
    await db.query("update public.market_settings set market_status='open' where id=1")

    await asUser(userA)
    await db.query('select public.market_sell_player($1,$2)', ['player-14', 'user-a-sell'])
    await expect(db.query('select public.market_buy_player($1,$2)', ['player-15', 'user-a-buy-12'])).rejects.toThrow('GAMEWEEK_TRANSFER_LIMIT')
    expect(await count('public.market_transactions', `idempotency_key='user-a-buy-12'`)).toBe(0)
  })

  it('locks both buying and selling at club kickoff until the fixture is settled', async () => {
    const now = new Date()
    const kickoff = new Date(now.getTime() - 60_000).toISOString()
    const eligibleFrom = new Date(now.getTime() - 120_000).toISOString()
    await db.query('update public.market_settings set valuation_eligible_from=$1 where id=1', [eligibleFrom])
    await db.query(`insert into public.prediction_fixtures(
      fixture_id,home_provider_team_id,away_provider_team_id,kickoff_at,status
    ) values('fixture-live-lock','provider-club-1','provider-club-2',$1,'live')`, [kickoff])

    await asUser(userB)
    await expect(db.query('select public.market_sell_player($1,$2)', ['player-1', 'user-b-locked-sell']))
      .rejects.toThrow('PLAYER_TRADE_LOCKED')
    expect(await count('public.market_transactions', `idempotency_key='user-b-locked-sell'`)).toBe(0)

    await asUser(userA)
    const committedRetry = await db.query<{ result: { message: string } }>(
      'select public.market_buy_player($1,$2) result', ['player-1', 'user-a-buy-0'],
    )
    expect(committedRetry.rows[0]!.result.message).toBe('Buy already executed')

    await asUser('')
    await db.query(`insert into public.market_fixture_settlements(
      provider_fixture_id,kickoff_at,status,processed_at
    ) values('fixture-live-lock',$1,'processed',now())`, [kickoff])
    await asUser(userB)
    await db.query('select public.market_sell_player($1,$2)', ['player-1', 'user-b-unlocked-sell'])
    expect(await count('public.market_transactions', `idempotency_key='user-b-unlocked-sell'`)).toBe(1)

    await db.query("update public.market_settings set valuation_eligible_from='2026-01-01T00:00:00Z' where id=1")
  })

  it('rejects match evidence before the database launch boundary without changing a price', async () => {
    await asUser('')
    const before = await db.query<{ price: number }>("select current_price_minor price from public.market_players where provider_player_id='provider-12'")
    const result = await db.query<{ result: { processed_players: number; failed_items: Array<{ sqlstate: string; message: string }> } }>(
      `select public.market_apply_verified_gameweek($1,$2,$3,$4,$5,$6::jsonb) result`,
      ['sportmonks-2025-52', 'Pre-launch evidence', 52, '2025-12-22T00:00:00Z', '2025-12-29T00:00:00Z', JSON.stringify([{
        provider_player_id: 'provider-12', provider_fixture_id: 'fixture-pre-launch',
        fixture_date: '2025-12-28T16:00:00Z', started: true, minutes_played: 90,
        rating: 9.0, retrieved_at: '2025-12-28T19:00:00Z',
      }])],
    )
    expect(result.rows[0]!.result.processed_players).toBe(0)
    expect(result.rows[0]!.result.failed_items).toEqual([
      expect.objectContaining({ sqlstate: 'P0001', message: 'FIXTURE_BEFORE_VALUATION_BOUNDARY' }),
    ])
    expect((await db.query<{ price: number }>("select current_price_minor price from public.market_players where provider_player_id='provider-12'")).rows[0]).toEqual(before.rows[0])
  })

  it('executes ratings through prices, residual banks, holdings, portfolios and Reveals exactly once', async () => {
    await asUser('')
    const players = await db.query<{ provider_player_id: string }>('select provider_player_id from public.market_players where app_player_id<=11 order by app_player_id')
    const updates = players.rows.map((player, index) => ({
      provider_player_id: player.provider_player_id,
      provider_fixture_id: `fixture-${Math.floor(index / 2) + 1}`,
      fixture_date: '2026-08-09T16:00:00Z', started: true, minutes_played: 90,
      rating: index % 3 === 0 ? 7.8 : index % 3 === 1 ? 6.9 : 6.5,
      retrieved_at: '2026-08-09T19:00:00Z',
    }))
    const before = await db.query<{ id: string; total: number }>('select id,total_portfolio_value_minor total from public.market_portfolios order by id')
    const first = await db.query<{ result: { processed_players: number; skipped_players: number } }>(
      `select public.market_apply_verified_gameweek($1,$2,$3,$4,$5,$6::jsonb) result`,
      ['sportmonks-2026-32', 'Results · 2026-32', 32, '2026-08-03T00:00:00Z', '2026-08-10T00:00:00Z', JSON.stringify(updates)],
    )
    expect(first.rows[0]!.result).toMatchObject({ processed_players: 11, skipped_players: 0 })
    expect(await count('public.market_player_match_stats')).toBe(11)
    expect(await count('public.market_valuation_events')).toBe(11)
    expect(await count('public.market_gameweek_reveals')).toBe(before.rows.length)

    const after = await db.query<{ id: string; cash: number; invested: number; total: number }>(
      'select id,cash_balance_minor cash,current_holdings_value_minor invested,total_portfolio_value_minor total from public.market_portfolios order by id',
    )
    expect(after.rows.every((row) => row.cash + row.invested === row.total)).toBe(true)
    const reveals = await db.query<{ portfolio_id: string; before: number; after: number; change: number }>(
      'select portfolio_id,previous_portfolio_value_minor before,new_portfolio_value_minor after,weekly_change_minor change from public.market_gameweek_reveals',
    )
    expect(reveals.rows.every((row) => row.after - row.before === row.change)).toBe(true)

    const duplicate = await db.query<{ result: { unchanged: boolean; processed_players: number; skipped_players: number } }>(
      `select public.market_apply_verified_gameweek($1,$2,$3,$4,$5,$6::jsonb) result`,
      ['sportmonks-2026-32', 'Results · 2026-32', 32, '2026-08-03T00:00:00Z', '2026-08-10T00:00:00Z', JSON.stringify(updates)],
    )
    expect(duplicate.rows[0]!.result).toMatchObject({ unchanged: true, processed_players: 0, skipped_players: 11 })
    expect(await count('public.market_player_match_stats')).toBe(11)
    expect(await count('public.market_valuation_events')).toBe(11)
  }, 30_000)

  it('applies a newer changed provider rating once and refreshes portfolio and Reveal totals', async () => {
    await asUser('')
    const correction = [{
      provider_player_id: 'provider-1', provider_fixture_id: 'fixture-1',
      fixture_date: '2026-08-09T16:00:00Z', started: true, minutes_played: 88,
      rating: 5.5, retrieved_at: '2026-08-10T08:00:00Z',
    }]
    const first = await db.query<{ result: { corrected_players: number; skipped_corrections: number; failed_items: unknown[] } }>(
      'select public.market_apply_verified_rating_corrections($1,$2::jsonb) result',
      ['sportmonks-2026-32', JSON.stringify(correction)],
    )
    expect(first.rows[0]!.result).toMatchObject({ corrected_players: 1, skipped_corrections: 0, failed_items: [] })
    expect(await count('public.market_player_match_stats')).toBe(11)
    expect(await count('public.market_valuation_events')).toBe(12)
    expect((await db.query<{ rating: number }>("select provider_rating_milli rating from public.market_player_match_stats where provider_fixture_id='fixture-1' and player_id=(select id from public.market_players where provider_player_id='provider-1')")).rows[0]!.rating).toBe(5500)

    const duplicate = await db.query<{ result: { corrected_players: number; skipped_corrections: number } }>(
      'select public.market_apply_verified_rating_corrections($1,$2::jsonb) result',
      ['sportmonks-2026-32', JSON.stringify(correction)],
    )
    expect(duplicate.rows[0]!.result).toMatchObject({ corrected_players: 0, skipped_corrections: 1 })
    expect(await count('public.market_valuation_events')).toBe(12)

    const invalidTotals = await count('public.market_portfolios', `
      total_portfolio_value_minor <> cash_balance_minor + current_holdings_value_minor
      or current_holdings_value_minor <> (select coalesce(sum(current_value_minor),0)::integer from public.market_holdings where portfolio_id=market_portfolios.id)
    `)
    expect(invalidTotals).toBe(0)
    const invalidReveals = await count('public.market_gameweek_reveals', 'new_portfolio_value_minor - previous_portfolio_value_minor <> weekly_change_minor')
    expect(invalidReveals).toBe(0)
  }, 30_000)

  it('quarantines one hard provider-row failure and still prices the valid player', async () => {
    await asUser('')
    const updates = [
      {
        provider_player_id: 'provider-12',
        provider_fixture_id: 'fixture-hard-failure',
        fixture_date: '2026-08-11T16:00:00Z',
        started: true,
        minutes_played: 90,
        rating: 7.5,
        retrieved_at: 'not-a-timestamp',
      },
      {
        provider_player_id: 'provider-13',
        provider_fixture_id: 'fixture-valid-after-failure',
        fixture_date: '2026-08-11T16:00:00Z',
        started: true,
        minutes_played: 90,
        rating: 7.7,
        retrieved_at: '2026-08-11T19:00:00Z',
      },
    ]
    const result = await db.query<{ result: { processed_players: number; skipped_players: number; failed_items: Array<{ provider_fixture_id: string; sqlstate: string }> } }>(
      `select public.market_apply_verified_gameweek($1,$2,$3,$4,$5,$6::jsonb) result`,
      ['sportmonks-2026-33', 'Results - 2026-33', 33, '2026-08-10T00:00:00Z', '2026-08-17T00:00:00Z', JSON.stringify(updates)],
    )
    expect(result.rows[0]!.result).toMatchObject({ processed_players: 1, skipped_players: 1 })
    expect(result.rows[0]!.result.failed_items).toEqual([
      expect.objectContaining({ provider_fixture_id: 'fixture-hard-failure', sqlstate: '22007' }),
    ])
    expect(await count('public.market_player_match_stats', `provider_fixture_id='fixture-hard-failure'`)).toBe(0)
    expect(await count('public.market_player_match_stats', `provider_fixture_id='fixture-valid-after-failure'`)).toBe(1)
  })

  it('bulk-reconciles 10,000 database portfolios and 110,000 holdings after repricing', async () => {
    await asUser('')
    await db.exec(`
      insert into public.market_portfolios(id,user_id,season_id,starting_balance_minor,cash_balance_minor,total_portfolio_value_minor)
      select ('40000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,
        ('50000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,
        '${seasonId}'::uuid,100000000,45000000,100000000 from generate_series(1,10000) i;
      insert into public.market_holdings(portfolio_id,player_id,purchase_price_minor,current_value_minor)
      select p.id,mp.id,5000000,5000000 from public.market_portfolios p
      cross join (select id from public.market_players order by app_player_id limit 11) mp
      where p.user_id::text like '50000000-%';
      update public.market_players set current_price_minor=current_price_minor+100000 where app_player_id<=11;
      update public.market_holdings h set current_value_minor=mp.current_price_minor,
        unrealised_profit_minor=mp.current_price_minor-h.purchase_price_minor from public.market_players mp where mp.id=h.player_id;
      with totals as (
        select p.id,coalesce(sum(h.current_value_minor),0)::integer holdings_total,coalesce(sum(h.unrealised_profit_minor),0)::integer unrealised_total
        from public.market_portfolios p left join public.market_holdings h on h.portfolio_id=p.id group by p.id
      ) update public.market_portfolios p set current_holdings_value_minor=t.holdings_total,
        total_portfolio_value_minor=p.cash_balance_minor+t.holdings_total,unrealised_profit_minor=t.unrealised_total from totals t where t.id=p.id;
    `)
    expect(await count('public.market_portfolios', `user_id::text like '50000000-%'`)).toBe(10_000)
    expect(await count('public.market_holdings', `portfolio_id in (select id from public.market_portfolios where user_id::text like '50000000-%')`)).toBe(110_000)
    const invalid = await count('public.market_portfolios', `user_id::text like '50000000-%' and (
      current_holdings_value_minor<>(select coalesce(sum(h.current_value_minor),0)::integer from public.market_holdings h where h.portfolio_id=market_portfolios.id)
      or total_portfolio_value_minor<>cash_balance_minor+(select coalesce(sum(h.current_value_minor),0)::integer from public.market_holdings h where h.portfolio_id=market_portfolios.id)
      or unrealised_profit_minor<>(select coalesce(sum(h.unrealised_profit_minor),0)::integer from public.market_holdings h where h.portfolio_id=market_portfolios.id)
    )`)
    expect(invalid).toBe(0)
  }, 60_000)
})
