import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseMoneyToMinor,
  formatMinorToMoney,
  percentageReturnBps,
  formatBpsToPercent,
} from '../lib/market/decimal'
import {
  processValuationMatch,
  ratingToMilli,
  type ValuationRules,
  type ValuationState,
} from '../lib/market/valuation-engine'
import { filterAndSortPlayers } from '../lib/market/filters'
import {
  appendMarketSystemLog,
  buyPlayerForUser,
  getMarketAdminDashboardView,
  getMarketLeaderboardBundle,
  getOwnedPlayerIdsForUser,
  getPortfolioForUser,
  getPlayerProfileBySlug,
  getMarketViews,
  resetDemoMarketStoreForTests,
  setMarketImportStatus,
  setMarketWeeklyStatus,
  sellPlayerForUser,
  ensurePortfolioForUser,
} from '../lib/market/demo-store'
import {
  PUBLIC_MARKET_SEASON_KEY,
  type MarketCatalogueRecord,
  validatePublicMarketCatalogue,
} from '../lib/market/catalogue'
import { PLAYER_MARKET_HOME_FEATURE } from '../lib/market/home-feature'
import { MARKET_RULES } from '../lib/market/settings'
import {
  isAuthorizedPortfolioAccess,
  validateBuyConstraints,
  validateSellConstraints,
} from '../lib/market/portfolio-logic'

const rules: ValuationRules = {
  baselineRatingMilli: 7000,
  priceStepMinor: 1,
  minimumPriceMinor: 10,
  maximumPriceMinor: 200,
  minimumMinutes: 25,
  substituteMinimumMinutes: 20,
  maximumWeeklyPriceChangeMinor: 8,
  calculationVersion: 'v1.0.0-test',
}

function state(priceMinor = 100, bankMilli = 0): ValuationState {
  return {
    playerId: 'p1',
    currentPriceMinor: priceMinor,
    performanceBankMilli: bankMilli,
    weeklyMovementMinor: 0,
  }
}

test('safe decimal calculations', () => {
  assert.equal(parseMoneyToMinor('12.3'), 123)
  assert.equal(formatMinorToMoney(123), '12.3')
  assert.equal(percentageReturnBps(1300, 1200), 833)
  assert.equal(formatBpsToPercent(833), '8.33%')
})

test('valuation banking example: 6.5 then 7.5 returns to zero bank and no move', () => {
  const s = state(100, 0)
  const processed = new Set<string>()

  processValuationMatch(
    s,
    {
      statId: 'm1',
      playerId: 'p1',
      fixtureDate: '2026-08-01',
      appeared: true,
      started: true,
      minutesPlayed: 90,
      ratingMilli: ratingToMilli(6.5),
    },
    rules,
    processed,
  )

  processValuationMatch(
    s,
    {
      statId: 'm2',
      playerId: 'p1',
      fixtureDate: '2026-08-08',
      appeared: true,
      started: true,
      minutesPlayed: 90,
      ratingMilli: ratingToMilli(7.5),
    },
    rules,
    processed,
  )

  assert.equal(s.currentPriceMinor, 100)
  assert.equal(s.performanceBankMilli, 0)
})

test('valuation example: 8.0 yields +0.1 and zero bank', () => {
  const s = state(100, 0)
  const result = processValuationMatch(
    s,
    {
      statId: 'm3',
      playerId: 'p1',
      fixtureDate: '2026-08-15',
      appeared: true,
      started: true,
      minutesPlayed: 90,
      ratingMilli: ratingToMilli(8.0),
    },
    rules,
    new Set<string>(),
  )

  assert.equal(result.applied, true)
  assert.equal(s.currentPriceMinor, 101)
  assert.equal(s.performanceBankMilli, 0)
})

test('valuation example: 7.4 then 7.7 leaves +0.1 bank after +0.1 price move', () => {
  const s = state(100, 0)
  const processed = new Set<string>()

  processValuationMatch(
    s,
    {
      statId: 'm4',
      playerId: 'p1',
      fixtureDate: '2026-08-22',
      appeared: true,
      started: true,
      minutesPlayed: 90,
      ratingMilli: ratingToMilli(7.4),
    },
    rules,
    processed,
  )

  processValuationMatch(
    s,
    {
      statId: 'm5',
      playerId: 'p1',
      fixtureDate: '2026-08-29',
      appeared: true,
      started: true,
      minutesPlayed: 90,
      ratingMilli: ratingToMilli(7.7),
    },
    rules,
    processed,
  )

  assert.equal(s.currentPriceMinor, 101)
  assert.equal(s.performanceBankMilli, 100)
})

test('valuation example: 6.2 creates -0.8 bank without immediate movement', () => {
  const s = state(100, 0)
  processValuationMatch(
    s,
    {
      statId: 'm6',
      playerId: 'p1',
      fixtureDate: '2026-09-05',
      appeared: true,
      started: true,
      minutesPlayed: 90,
      ratingMilli: ratingToMilli(6.2),
    },
    rules,
    new Set<string>(),
  )

  assert.equal(s.currentPriceMinor, 100)
  assert.equal(s.performanceBankMilli, -800)
})

test('valuation example: -0.8 bank then 6.7 drops price and leaves -0.1 bank', () => {
  const s = state(100, -800)
  processValuationMatch(
    s,
    {
      statId: 'm7',
      playerId: 'p1',
      fixtureDate: '2026-09-12',
      appeared: true,
      started: true,
      minutesPlayed: 90,
      ratingMilli: ratingToMilli(6.7),
    },
    rules,
    new Set<string>(),
  )

  assert.equal(s.currentPriceMinor, 99)
  assert.equal(s.performanceBankMilli, -100)
})

test('duplicate match stat is not double-applied', () => {
  const s = state(100, 0)
  const processed = new Set<string>()

  const first = processValuationMatch(
    s,
    {
      statId: 'dup-1',
      playerId: 'p1',
      fixtureDate: '2026-09-19',
      appeared: true,
      started: true,
      minutesPlayed: 90,
      ratingMilli: ratingToMilli(8.0),
    },
    rules,
    processed,
  )

  const second = processValuationMatch(
    s,
    {
      statId: 'dup-1',
      playerId: 'p1',
      fixtureDate: '2026-09-19',
      appeared: true,
      started: true,
      minutesPlayed: 90,
      ratingMilli: ratingToMilli(8.0),
    },
    rules,
    processed,
  )

  assert.equal(first.applied, true)
  assert.equal(second.applied, false)
  assert.equal(second.skippedReason, 'duplicate')
  assert.equal(s.currentPriceMinor, 101)
})

test('minimum price is enforced', () => {
  const s = state(10, -900)
  processValuationMatch(
    s,
    {
      statId: 'min-1',
      playerId: 'p1',
      fixtureDate: '2026-09-26',
      appeared: true,
      started: true,
      minutesPlayed: 90,
      ratingMilli: ratingToMilli(6.0),
    },
    rules,
    new Set<string>(),
  )

  assert.equal(s.currentPriceMinor, 10)
})

test('maximum weekly movement is enforced', () => {
  const s = state(100, 0)
  const tightRules = { ...rules, maximumWeeklyPriceChangeMinor: 1 }
  const processed = new Set<string>()

  processValuationMatch(
    s,
    {
      statId: 'cap-1',
      playerId: 'p1',
      fixtureDate: '2026-10-01',
      appeared: true,
      started: true,
      minutesPlayed: 90,
      ratingMilli: ratingToMilli(9.5),
    },
    tightRules,
    processed,
  )

  assert.equal(s.currentPriceMinor, 101)
})

test('portfolio constraint helpers enforce buy/sell rules and ownership checks', () => {
  assert.equal(
    validateBuyConstraints({
      holdingsCount: 0,
      purchasesToday: 0,
      balanceMinor: 50,
      playerPriceMinor: 90,
      alreadyOwned: false,
    }).ok,
    false,
  )

  assert.equal(
    validateBuyConstraints({
      holdingsCount: 5,
      purchasesToday: 0,
      balanceMinor: 100,
      playerPriceMinor: 90,
      alreadyOwned: false,
    }).ok,
    false,
  )

  assert.equal(validateSellConstraints({ salesToday: 3, ownsPlayer: true }).ok, false)
  assert.equal(isAuthorizedPortfolioAccess('u1', 'u2'), false)
})

function verifiedCatalogueRecord(overrides: Partial<MarketCatalogueRecord> = {}): MarketCatalogueRecord {
  return {
    seasonKey: PUBLIC_MARKET_SEASON_KEY,
    providerPlayerId: 'verified-player-1',
    fullName: 'Verified Player',
    clubName: 'Coventry City',
    position: 'MID',
    sourceType: 'approved-provider',
    sourceReference: 'approved-provider:player:verified-player-1',
    verifiedAt: '2026-07-31T00:00:00.000Z',
    isActive: true,
    ...overrides,
  }
}

test('public market catalogue fails closed for generated, duplicate, stale and unverified records', () => {
  const generated = verifiedCatalogueRecord({
    providerPlayerId: 'generated-1',
    sourceType: 'generated' as MarketCatalogueRecord['sourceType'],
  })
  const duplicateOne = verifiedCatalogueRecord({ providerPlayerId: 'duplicate-1' })
  const duplicateTwo = verifiedCatalogueRecord({ providerPlayerId: 'duplicate-1', fullName: 'Duplicate Copy' })
  const stale = verifiedCatalogueRecord({ providerPlayerId: 'stale-1', seasonKey: '2024/25' })
  const unverified = verifiedCatalogueRecord({ providerPlayerId: 'unverified-1', sourceReference: '' })

  const result = validatePublicMarketCatalogue([generated, duplicateOne, duplicateTwo, stale, unverified])

  assert.deepEqual(result.accepted, [])
  assert.deepEqual(
    result.rejected.map((item) => item.code),
    ['UNSUPPORTED_SOURCE', 'DUPLICATE_IDENTITY', 'DUPLICATE_IDENTITY', 'STALE_SEASON', 'UNVERIFIED_SOURCE'],
  )
})

test('2026/27 club boundary excludes relegated and ineligible clubs and accepts promoted clubs', () => {
  const clubs = [
    'Southampton',
    'Burnley',
    'Wolverhampton Wanderers',
    'Wolves',
    'West Ham United',
    'Coventry City',
    'Ipswich Town',
    'Hull City',
  ]
  const result = validatePublicMarketCatalogue(
    clubs.map((clubName, index) =>
      verifiedCatalogueRecord({
        providerPlayerId: `club-boundary-${index}`,
        fullName: `Boundary Player ${index}`,
        clubName,
      }),
    ),
  )

  assert.deepEqual(result.accepted.map((record) => record.clubName), ['Coventry City', 'Ipswich Town', 'Hull City'])
  assert.deepEqual(result.rejected.map((item) => item.code), [
    'INELIGIBLE_CLUB',
    'INELIGIBLE_CLUB',
    'INELIGIBLE_CLUB',
    'INELIGIBLE_CLUB',
    'INELIGIBLE_CLUB',
  ])
})

test('homepage Player Market feature is category-independent and preserves its CTA and rules', () => {
  assert.equal(PLAYER_MARKET_HOME_FEATURE.categoryIndependent, true)
  assert.equal(PLAYER_MARKET_HOME_FEATURE.actionLabel, 'Enter Player Market')
  assert.equal(PLAYER_MARKET_HOME_FEATURE.href, '/market')
  assert.deepEqual(PLAYER_MARKET_HOME_FEATURE.rules, [
    'Five-player maximum',
    'Three buys daily',
    'Three sales daily',
    'Virtual currency only',
  ])
  assert.equal(MARKET_RULES.maximumHoldings, 5)
  assert.equal(MARKET_RULES.maximumDailyPurchases, 3)
  assert.equal(MARKET_RULES.maximumDailySales, 3)
})

test('maximum 5 holdings are enforced and one-player portfolio remains valid', async () => {
  resetDemoMarketStoreForTests()
  const userId = 'one-player-validity-user'
  await ensurePortfolioForUser(userId)

  const rows = getMarketViews({
    search: '',
    club: 'ALL',
    position: 'ALL',
    sort: 'alphabetical',
    availability: 'AVAILABLE_ONLY',
    ownership: 'ALL',
    ownedPlayerIds: new Set<string>(),
  })

  const firstBuy = await buyPlayerForUser({ userId, playerId: rows[0].player.id, idempotencyKey: 'hold-1' })
  assert.equal(firstBuy.ok, true)

  const portfolio = await getPortfolioForUser(userId)
  assert.ok(portfolio)
  if (!portfolio) return

  assert.equal(portfolio.holdings.length, 1)
  assert.equal(portfolio.holdings[0].player.id, rows[0].player.id)
  assert.equal(portfolio.purchasesRemaining >= 0, true)
  assert.equal(portfolio.salesRemaining >= 0, true)

  const limitCheck = validateBuyConstraints({
    holdingsCount: 5,
    purchasesToday: 0,
    balanceMinor: portfolio.portfolio.cashBalanceMinor,
    playerPriceMinor: rows[1].player.currentPriceMinor,
    alreadyOwned: false,
  })
  assert.equal(limitCheck.ok, false)

  const refreshed = await getPortfolioForUser(userId)
  assert.ok(refreshed)
  if (!refreshed) return

  assert.equal(refreshed.holdings.length, 1)
  assert.equal(refreshed.portfolio.cashBalanceMinor, portfolio.portfolio.cashBalanceMinor)
})

test('demo-store buy/sell limits, balance checks, duplicate purchase and idempotency', async () => {
  resetDemoMarketStoreForTests()
  const userId = 'user-market-1'
  await ensurePortfolioForUser(userId)

  const rows = getMarketViews({
    search: '',
    club: 'ALL',
    position: 'ALL',
    sort: 'alphabetical',
    availability: 'ALL',
    ownership: 'ALL',
    ownedPlayerIds: new Set<string>(),
  })

  const availableIds = rows.filter((row) => row.player.isAvailable).map((row) => row.player.id)
  const target = availableIds[0]

  const first = await buyPlayerForUser({ userId, playerId: target, idempotencyKey: 'idem-1' })
  assert.equal(first.ok, true)

  const duplicateIdem = await buyPlayerForUser({ userId, playerId: target, idempotencyKey: 'idem-1' })
  assert.equal(duplicateIdem.ok, true)

  const duplicateHolding = await buyPlayerForUser({ userId, playerId: target, idempotencyKey: 'idem-2' })
  assert.equal(duplicateHolding.ok, false)

  // Fill purchase quota for today.
  await buyPlayerForUser({ userId, playerId: availableIds[1], idempotencyKey: 'idem-3' })
  await buyPlayerForUser({ userId, playerId: availableIds[2], idempotencyKey: 'idem-4' })
  const overPurchaseLimit = await buyPlayerForUser({ userId, playerId: availableIds[3], idempotencyKey: 'idem-5' })
  assert.equal(overPurchaseLimit.ok, false)

  const sellOne = await sellPlayerForUser({ userId, playerId: availableIds[1], idempotencyKey: 'idem-s1' })
  assert.equal(sellOne.ok, true)

  const sellTwo = await sellPlayerForUser({ userId, playerId: availableIds[2], idempotencyKey: 'idem-s2' })
  assert.equal(sellTwo.ok, true)

  const sellThree = await sellPlayerForUser({ userId, playerId: target, idempotencyKey: 'idem-s3' })
  assert.equal(sellThree.ok, true)

  const sellOverLimit = await sellPlayerForUser({ userId, playerId: availableIds[3], idempotencyKey: 'idem-s4' })
  assert.equal(sellOverLimit.ok, false)

  const sellNotOwned = await sellPlayerForUser({ userId, playerId: availableIds[4], idempotencyKey: 'idem-s5' })
  assert.equal(sellNotOwned.ok, false)

  // Force insufficient balance by attempting expensive buys until blocked.
  resetDemoMarketStoreForTests()
  const lowUser = 'user-market-2'
  await ensurePortfolioForUser(lowUser)
  const lowRows = getMarketViews({
    search: '',
    club: 'ALL',
    position: 'ALL',
    sort: 'price-desc',
    availability: 'ALL',
    ownership: 'ALL',
    ownedPlayerIds: new Set<string>(),
  }).filter(
    (row) => row.player.isAvailable,
  )
  const expensive = lowRows[0].player.id
  await buyPlayerForUser({ userId: lowUser, playerId: expensive, idempotencyKey: 'b1' })
  await buyPlayerForUser({ userId: lowUser, playerId: lowRows[1].player.id, idempotencyKey: 'b2' })
  await buyPlayerForUser({ userId: lowUser, playerId: lowRows[2].player.id, idempotencyKey: 'b3' })
  const blocked = await buyPlayerForUser({ userId: lowUser, playerId: lowRows[3].player.id, idempotencyKey: 'b4' })
  assert.equal(blocked.ok, false)
})

test('filtering and sorting utilities work for market browse', () => {
  const rows = getMarketViews({
    search: '',
    club: 'ALL',
    position: 'ALL',
    sort: 'alphabetical',
    availability: 'ALL',
    ownership: 'ALL',
    ownedPlayerIds: new Set<string>(),
  })

  const gkSample = rows.find((item) => item.player.positionGroup === 'GK')
  assert.ok(Boolean(gkSample))
  if (!gkSample) return

  const searchToken = (gkSample.player.displayName.split(' ')[0] || gkSample.player.displayName).toLowerCase()

  const filtered = filterAndSortPlayers(rows, {
    search: searchToken,
    club: 'ALL',
    position: 'GK',
    sort: 'price-asc',
    availability: 'ALL',
    ownership: 'ALL',
    ownedPlayerIds: new Set<string>(),
  })

  assert.ok(filtered.length >= 1)
  assert.ok(filtered.every((item) => item.player.positionGroup === 'GK'))

  const sortedDesc = filterAndSortPlayers(rows, {
    search: '',
    club: 'ALL',
    position: 'ALL',
    sort: 'price-desc',
    availability: 'ALL',
    ownership: 'ALL',
    ownedPlayerIds: new Set<string>(),
  })

  assert.ok(sortedDesc[0].player.currentPriceMinor >= sortedDesc[1].player.currentPriceMinor)

  const sortedByClub = filterAndSortPlayers(rows, {
    search: '',
    club: 'ALL',
    position: 'ALL',
    sort: 'club-asc',
    availability: 'ALL',
    ownership: 'ALL',
    ownedPlayerIds: new Set<string>(),
  })

  assert.ok(sortedByClub[0].club.name.localeCompare(sortedByClub[1].club.name) <= 0)
})

test('availability-only and owned-only filters work', async () => {
  resetDemoMarketStoreForTests()
  const userId = 'filter-user-1'
  await ensurePortfolioForUser(userId)

  const baseRows = getMarketViews({
    search: '',
    club: 'ALL',
    position: 'ALL',
    sort: 'alphabetical',
    availability: 'ALL',
    ownership: 'ALL',
    ownedPlayerIds: new Set<string>(),
  })

  const buyable = baseRows.find((row) => row.player.isAvailable)
  assert.ok(Boolean(buyable))
  if (!buyable) return

  await buyPlayerForUser({ userId, playerId: buyable.player.id, idempotencyKey: 'own-1' })
  const ownedIds = new Set(getOwnedPlayerIdsForUser(userId))

  const availableOnly = filterAndSortPlayers(baseRows, {
    search: '',
    club: 'ALL',
    position: 'ALL',
    sort: 'alphabetical',
    availability: 'AVAILABLE_ONLY',
    ownership: 'ALL',
    ownedPlayerIds: ownedIds,
  })
  assert.ok(availableOnly.every((row) => row.player.isAvailable))

  const ownedOnly = filterAndSortPlayers(baseRows, {
    search: '',
    club: 'ALL',
    position: 'ALL',
    sort: 'alphabetical',
    availability: 'ALL',
    ownership: 'OWNED_ONLY',
    ownedPlayerIds: ownedIds,
  })
  assert.equal(ownedOnly.length, 1)
  assert.equal(ownedOnly[0].player.id, buyable.player.id)
})

test('portfolio totals, leaderboard bundle, and profile history views are available', async () => {
  resetDemoMarketStoreForTests()
  const userA = 'leader-user-a'
  const userB = 'leader-user-b'
  await ensurePortfolioForUser(userA)
  await ensurePortfolioForUser(userB)

  const rows = getMarketViews({
    search: '',
    club: 'ALL',
    position: 'ALL',
    sort: 'price-desc',
    availability: 'AVAILABLE_ONLY',
    ownership: 'ALL',
    ownedPlayerIds: new Set<string>(),
  })

  await buyPlayerForUser({ userId: userA, playerId: rows[0].player.id, idempotencyKey: 'la-1' })
  await buyPlayerForUser({ userId: userB, playerId: rows[1].player.id, idempotencyKey: 'lb-1' })

  const portfolioA = await ensurePortfolioForUser(userA)
  assert.ok(typeof portfolioA.weeklyChangeMinor === 'number')
  assert.ok(typeof portfolioA.allTimeProfitMinor === 'number')

  const leaderboard = getMarketLeaderboardBundle()
  assert.ok(leaderboard.byPortfolioValue.length >= 2)
  assert.ok(leaderboard.byWeeklyGain.length >= 2)
  assert.ok(leaderboard.byAllTimeGain.length >= 2)
  assert.ok(leaderboard.byReturnPercent.length >= 2)
  assert.ok(Boolean(leaderboard.mostProfitableTrader))

  const profile = getPlayerProfileBySlug(rows[0].player.slug)
  assert.ok(Boolean(profile))
  if (!profile) return
  assert.ok(Array.isArray(profile.priceHistory))
  assert.ok(Array.isArray(profile.valuationHistory))
  assert.ok(Array.isArray(profile.transactionHistory))
})

test('admin dashboard status/log store updates on import and weekly operations', () => {
  resetDemoMarketStoreForTests()

  setMarketImportStatus({
    lastImportAt: '2026-07-27T10:00:00.000Z',
    queuedFixtures: 12,
    message: 'Dry-run import completed.',
    dryRun: true,
    source: 'api-football',
  })

  setMarketWeeklyStatus({
    lastValuationAt: '2026-07-27T11:00:00.000Z',
    lastFixtureProcessedAt: '2026-07-27T10:59:00.000Z',
    queuedFixtures: 2,
    message: 'Weekly run completed.',
    dryRun: false,
    source: 'weekly-job',
  })

  appendMarketSystemLog({
    type: 'valuation',
    source: 'manual-test',
    dryRun: true,
    message: 'Additional dry-run log',
  })

  const dashboard = getMarketAdminDashboardView()
  assert.equal(dashboard.lastImportAt, '2026-07-27T10:00:00.000Z')
  assert.equal(dashboard.lastValuationAt, '2026-07-27T11:00:00.000Z')
  assert.equal(dashboard.queuedFixtures, 2)
  assert.ok(dashboard.processingLog.length >= 3)
})

test('failed buy and sell attempts do not mutate holdings or balances', async () => {
  resetDemoMarketStoreForTests()
  const userId = 'mutation-safety-user'
  await ensurePortfolioForUser(userId)

  const rows = getMarketViews({
    search: '',
    club: 'ALL',
    position: 'ALL',
    sort: 'price-desc',
    availability: 'AVAILABLE_ONLY',
    ownership: 'ALL',
    ownedPlayerIds: new Set<string>(),
  })

  const firstBuy = await buyPlayerForUser({ userId, playerId: rows[0].player.id, idempotencyKey: 'mut-b1' })
  assert.equal(firstBuy.ok, true)

  const beforeFailure = await getPortfolioForUser(userId)
  assert.ok(beforeFailure)
  if (!beforeFailure) return

  const duplicateBuy = await buyPlayerForUser({ userId, playerId: rows[0].player.id, idempotencyKey: 'mut-b2' })
  assert.equal(duplicateBuy.ok, false)

  const unownedSell = await sellPlayerForUser({ userId, playerId: rows[4].player.id, idempotencyKey: 'mut-s1' })
  assert.equal(unownedSell.ok, false)

  const afterFailure = await getPortfolioForUser(userId)
  assert.ok(afterFailure)
  if (!afterFailure) return

  assert.equal(afterFailure.holdings.length, beforeFailure.holdings.length)
  assert.equal(afterFailure.portfolio.cashBalanceMinor, beforeFailure.portfolio.cashBalanceMinor)
  assert.equal(afterFailure.portfolio.totalPortfolioValueMinor, beforeFailure.portfolio.totalPortfolioValueMinor)
})

test('duplicate sell idempotency returns stable portfolio state', async () => {
  resetDemoMarketStoreForTests()
  const userId = 'sell-idempotency-user'
  await ensurePortfolioForUser(userId)

  const rows = getMarketViews({
    search: '',
    club: 'ALL',
    position: 'ALL',
    sort: 'alphabetical',
    availability: 'AVAILABLE_ONLY',
    ownership: 'ALL',
    ownedPlayerIds: new Set<string>(),
  })

  const playerId = rows[0].player.id
  const bought = await buyPlayerForUser({ userId, playerId, idempotencyKey: 'sell-idem-buy' })
  assert.equal(bought.ok, true)

  const sold = await sellPlayerForUser({ userId, playerId, idempotencyKey: 'sell-idem-key' })
  assert.equal(sold.ok, true)

  const soldAgain = await sellPlayerForUser({ userId, playerId, idempotencyKey: 'sell-idem-key' })
  assert.equal(soldAgain.ok, true)

  const snapshotA = await getPortfolioForUser(userId)
  const snapshotB = await getPortfolioForUser(userId)
  assert.ok(snapshotA && snapshotB)
  if (!snapshotA || !snapshotB) return

  assert.equal(snapshotA.holdings.length, 0)
  assert.equal(snapshotA.portfolio.cashBalanceMinor, snapshotB.portfolio.cashBalanceMinor)
  assert.equal(snapshotA.portfolio.totalPortfolioValueMinor, snapshotB.portfolio.totalPortfolioValueMinor)
})

test('portfolio refresh consistency after authenticated transactions', async () => {
  resetDemoMarketStoreForTests()
  const userId = 'refresh-consistency-user'
  await ensurePortfolioForUser(userId)

  const rows = getMarketViews({
    search: '',
    club: 'ALL',
    position: 'ALL',
    sort: 'alphabetical',
    availability: 'AVAILABLE_ONLY',
    ownership: 'ALL',
    ownedPlayerIds: new Set<string>(),
  })

  const a = rows[0].player.id
  const b = rows[1].player.id

  await buyPlayerForUser({ userId, playerId: a, idempotencyKey: 'refresh-b1' })
  await buyPlayerForUser({ userId, playerId: b, idempotencyKey: 'refresh-b2' })
  await sellPlayerForUser({ userId, playerId: a, idempotencyKey: 'refresh-s1' })

  const first = await getPortfolioForUser(userId)
  const second = await getPortfolioForUser(userId)
  const third = await getPortfolioForUser(userId)

  assert.ok(first && second && third)
  if (!first || !second || !third) return

  assert.equal(first.holdings.length, 1)
  assert.equal(first.holdings[0].player.id, b)
  assert.equal(first.portfolio.cashBalanceMinor, second.portfolio.cashBalanceMinor)
  assert.equal(second.portfolio.cashBalanceMinor, third.portfolio.cashBalanceMinor)
  assert.equal(first.portfolio.totalPortfolioValueMinor, second.portfolio.totalPortfolioValueMinor)
  assert.equal(second.portfolio.totalPortfolioValueMinor, third.portfolio.totalPortfolioValueMinor)
})
