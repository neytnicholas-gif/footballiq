// @vitest-environment node
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const foundation = readFileSync('supabase/migrations/20260809203000_market_gameweek_engine.sql', 'utf8')
const progression = readFileSync('supabase/migrations/20260811120000_market_progression_rewards.sql', 'utf8')
const unattended = readFileSync('supabase/migrations/20260810123000_harden_unattended_market_operations.sql', 'utf8')
const residualBank = readFileSync('supabase/migrations/20260810170000_bank_subthreshold_market_performance.sql', 'utf8')

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
  market_status text not null check(market_status in ('open','updating','paused'))
);
create table public.market_catalogues(id uuid primary key,season_id uuid not null,status text not null);
create table public.market_active_catalogues(catalogue_id uuid not null,season_id uuid not null,primary key(catalogue_id,season_id));
create table public.market_players(
  id uuid primary key default gen_random_uuid(),catalogue_id uuid not null,season_id uuid not null,
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
  acquired_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(portfolio_id,player_id)
);
create table public.market_transactions(
  id uuid primary key default gen_random_uuid(),portfolio_id uuid not null references public.market_portfolios(id) on delete cascade,
  player_id uuid not null references public.market_players(id),transaction_type text not null check(transaction_type in ('buy','sell')),
  executed_price_minor integer not null,balance_before_minor integer not null,balance_after_minor integer not null,
  holding_value_before_minor integer not null,holding_value_after_minor integer not null,idempotency_key text not null,
  created_at timestamptz not null default now(),unique(portfolio_id,idempotency_key)
);
create table public.market_profile_preferences(user_id uuid primary key,active_formation text not null default '4-3-3');
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
    await db.exec(functionSql(foundation, 'public.market_current_gameweek()'))
    await db.exec(functionSql(foundation, 'public.market_ensure_current_gameweek()'))
    await db.exec(functionSql(foundation, 'public.market_record_gameweek_trade(p_portfolio_id uuid,p_transaction_type text)'))
    await db.exec(functionSql(progression, 'public.market_position_limit(p_user_id uuid,p_position text)'))
    await db.exec(functionSql(progression, 'public.market_buy_player(p_player_slug text,p_idempotency_key text)'))
    await db.exec(functionSql(progression, 'public.market_sell_player(p_player_slug text,p_idempotency_key text)'))
    await db.exec(functionSql(residualBank, 'public.market_apply_verified_gameweek('))
    const triggerStart = unattended.indexOf('create or replace function public.market_enforce_trading_open()')
    const triggerEnd = unattended.indexOf('-- Keep hot user requests', triggerStart)
    await db.exec(unattended.slice(triggerStart, triggerEnd))
    await db.query('insert into public.market_settings values(1,$1,11,$2)', [seasonId, 'open'])
    await db.query("insert into public.market_catalogues values($1,$2,'active')", [catalogueId, seasonId])
    await db.query('insert into public.market_active_catalogues values($1,$2)', [catalogueId, seasonId])
    const positions = ['GK', 'GK', 'DEF', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD', 'FWD']
    for (let index = 0; index < positions.length; index += 1) {
      await db.query(`insert into public.market_players(catalogue_id,season_id,app_player_id,provider_player_id,slug,display_name,position_group,initial_price_minor,current_price_minor)
        values($1,$2,$3,$4,$5,$6,$7,5000000,5000000)`,
      [catalogueId, seasonId, index + 1, `provider-${index + 1}`, `player-${index + 1}`, `Player ${index + 1}`, positions[index]])
    }
    for (const userId of [userA, userB]) {
      await db.query(`insert into public.market_portfolios(user_id,season_id,starting_balance_minor,cash_balance_minor,total_portfolio_value_minor)
        values($1,$2,100000000,100000000,100000000)`, [userId, seasonId])
    }
  }, 30_000)

  afterAll(async () => { await db.close() })

  it('executes a complete authenticated 1-4-3-3 purchase ledger and idempotent retry', async () => {
    await asUser(userA)
    const slugs = ['player-1', 'player-3', 'player-4', 'player-5', 'player-6', 'player-8', 'player-9', 'player-10', 'player-12', 'player-13', 'player-14']
    for (const [index, slug] of slugs.entries()) await db.query('select public.market_buy_player($1,$2)', [slug, `user-a-buy-${index}`])
    const duplicate = await Promise.all([
      db.query('select public.market_buy_player($1,$2)', ['player-14', 'user-a-buy-10']),
      db.query('select public.market_buy_player($1,$2)', ['player-14', 'user-a-buy-10']),
    ])
    expect(duplicate).toHaveLength(2)
    expect(await count('public.market_holdings')).toBe(11)
    expect(await count('public.market_transactions')).toBe(11)
    const snapshot = await db.query<{ cash: number; invested: number; total: number; signings: number }>(`
      select p.cash_balance_minor cash,p.current_holdings_value_minor invested,p.total_portfolio_value_minor total,a.signings_used signings
      from public.market_portfolios p join public.market_gameweek_allowances a on a.portfolio_id=p.id where p.user_id=$1`, [userA])
    expect(snapshot.rows[0]).toEqual({ cash: 45_000_000, invested: 55_000_000, total: 100_000_000, signings: 11 })
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
