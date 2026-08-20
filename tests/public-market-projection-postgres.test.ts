// @vitest-environment node
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const movementMigration = readFileSync('supabase/migrations/20260819224214_preserve_real_movement_after_opening_recalibration.sql', 'utf8')

function functionSql(migration: string, name: string) {
  const start = [
    migration.indexOf(`create function public.${name}`),
    migration.indexOf(`create or replace function public.${name}`),
  ].find((index) => index >= 0) ?? -1
  if (start < 0) throw new Error(`Missing ${name}`)
  const end = migration.indexOf('\nrevoke all on function ', start)
  return migration.slice(start, end).trim()
}

const db = new PGlite()
const playerId = '10000000-0000-0000-0000-000000000001'
const catalogueId = '20000000-0000-0000-0000-000000000001'
const clubId = '30000000-0000-0000-0000-000000000001'

describe('privacy-safe public market projections', () => {
  beforeAll(async () => {
    await db.exec(`
      create table public.market_catalogues(id uuid primary key,season_id text,status text);
      create table public.market_seasons(id text primary key,name text,competition_key text);
      create table public.market_clubs(id uuid primary key,name text);
      create table public.market_players(
        id uuid primary key,catalogue_id uuid,season_id text,club_id uuid,provider_player_id text,
        app_player_id bigint,slug text,display_name text,position_group text,age integer,nationality text,
        initial_price_minor integer,current_price_minor integer,latest_rating_milli integer,
        availability_status text,data_updated_at timestamptz,is_available boolean,updated_at timestamptz,
        source_reference text,performance_bank_milli integer,opening_price_method_version text,
        opening_price_confidence text,opening_price_evidence jsonb
      );
      create table public.market_portfolios(id uuid primary key,user_id uuid);
      create table public.market_holdings(portfolio_id uuid,player_id uuid);
      create table public.market_valuation_events(
        id bigint generated always as identity primary key,
        player_id uuid,
        event_type text not null default 'match-performance',
        previous_price_minor integer,
        new_price_minor integer,
        price_change_minor integer,
        reason text,
        calculation_version text not null default 'test-v1',
        effective_at timestamptz,
        created_at timestamptz
      );
      create table public.player_season_stats(
        player_id uuid,season_id text,appearances integer,starts integer,minutes_played integer,
        goals integer,assists integer,clean_sheets integer,yellow_cards integer,red_cards integer,
        average_rating_milli integer,source_through_at timestamptz,updated_at timestamptz
      );
      create function public.market_player_trade_lock(p_player_id uuid,p_at timestamptz default now())
      returns table(is_locked boolean,lock_reason text,lock_started_at timestamptz,lock_ends_at timestamptz)
      language sql stable as $$ select false,null::text,null::timestamptz,null::timestamptz $$;
    `)
    await db.exec(functionSql(movementMigration, 'market_public_catalogue_v1'))
    await db.exec(functionSql(movementMigration, 'market_public_player_detail_v1'))
    await db.query("insert into public.market_catalogues values($1,'season-1','active')", [catalogueId])
    await db.query("insert into public.market_seasons values('season-1','2026/27','premier-league')")
    await db.query("insert into public.market_clubs values($1,'Example FC')", [clubId])
    await db.query(`insert into public.market_players values(
      $1,$2,'season-1',$3,'provider-secret-9',9,'example-player','Example Player','MID',22,'Belgium',
      8000000,8200000,7400,'available',now(),true,now(),'private-provider-reference',73,
      'opening-v1','high',$4::jsonb
    )`, [playerId, catalogueId, clubId, JSON.stringify({
      method_version: 'opening-v1', confidence: 'high', calculated_value: 8000000,
      source_inputs: { appearances: 10, starts: 9, minutes: 800, average_rating: 7.2, goals: 3, assists: 4, clean_sheets: 0 },
      scores: { stabilized_rating: 7.1, rating: 70, minutes: 80, role: 70, output: 70, team_context: 60, age: 80, overall: 72 },
    })])
    await db.query(`insert into public.player_season_stats values(
      $1,'season-1',10,9,800,3,4,0,1,0,7200,now(),now()
    )`, [playerId])
  })

  afterAll(async () => {
    await db.close()
  })

  it('returns the catalogue needed by the UI without provider or model-state columns', async () => {
    const result = await db.query<Record<string, unknown>>("select * from public.market_public_catalogue_v1('premier-league')")
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toMatchObject({
      app_player_id: 9,
      display_name: 'Example Player',
      current_price_minor: 8200000,
      previous_price_minor: 8200000,
    })
    expect(result.rows[0]).not.toHaveProperty('provider_player_id')
    expect(result.rows[0]).not.toHaveProperty('source_reference')
    expect(result.rows[0]).not.toHaveProperty('performance_bank_milli')
  })

  it('preserves real signed movement when an opening-price recalibration breaks the old absolute chain', async () => {
    await db.query(`insert into public.market_valuation_events(
      player_id,previous_price_minor,new_price_minor,price_change_minor,effective_at,created_at
    ) values($1,5000000,5200000,200000,'2026-08-15T17:30:00Z','2026-08-16T02:44:15Z')`, [playerId])
    const result = await db.query<Record<string, unknown>>("select * from public.market_public_catalogue_v1('premier-league')")
    expect(result.rows[0]).toMatchObject({
      current_price_minor: 8200000,
      previous_price_minor: 8000000,
    })
  })

  it('uses the recorded previous price when the latest event still matches the current chain', async () => {
    await db.query(`update public.market_valuation_events
      set previous_price_minor=8000000,new_price_minor=8200000,price_change_minor=200000
      where player_id=$1`, [playerId])
    const result = await db.query<Record<string, unknown>>("select * from public.market_public_catalogue_v1('premier-league')")
    expect(result.rows[0]).toMatchObject({
      current_price_minor: 8200000,
      previous_price_minor: 8000000,
    })
  })

  it('returns only the reviewed player-detail payload', async () => {
    const result = await db.query<{ detail: { season_stats: unknown[]; opening_price: Record<string, unknown>; value_history: Array<Record<string, unknown>> } }>(
      'select public.market_public_player_detail_v1($1) detail', [9],
    )
    expect(result.rows[0]!.detail.season_stats).toHaveLength(1)
    expect(result.rows[0]!.detail.opening_price).toMatchObject({ initial_price_minor: 8000000, opening_price_confidence: 'high' })
    expect(result.rows[0]!.detail.value_history).toEqual([
      expect.objectContaining({ id: 1, player_id: 9, value: 8000000, reason_category: 'opening-price' }),
      expect.objectContaining({ id: 2, player_id: 9, value: 8200000, reason_category: 'match-performance' }),
    ])
    expect(JSON.stringify(result.rows[0]!.detail)).not.toContain('provider-secret')
    expect(JSON.stringify(result.rows[0]!.detail)).not.toContain('private-provider-reference')
  })
})
