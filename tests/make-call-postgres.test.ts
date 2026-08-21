// @vitest-environment node
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/20260820144011_make_call_game.sql', 'utf8')
const db = new PGlite()
const matchup = '10000000-0000-4000-8000-000000000001'
const start = '10000000-0000-4000-8000-000000000012'
const bench = '10000000-0000-4000-8000-000000000011'
const sell = '10000000-0000-4000-8000-000000000013'
const guest = 'a'.repeat(64)
const userId = '20000000-0000-4000-8000-000000000001'
const migratedUserId = '20000000-0000-4000-8000-000000000002'

describe('Make the Call database boundary', () => {
  beforeAll(async () => {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin;
      create schema auth;
      create table auth.users(id uuid primary key);
      create table public.profiles(
        id uuid primary key references auth.users(id) on delete cascade,
        xp integer not null default 0,
        updated_at timestamptz not null default now()
      );
      create table public.mode_stats(
        user_id uuid not null references auth.users(id) on delete cascade,
        mode text not null,
        rating integer not null default 1000,
        xp integer not null default 0,
        quizzes_completed integer not null default 0,
        correct_answers integer not null default 0,
        total_answers integer not null default 0,
        perfect_quizzes integer not null default 0,
        best_score integer not null default 0,
        updated_at timestamptz not null default now(),
        primary key(user_id, mode)
      );
      insert into auth.users(id) values ('${userId}'), ('${migratedUserId}');
    `)
    await db.exec(migration)
  })

  afterAll(async () => db.close())

  it('hides all community totals before this guest submits', async () => {
    const result = await db.query<{ value: { vote: null; results: null } }>(
      'select public.get_make_call_game_private($1,$2,$3,$4) value',
      ['mbappe-haaland-yamal', null, guest, null],
    )
    expect(result.rows[0]!.value.vote).toBeNull()
    expect(result.rows[0]!.value.results).toBeNull()
  })

  it('creates a valid guest vote and reveals genuine totals', async () => {
    const result = await db.query<{ value: { results: { sample_size: number; exact_count: number; start_counts: Record<string, number> } } }>(
      'select public.submit_make_call_vote_private($1,$2,$3,$4,$5,$6) value',
      [matchup, start, bench, sell, null, guest],
    )
    expect(result.rows[0]!.value.results.sample_size).toBe(1)
    expect(result.rows[0]!.value.results.exact_count).toBe(1)
    expect(result.rows[0]!.value.results.start_counts[start]).toBe(1)
  })

  it('updates a repeat guest call without increasing the sample', async () => {
    const result = await db.query<{ value: { results: { sample_size: number } } }>(
      'select public.submit_make_call_vote_private($1,$2,$3,$4,$5,$6) value',
      [matchup, bench, start, sell, null, guest],
    )
    expect(result.rows[0]!.value.results.sample_size).toBe(1)
  })

  it('does not loop a player back to a call they already completed', async () => {
    const result = await db.query<{ value: { matchup: null } }>(
      'select public.get_make_call_game_private($1,$2,$3,$4) value',
      [null, null, guest, null],
    )
    expect(result.rows[0]!.value.matchup).toBeNull()
  })

  it('rejects repeated choices and players outside the matchup', async () => {
    await expect(db.query(
      'select public.submit_make_call_vote_private($1,$2,$3,$4,$5,$6)',
      [matchup, start, start, sell, userId, 'b'.repeat(64)],
    )).rejects.toThrow('three different players')
    await expect(db.query(
      'select public.submit_make_call_vote_private($1,$2,$3,$4,$5,$6)',
      [matchup, start, bench, '30000000-0000-4000-8000-000000000001', userId, 'b'.repeat(64)],
    )).rejects.toThrow('belong to this matchup')
  })

  it('awards authenticated XP once and never double-counts a changed call', async () => {
    const first = await db.query<{ value: { xp_awarded_now: number; results: { sample_size: number } } }>(
      'select public.submit_make_call_vote_private($1,$2,$3,$4,$5,$6) value',
      [matchup, start, bench, sell, userId, 'b'.repeat(64)],
    )
    expect(first.rows[0]!.value.xp_awarded_now).toBe(5)
    expect(first.rows[0]!.value.results.sample_size).toBe(2)

    const retry = await db.query<{ value: { xp_awarded_now: number; results: { sample_size: number } } }>(
      'select public.submit_make_call_vote_private($1,$2,$3,$4,$5,$6) value',
      [matchup, bench, start, sell, userId, 'b'.repeat(64)],
    )
    expect(retry.rows[0]!.value.xp_awarded_now).toBe(0)
    expect(retry.rows[0]!.value.results.sample_size).toBe(2)
    const profile = await db.query<{ xp: number }>('select xp from public.profiles where id=$1', [userId])
    expect(profile.rows[0]!.xp).toBe(5)
  })

  it('moves a guest call into a newly signed-in account without inflating totals or granting retroactive XP', async () => {
    const migratingGuest = 'd'.repeat(64)
    const guestResult = await db.query<{ value: { results: { sample_size: number } } }>(
      'select public.submit_make_call_vote_private($1,$2,$3,$4,$5,$6) value',
      [matchup, sell, bench, start, null, migratingGuest],
    )
    expect(guestResult.rows[0]!.value.results.sample_size).toBe(3)

    const signedInResult = await db.query<{ value: { xp_awarded_now: number; results: { sample_size: number } } }>(
      'select public.submit_make_call_vote_private($1,$2,$3,$4,$5,$6) value',
      [matchup, sell, bench, start, migratedUserId, migratingGuest],
    )
    expect(signedInResult.rows[0]!.value.results.sample_size).toBe(3)
    expect(signedInResult.rows[0]!.value.xp_awarded_now).toBe(0)
    const migrated = await db.query<{ user_id: string; guest_session_hash: null }>(
      'select user_id, guest_session_hash from public.make_call_votes where matchup_id=$1 and user_id=$2',
      [matchup, migratedUserId],
    )
    expect(migrated.rows).toEqual([{ user_id: migratedUserId, guest_session_hash: null }])
  })

  it('enforces the 15 XP daily cap across unique matchups', async () => {
    for (let round = 2; round <= 4; round += 1) {
      const matchupId = `10000000-0000-4000-8000-00000000000${round}`
      const playerIds = [1, 2, 3].map((index) => `10000000-0000-4000-8${round}00-00000000000${index}`)
      await db.query("insert into public.make_call_matchups(id,slug,status,sort_order) values($1,$2,'active',$3)", [matchupId, `round-${round}`, round])
      for (let index = 0; index < 3; index += 1) {
        await db.query(`insert into public.make_call_players(
          id,matchup_id,stable_player_id,display_name,short_name,club_name,position_label,initials,accent_from,accent_to,display_order
        ) values($1,$2,$3,$4,$4,'Test FC','Forward','T','#112233','#445566',$5)`, [playerIds[index], matchupId, `player-${round}-${index}`, `Player ${round}${index}`, index + 1])
      }
      const result = await db.query<{ value: { xp_awarded_now: number } }>(
        'select public.submit_make_call_vote_private($1,$2,$3,$4,$5,$6) value',
        [matchupId, playerIds[0], playerIds[1], playerIds[2], userId, 'b'.repeat(64)],
      )
      expect(result.rows[0]!.value.xp_awarded_now).toBe(round <= 3 ? 5 : 0)
    }
    const profile = await db.query<{ xp: number }>('select xp from public.profiles where id=$1', [userId])
    expect(profile.rows[0]!.xp).toBe(15)
  })

  it('keeps raw tables and private functions unavailable to browser roles', async () => {
    await expect(db.exec('set role anon; select * from public.make_call_votes; reset role;')).rejects.toThrow(/permission denied/i)
    await db.exec('reset role;')
    await expect(db.exec(`set role authenticated; select public.get_make_call_game_private(null,null,'${'c'.repeat(64)}',null); reset role;`)).rejects.toThrow(/permission denied/i)
    await db.exec('reset role;')
  })
})
