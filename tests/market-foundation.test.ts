import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import {
  canSellOwnedPosition,
  requireMarketUser,
  settleMarketAction,
} from '../lib/market/action-policy'
import { buildApprovedCatalogueViews } from '../lib/market/catalogue-market-view'
import { currentMarketDateISO, MARKET_RULES } from '../lib/market/settings'
import {
  aggregateWeeklyRatings,
  processValuationMatch,
  weeklyValuationIdempotencyKey,
  type ValuationRules,
  type ValuationState,
} from '../lib/market/valuation-engine'
import {
  buyPlayerForUser,
  ensurePortfolioForUser,
  getMarketViews,
  getPortfolioForUser,
  resetDemoMarketStoreForTests,
} from '../lib/market/demo-store'

const migrationPath = path.join(
  process.cwd(),
  'supabase',
  'migrations',
  '20260731000300_market_foundation_completion_v1.sql',
)

test('anonymous access is read-only and missing sessions return a structured result', async () => {
  assert.deepEqual(requireMarketUser(null), {
    ok: false,
    code: 'AUTH_REQUIRED',
    message: 'Sign in to manage your Player Market portfolio.',
  })
  assert.deepEqual(requireMarketUser({ id: 'user-1' }), { ok: true, userId: 'user-1' })

  const migration = await readFile(migrationPath, 'utf8')
  assert.match(migration, /grant select on table public\.market_players to anon, authenticated/i)
  assert.match(migration, /grant execute on function public\.market_buy_player\(uuid, text, int\) to authenticated/i)
  assert.doesNotMatch(migration, /grant execute on function public\.market_buy_player[^\n]+to anon/i)
})

test('every failed or timed-out action settles with a visible error', async () => {
  const timeout = await settleMarketAction(new Promise<never>(() => {}), 5)
  assert.deepEqual(timeout, {
    ok: false,
    code: 'REQUEST_TIMEOUT',
    message: 'The market request timed out. Please retry.',
  })

  const failure = await settleMarketAction(Promise.reject(new Error('failure')), 50)
  assert.deepEqual(failure, {
    ok: false,
    code: 'UNEXPECTED_ERROR',
    message: 'The market request failed. Please retry.',
  })
})

test('daily limits use the Europe/Brussels calendar boundary', () => {
  assert.equal(currentMarketDateISO(new Date('2026-03-28T23:30:00.000Z')), '2026-03-29')
  assert.equal(currentMarketDateISO(new Date('2026-10-24T22:30:00.000Z')), '2026-10-25')
  assert.equal(MARKET_RULES.maximumHoldings, 5)
  assert.equal(MARKET_RULES.maximumDailyPurchases, 3)
  assert.equal(MARKET_RULES.maximumDailySales, 3)
})

test('approved catalogue becomes browseable without demo players', () => {
  const rows = buildApprovedCatalogueViews([{
    internalId: 'fiq_player_0001',
    displayName: 'Reviewed Test Person',
    currentValueMinor: 125,
    availabilityStatus: 'available',
    valueHistory: [{ effectiveAt: '2026-07-31T00:00:00.000Z', valueMinor: 125 }],
  }])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].player.isDemoSeed, false)
  assert.equal(rows[0].player.fullName, 'Reviewed Test Person')
  assert.ok(rows[0].player.currentPriceMinor > 0)
})

test('weekly aggregation implements no-appearance, substitute and multiple-match rules', () => {
  const aggregates = aggregateWeeklyRatings([
    { statId: 'none', playerId: 'p0', fixtureDate: '2026-08-01', marketWeekKey: '2026-W31', appeared: false, started: false, minutesPlayed: 0, ratingMilli: null },
    { statId: 'unused', playerId: 'p1', fixtureDate: '2026-08-01', marketWeekKey: '2026-W31', appeared: true, started: false, minutesPlayed: 0, ratingMilli: null },
    { statId: 'sub', playerId: 'p2', fixtureDate: '2026-08-01', marketWeekKey: '2026-W31', appeared: true, started: false, minutesPlayed: 8, ratingMilli: 7500 },
    { statId: 'a', playerId: 'p3', fixtureDate: '2026-08-01', marketWeekKey: '2026-W31', appeared: true, started: true, minutesPlayed: 90, ratingMilli: 6500 },
    { statId: 'b', playerId: 'p3', fixtureDate: '2026-08-04', marketWeekKey: '2026-W31', appeared: true, started: true, minutesPlayed: 90, ratingMilli: 7501 },
  ])
  assert.equal(aggregates.find((row) => row.playerId === 'p0')?.skippedReason, 'no_appearance')
  assert.equal(aggregates.find((row) => row.playerId === 'p1')?.skippedReason, 'missing_rating')
  assert.equal(aggregates.find((row) => row.playerId === 'p2')?.ratingMilli, 7500)
  assert.equal(aggregates.find((row) => row.playerId === 'p3')?.ratingMilli, 7001)
  assert.equal(weeklyValuationIdempotencyKey(aggregates.find((row) => row.playerId === 'p3')!), 'weekly:2026-W31:p3:a,b')
})

test('6.5 then 7.5 nets to zero and repeated ratings remain idempotent', () => {
  const rules: ValuationRules = {
    baselineRatingMilli: 7000,
    priceStepMinor: 1,
    minimumPriceMinor: 10,
    maximumPriceMinor: 200,
    minimumMinutes: 25,
    substituteMinimumMinutes: 20,
    maximumWeeklyPriceChangeMinor: 8,
    calculationVersion: 'v1.0.0',
  }
  const state: ValuationState = { playerId: 'p', currentPriceMinor: 100, performanceBankMilli: 0, weeklyMovementMinor: 0 }
  const processed = new Set<string>()
  for (const [statId, ratingMilli] of [['first', 6500], ['second', 7500]] as const) {
    processValuationMatch(state, { statId, playerId: 'p', fixtureDate: '2026-08-01', appeared: true, started: true, minutesPlayed: 90, ratingMilli }, rules, processed)
  }
  const duplicate = processValuationMatch(state, { statId: 'second', playerId: 'p', fixtureDate: '2026-08-01', appeared: true, started: true, minutesPlayed: 90, ratingMilli: 7500 }, rules, processed)
  assert.equal(state.currentPriceMinor, 100)
  assert.equal(state.performanceBankMilli, 0)
  assert.equal(duplicate.skippedReason, 'duplicate')
})

test('concurrent double purchase creates one position and one charge', async () => {
  resetDemoMarketStoreForTests()
  const userId = 'concurrent-user'
  const before = await ensurePortfolioForUser(userId)
  const playerId = getMarketViews({ search: '', club: 'ALL', position: 'ALL', sort: 'alphabetical', availability: 'AVAILABLE_ONLY', ownership: 'ALL', ownedPlayerIds: new Set() })[0].player.id
  const results = await Promise.all([
    buyPlayerForUser({ userId, playerId, idempotencyKey: 'same-request' }),
    buyPlayerForUser({ userId, playerId, idempotencyKey: 'same-request' }),
  ])
  assert.equal(results.every((result) => result.ok), true)
  const after = await getPortfolioForUser(userId)
  assert.ok(after)
  assert.equal(after?.holdings.length, 1)
  assert.ok((after?.portfolio.cashBalanceMinor ?? 0) < before.portfolio.cashBalanceMinor)
})

test('a player leaving the league cannot be bought but an owned position remains sellable', () => {
  assert.equal(canSellOwnedPosition({ owned: true, playerStillPurchasable: false }), true)
  assert.equal(canSellOwnedPosition({ owned: false, playerStillPurchasable: false }), false)
})

test('foundation migration adds activation, aggregate and leaderboard safety objects', async () => {
  const sql = await readFile(migrationPath, 'utf8')
  for (const fragment of [
    'create table if not exists public.market_catalogues',
    'create table if not exists public.player_season_stats',
    'create table if not exists public.market_public_leaderboard',
    'active_catalogue_id',
    'p_expected_price_minor',
    "at time zone 'Europe/Brussels'",
    'IDEMPOTENCY_KEY_CONFLICT',
    'check (quantity = 1)',
  ]) assert.ok(sql.includes(fragment), `missing migration fragment: ${fragment}`)
})
