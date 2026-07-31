import { DEMO_CLUBS, DEMO_PLAYERS, DEMO_SEASON } from './demo-seed'
import { percentageReturnBps } from './decimal'
import { filterAndSortPlayers, type MarketFilters } from './filters'
import { currentMarketDateISO, MARKET_RULES } from './settings'
import type {
  MarketAdminDashboardView,
  MarketClub,
  MarketDailyLimit,
  MarketHolding,
  MarketLeaderboardBundle,
  MarketLeaderboardRow,
  MarketPlayer,
  MarketPlayerMatchStat,
  MarketPlayerProfileView,
  MarketPlayerView,
  MarketPortfolio,
  MarketSystemLogEntry,
  MarketTransaction,
  MarketValuationEvent,
  PortfolioView,
} from './types'

type DemoPortfolioRecord = {
  portfolio: MarketPortfolio
  holdings: MarketHolding[]
  transactions: MarketTransaction[]
  dailyLimits: Map<string, MarketDailyLimit>
  idempotencyMap: Map<string, MarketTransaction>
}

type DemoStoreState = {
  seasonId: string
  clubsById: Map<string, MarketClub>
  playersById: Map<string, MarketPlayer>
  playersBySlug: Map<string, MarketPlayer>
  playerMatchStatsByPlayerId: Map<string, MarketPlayerMatchStat[]>
  valuationEventsByPlayerId: Map<string, MarketValuationEvent[]>
  portfoliosByUserId: Map<string, DemoPortfolioRecord>
  portfolioLocks: Map<string, Promise<unknown>>
  systemLogs: MarketSystemLogEntry[]
  provider: string
  lastImportAt: string | null
  lastValuationAt: string | null
  lastFixtureProcessedAt: string | null
  queuedFixtures: number
  marketVersion: number
  viewCache: Map<string, MarketPlayerView[]>
}

const globalKey = '__footballiq_market_demo_store__'

function nowISO(): string {
  return new Date().toISOString()
}

function toIsoDaysAgo(days: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString()
}

function createSeedValuationEvents(players: MarketPlayer[]): Map<string, MarketValuationEvent[]> {
  const events = new Map<string, MarketValuationEvent[]>()

  for (let index = 0; index < players.length; index += 1) {
    const player = players[index]
    const movement = player.currentPriceMinor - player.initialPriceMinor
    if (movement === 0 && player.performanceBankMilli === 0) {
      events.set(player.id, [])
      continue
    }

    const eventDate = toIsoDaysAgo((index % 6) + 1)
    const event: MarketValuationEvent = {
      id: `seed-val-${player.id}`,
      playerId: player.id,
      matchStatId: null,
      eventType: 'manual_adjustment',
      previousPriceMinor: player.initialPriceMinor,
      newPriceMinor: player.currentPriceMinor,
      previousBankMilli: player.performanceBankMilli,
      ratingMilli: player.latestRatingMilli ?? null,
      baselineRatingMilli: MARKET_RULES.universalBaselineRatingMilli,
      ratingDeltaMilli:
        typeof player.latestRatingMilli === 'number'
          ? player.latestRatingMilli - MARKET_RULES.universalBaselineRatingMilli
          : 0,
      bankAfterEventMilli: player.performanceBankMilli,
      priceChangeMinor: movement,
      reason: 'Development seed valuation state',
      calculationVersion: MARKET_RULES.valuationCalculationVersion,
      effectiveAt: eventDate,
      createdAt: eventDate,
      idempotencyKey: `seed-${player.id}`,
    }
    events.set(player.id, [event])
  }

  return events
}

function createInitialState(): DemoStoreState {
  const baseSeason = DEMO_SEASON
  const baseClubs = DEMO_CLUBS
  const basePlayers = DEMO_PLAYERS

  const clubsById = new Map(baseClubs.map((club) => [club.id, club]))
  const playersById = new Map(basePlayers.map((player) => [player.id, { ...player }]))
  const playersBySlug = new Map(Array.from(playersById.values()).map((player) => [player.slug, player]))
  const valuationEventsByPlayerId = createSeedValuationEvents(Array.from(playersById.values()))

  return {
    seasonId: baseSeason.id,
    clubsById,
    playersById,
    playersBySlug,
    playerMatchStatsByPlayerId: new Map(),
    valuationEventsByPlayerId,
    portfoliosByUserId: new Map(),
    portfolioLocks: new Map(),
    systemLogs: [],
    provider: 'deprecated-test-fixture',
    lastImportAt: null,
    lastValuationAt: null,
    lastFixtureProcessedAt: null,
    queuedFixtures: 0,
    marketVersion: 0,
    viewCache: new Map(),
  }
}

function invalidateMarketViewCache(store: DemoStoreState): void {
  store.marketVersion += 1
  store.viewCache.clear()
}

function getStore(): DemoStoreState {
  const value = globalThis as typeof globalThis & { [globalKey]?: DemoStoreState }
  if (!value[globalKey]) {
    value[globalKey] = createInitialState()
  }
  return value[globalKey]!
}

function createPortfolio(userId: string): DemoPortfolioRecord {
  const now = nowISO()
  return {
    portfolio: {
      id: `portfolio-${userId}`,
      userId,
      seasonId: DEMO_SEASON.id,
      startingBalanceMinor: MARKET_RULES.startingBalanceMinor,
      cashBalanceMinor: MARKET_RULES.startingBalanceMinor,
      currentHoldingsValueMinor: 0,
      totalPortfolioValueMinor: MARKET_RULES.startingBalanceMinor,
      realisedProfitMinor: 0,
      unrealisedProfitMinor: 0,
      createdAt: now,
      updatedAt: now,
    },
    holdings: [],
    transactions: [],
    dailyLimits: new Map(),
    idempotencyMap: new Map(),
  }
}

function getOrCreateDailyLimit(record: DemoPortfolioRecord, date: string): MarketDailyLimit {
  const existing = record.dailyLimits.get(date)
  if (existing) return existing
  const created: MarketDailyLimit = {
    id: `${record.portfolio.id}:${date}`,
    portfolioId: record.portfolio.id,
    activityDate: date,
    purchasesCount: 0,
    salesCount: 0,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  }
  record.dailyLimits.set(date, created)
  return created
}

function recalculatePortfolio(record: DemoPortfolioRecord, playersById: Map<string, MarketPlayer>): void {
  let holdingsTotal = 0
  let unrealised = 0

  for (const holding of record.holdings) {
    const player = playersById.get(holding.playerId)
    if (!player) continue
    holding.currentValueMinor = player.currentPriceMinor * holding.quantity
    holding.unrealisedProfitMinor = (player.currentPriceMinor - holding.purchasePriceMinor) * holding.quantity
    holding.updatedAt = nowISO()
    holdingsTotal += holding.currentValueMinor
    unrealised += holding.unrealisedProfitMinor
  }

  record.portfolio.currentHoldingsValueMinor = holdingsTotal
  record.portfolio.unrealisedProfitMinor = unrealised
  record.portfolio.totalPortfolioValueMinor = record.portfolio.cashBalanceMinor + holdingsTotal
  record.portfolio.updatedAt = nowISO()
}

function getPlayerWeeklyChangeMinor(playerId: string, valuationEventsByPlayerId: Map<string, MarketValuationEvent[]>): number {
  const events = valuationEventsByPlayerId.get(playerId) ?? []
  const weekStart = new Date()
  weekStart.setUTCDate(weekStart.getUTCDate() - 7)
  let total = 0

  for (const event of events) {
    if (new Date(event.effectiveAt).getTime() >= weekStart.getTime()) {
      total += event.priceChangeMinor
    }
  }

  return total
}

async function withPortfolioLock<T>(userId: string, task: () => Promise<T>): Promise<T> {
  const store = getStore()
  const previous = store.portfolioLocks.get(userId) ?? Promise.resolve()
  let release: (() => void) | undefined
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })

  const nextChain = previous.then(() => gate)
  store.portfolioLocks.set(userId, nextChain)

  try {
    await previous
    return await task()
  } finally {
    release?.()
    if (store.portfolioLocks.get(userId) === nextChain) {
      store.portfolioLocks.delete(userId)
    }
  }
}

export function resetDemoMarketStoreForTests(): void {
  const value = globalThis as typeof globalThis & { [globalKey]?: DemoStoreState }
  value[globalKey] = createInitialState()
}

export function getOwnedPlayerIdsForUser(userId: string): string[] {
  const store = getStore()
  const record = store.portfoliosByUserId.get(userId)
  if (!record) return []
  return record.holdings.map((holding) => holding.playerId)
}

export function getMarketViews(filters: MarketFilters): MarketPlayerView[] {
  const store = getStore()
  const cacheKey = JSON.stringify({
    marketVersion: store.marketVersion,
    filters: {
      ...filters,
      ownedPlayerIds: Array.from(filters.ownedPlayerIds ?? []).sort(),
    },
  })

  const cached = store.viewCache.get(cacheKey)
  if (cached) return cached

  const rows: MarketPlayerView[] = []

  for (const player of store.playersById.values()) {
    const club = store.clubsById.get(player.clubId)
    if (!club) continue
    rows.push({
      player,
      club,
      latestMovementMinor: player.currentPriceMinor - player.initialPriceMinor,
    })
  }

  const result = filterAndSortPlayers(rows, filters)
  store.viewCache.set(cacheKey, result)
  return result
}

export function getMarketFilterOptions(): { clubs: Array<{ slug: string; name: string }> } {
  const store = getStore()
  return {
    clubs: Array.from(store.clubsById.values()).map((club) => ({ slug: club.slug, name: club.name })),
  }
}

export function getPlayerBySlug(slug: string): (MarketPlayerView & { lastUpdatedAt: string }) | null {
  const profile = getPlayerProfileBySlug(slug)
  if (!profile) return null

  return {
    player: profile.player,
    club: profile.club,
    latestMovementMinor: profile.latestMovementMinor,
    lastUpdatedAt: profile.lastUpdatedAt,
  }
}

export function getPlayerProfileBySlug(slug: string): MarketPlayerProfileView | null {
  const store = getStore()
  const player = store.playersBySlug.get(slug)
  if (!player) return null
  const club = store.clubsById.get(player.clubId)
  if (!club) return null

  const matchStats = [...(store.playerMatchStatsByPlayerId.get(player.id) ?? [])].sort((a, b) =>
    b.fixtureDate.localeCompare(a.fixtureDate),
  )
  const valuationHistory = [...(store.valuationEventsByPlayerId.get(player.id) ?? [])].sort((a, b) =>
    b.effectiveAt.localeCompare(a.effectiveAt),
  )

  const matchesPlayed = matchStats.length
  const starts = matchStats.filter((match) => match.started).length
  const minutesPlayed = matchStats.reduce((sum, match) => sum + match.minutesPlayed, 0)
  const goals = matchStats.reduce((sum, match) => sum + match.goals, 0)
  const assists = matchStats.reduce((sum, match) => sum + match.assists, 0)
  const cleanSheets = matchStats.reduce((sum, match) => sum + (match.cleanSheet ? 1 : 0), 0)
  const yellowCards = matchStats.reduce((sum, match) => sum + match.yellowCards, 0)
  const redCards = matchStats.reduce((sum, match) => sum + match.redCards, 0)

  const ratingValues = matchStats
    .map((match) => match.providerRatingMilli)
    .filter((value): value is number => typeof value === 'number')
  const averageRatingMilli =
    ratingValues.length > 0
      ? Math.trunc(ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length)
      : null

  const transactionHistory = Array.from(store.portfoliosByUserId.entries())
    .flatMap(([userId, record]) =>
      record.transactions
        .filter((transaction) => transaction.playerId === player.id)
        .map((transaction) => ({
          id: transaction.id,
          username: maskUserId(userId),
          transactionType: transaction.transactionType,
          executedPriceMinor: transaction.executedPriceMinor,
          createdAt: transaction.createdAt,
        })),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const totalPortfolioCount = store.portfoliosByUserId.size
  const ownershipCount = Array.from(store.portfoliosByUserId.values()).reduce((sum, record) => {
    return sum + (record.holdings.some((holding) => holding.playerId === player.id) ? 1 : 0)
  }, 0)
  const ownershipPercentage =
    totalPortfolioCount === 0 ? 0 : Math.round((ownershipCount / totalPortfolioCount) * 1000) / 10

  const priceHistory = [
    {
      date: player.dataUpdatedAt,
      valueMinor: player.initialPriceMinor,
      reason: 'Initial listing',
    },
    ...valuationHistory.map((event) => ({
      date: event.effectiveAt,
      valueMinor: event.newPriceMinor,
      reason: event.reason,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  return {
    player,
    club,
    latestMovementMinor: player.currentPriceMinor - player.initialPriceMinor,
    weeklyChangeMinor: getPlayerWeeklyChangeMinor(player.id, store.valuationEventsByPlayerId),
    ownershipCount,
    ownershipPercentage,
    lastUpdatedAt: player.dataUpdatedAt,
    seasonStats: {
      hasCompetitiveStats: matchStats.length > 0,
      matchesPlayed,
      starts,
      minutesPlayed,
      goals,
      assists,
      cleanSheets,
      yellowCards,
      redCards,
      averageRatingMilli,
    },
    recentMatches: matchStats.slice(0, 6),
    valuationHistory,
    priceHistory,
    transactionHistory,
  }
}

export async function ensurePortfolioForUser(userId: string): Promise<PortfolioView> {
  return withPortfolioLock(userId, async () => {
    const store = getStore()
    let record = store.portfoliosByUserId.get(userId)
    if (!record) {
      record = createPortfolio(userId)
      store.portfoliosByUserId.set(userId, record)
    }
    recalculatePortfolio(record, store.playersById)
    return toPortfolioView(record, store.playersById, store.clubsById, store.valuationEventsByPlayerId)
  })
}

export async function getPortfolioForUser(userId: string): Promise<PortfolioView | null> {
  const store = getStore()
  const record = store.portfoliosByUserId.get(userId)
  if (!record) return null
  recalculatePortfolio(record, store.playersById)
  return toPortfolioView(record, store.playersById, store.clubsById, store.valuationEventsByPlayerId)
}

function toPortfolioView(
  record: DemoPortfolioRecord,
  playersById: Map<string, MarketPlayer>,
  clubsById: Map<string, MarketClub>,
  valuationEventsByPlayerId: Map<string, MarketValuationEvent[]>,
): PortfolioView {
  const today = currentMarketDateISO()
  const dailyLimit = getOrCreateDailyLimit(record, today)
  const weeklyChangeMinor = record.holdings.reduce((sum, holding) => {
    const weekly = getPlayerWeeklyChangeMinor(holding.playerId, valuationEventsByPlayerId)
    return sum + weekly * holding.quantity
  }, 0)

  const allTimeProfitMinor = record.portfolio.realisedProfitMinor + record.portfolio.unrealisedProfitMinor

  return {
    portfolio: { ...record.portfolio },
    holdings: record.holdings
      .flatMap((holding) => {
        const player = playersById.get(holding.playerId)
        if (!player) return []
        const club = clubsById.get(player.clubId)
        if (!club) return []
        return [{
          ...holding,
          player,
          club,
        }]
      }),
    transactions: [...record.transactions]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((transaction) => {
        const player = playersById.get(transaction.playerId)
        if (!player) {
          return {
            ...transaction,
            player: {
              id: transaction.playerId,
              seasonId: DEMO_SEASON.id,
              clubId: '',
              providerPlayerId: '',
              fullName: 'Unknown player',
              displayName: 'Unknown',
              slug: 'unknown',
              positionGroup: 'MID',
              detailedPosition: 'Unknown',
              currentPriceMinor: transaction.executedPriceMinor,
              initialPriceMinor: transaction.executedPriceMinor,
              performanceBankMilli: 0,
              isAvailable: false,
              availabilityStatus: 'unknown',
              dataUpdatedAt: nowISO(),
              isDemoSeed: true,
            },
          }
        }
        return {
          ...transaction,
          player,
        }
      }),
    dailyLimit: { ...dailyLimit },
    purchasesRemaining: Math.max(0, MARKET_RULES.maximumDailyPurchases - dailyLimit.purchasesCount),
    salesRemaining: Math.max(0, MARKET_RULES.maximumDailySales - dailyLimit.salesCount),
    weeklyChangeMinor,
    allTimeProfitMinor,
  }
}

export async function buyPlayerForUser(input: {
  userId: string
  playerId: string
  idempotencyKey: string
}): Promise<{ ok: true; portfolio: PortfolioView } | { ok: false; code: string; message: string }> {
  return withPortfolioLock(input.userId, async () => {
    const store = getStore()
    const record =
      store.portfoliosByUserId.get(input.userId) ??
      (() => {
        const created = createPortfolio(input.userId)
        store.portfoliosByUserId.set(input.userId, created)
        return created
      })()

    if (record.idempotencyMap.has(input.idempotencyKey)) {
      recalculatePortfolio(record, store.playersById)
      return {
        ok: true,
        portfolio: toPortfolioView(record, store.playersById, store.clubsById, store.valuationEventsByPlayerId),
      }
    }

    const player = store.playersById.get(input.playerId)
    if (!player) return { ok: false, code: 'PLAYER_NOT_FOUND', message: 'Player not found.' }
    if (!player.isAvailable) return { ok: false, code: 'PLAYER_UNAVAILABLE', message: 'Player is currently unavailable.' }

    const alreadyOwned = record.holdings.some((holding) => holding.playerId === input.playerId)
    if (alreadyOwned) return { ok: false, code: 'ALREADY_OWNED', message: 'You already own this player.' }

    if (record.holdings.length >= MARKET_RULES.maximumHoldings) {
      return { ok: false, code: 'MAX_HOLDINGS', message: `Maximum ${MARKET_RULES.maximumHoldings} players allowed.` }
    }

    const dailyLimit = getOrCreateDailyLimit(record, currentMarketDateISO())
    if (dailyLimit.purchasesCount >= MARKET_RULES.maximumDailyPurchases) {
      return {
        ok: false,
        code: 'DAILY_PURCHASE_LIMIT',
        message: `You can only make ${MARKET_RULES.maximumDailyPurchases} purchases per day.`,
      }
    }

    if (record.portfolio.cashBalanceMinor < player.currentPriceMinor) {
      return { ok: false, code: 'INSUFFICIENT_BALANCE', message: 'Insufficient available FIQ balance.' }
    }

    const now = nowISO()
    const balanceBefore = record.portfolio.cashBalanceMinor

    const holding: MarketHolding = {
      id: `holding:${record.portfolio.id}:${player.id}`,
      portfolioId: record.portfolio.id,
      playerId: player.id,
      quantity: 1,
      purchasePriceMinor: player.currentPriceMinor,
      currentValueMinor: player.currentPriceMinor,
      unrealisedProfitMinor: 0,
      purchasedAt: now,
      updatedAt: now,
    }

    record.holdings.push(holding)
    record.portfolio.cashBalanceMinor -= player.currentPriceMinor
    dailyLimit.purchasesCount += 1
    dailyLimit.updatedAt = now

    const transaction: MarketTransaction = {
      id: `tx:${record.portfolio.id}:${record.transactions.length + 1}`,
      portfolioId: record.portfolio.id,
      playerId: player.id,
      transactionType: 'buy',
      executedPriceMinor: player.currentPriceMinor,
      balanceBeforeMinor: balanceBefore,
      balanceAfterMinor: record.portfolio.cashBalanceMinor,
      holdingValueBeforeMinor: 0,
      holdingValueAfterMinor: player.currentPriceMinor,
      idempotencyKey: input.idempotencyKey,
      createdAt: now,
    }

    record.transactions.push(transaction)
    record.idempotencyMap.set(input.idempotencyKey, transaction)
    invalidateMarketViewCache(store)

    recalculatePortfolio(record, store.playersById)
    return {
      ok: true,
      portfolio: toPortfolioView(record, store.playersById, store.clubsById, store.valuationEventsByPlayerId),
    }
  })
}

export async function sellPlayerForUser(input: {
  userId: string
  playerId: string
  idempotencyKey: string
}): Promise<{ ok: true; portfolio: PortfolioView } | { ok: false; code: string; message: string }> {
  return withPortfolioLock(input.userId, async () => {
    const store = getStore()
    const record = store.portfoliosByUserId.get(input.userId)
    if (!record) {
      return { ok: false, code: 'PORTFOLIO_NOT_FOUND', message: 'Create your portfolio before selling players.' }
    }

    if (record.idempotencyMap.has(input.idempotencyKey)) {
      recalculatePortfolio(record, store.playersById)
      return {
        ok: true,
        portfolio: toPortfolioView(record, store.playersById, store.clubsById, store.valuationEventsByPlayerId),
      }
    }

    const player = store.playersById.get(input.playerId)
    if (!player) return { ok: false, code: 'PLAYER_NOT_FOUND', message: 'Player not found.' }

    const holdingIndex = record.holdings.findIndex((holding) => holding.playerId === input.playerId)
    if (holdingIndex < 0) {
      return { ok: false, code: 'NOT_OWNED', message: 'You cannot sell a player you do not own.' }
    }

    const dailyLimit = getOrCreateDailyLimit(record, currentMarketDateISO())
    if (dailyLimit.salesCount >= MARKET_RULES.maximumDailySales) {
      return {
        ok: false,
        code: 'DAILY_SALE_LIMIT',
        message: `You can only make ${MARKET_RULES.maximumDailySales} sales per day.`,
      }
    }

    const now = nowISO()
    const soldHolding = record.holdings[holdingIndex]
    const proceeds = player.currentPriceMinor * soldHolding.quantity
    const balanceBefore = record.portfolio.cashBalanceMinor

    record.holdings.splice(holdingIndex, 1)
    record.portfolio.cashBalanceMinor += proceeds
    if (record.portfolio.cashBalanceMinor < 0) {
      return { ok: false, code: 'NEGATIVE_BALANCE_BLOCKED', message: 'Negative balances are not permitted.' }
    }

    dailyLimit.salesCount += 1
    dailyLimit.updatedAt = now

    const realisedProfit = (player.currentPriceMinor - soldHolding.purchasePriceMinor) * soldHolding.quantity
    record.portfolio.realisedProfitMinor += realisedProfit

    const transaction: MarketTransaction = {
      id: `tx:${record.portfolio.id}:${record.transactions.length + 1}`,
      portfolioId: record.portfolio.id,
      playerId: player.id,
      transactionType: 'sell',
      executedPriceMinor: player.currentPriceMinor,
      balanceBeforeMinor: balanceBefore,
      balanceAfterMinor: record.portfolio.cashBalanceMinor,
      holdingValueBeforeMinor: soldHolding.currentValueMinor,
      holdingValueAfterMinor: 0,
      idempotencyKey: input.idempotencyKey,
      createdAt: now,
    }

    record.transactions.push(transaction)
    record.idempotencyMap.set(input.idempotencyKey, transaction)
    invalidateMarketViewCache(store)

    recalculatePortfolio(record, store.playersById)
    return {
      ok: true,
      portfolio: toPortfolioView(record, store.playersById, store.clubsById, store.valuationEventsByPlayerId),
    }
  })
}

function buildLeaderboardRows(): MarketLeaderboardRow[] {
  const store = getStore()
  const rows: MarketLeaderboardRow[] = []

  for (const [userId, record] of store.portfoliosByUserId.entries()) {
    recalculatePortfolio(record, store.playersById)

    const allTimeGainMinor = record.portfolio.realisedProfitMinor + record.portfolio.unrealisedProfitMinor
    const weeklyGainMinor = record.holdings.reduce((sum, holding) => {
      const weekly = getPlayerWeeklyChangeMinor(holding.playerId, store.valuationEventsByPlayerId)
      return sum + weekly * holding.quantity
    }, 0)

    rows.push({
      rank: 0,
      username: maskUserId(userId),
      totalPortfolioValueMinor: record.portfolio.totalPortfolioValueMinor,
      totalProfitMinor: allTimeGainMinor,
      weeklyGainMinor,
      allTimeGainMinor,
      percentageReturnBps: percentageReturnBps(
        record.portfolio.totalPortfolioValueMinor,
        record.portfolio.startingBalanceMinor,
      ),
      weeklyMovementMinor: weeklyGainMinor,
    })
  }

  return rows
}

export function getMarketLeaderboard(): MarketLeaderboardRow[] {
  return [...buildLeaderboardRows()]
    .sort((left, right) => right.totalPortfolioValueMinor - left.totalPortfolioValueMinor)
    .map((row, index) => ({ ...row, rank: index + 1 }))
}

export function getMarketLeaderboardBundle(): MarketLeaderboardBundle {
  const rows = buildLeaderboardRows()
  const byPortfolioValue = [...rows]
    .sort((left, right) => right.totalPortfolioValueMinor - left.totalPortfolioValueMinor)
    .map((row, index) => ({ ...row, rank: index + 1 }))

  const byWeeklyGain = [...rows].sort((left, right) => right.weeklyGainMinor - left.weeklyGainMinor)
  const byAllTimeGain = [...rows].sort((left, right) => right.allTimeGainMinor - left.allTimeGainMinor)
  const byReturnPercent = [...rows].sort((left, right) => right.percentageReturnBps - left.percentageReturnBps)

  return {
    byPortfolioValue,
    byWeeklyGain,
    byAllTimeGain,
    byReturnPercent,
    mostProfitableTrader: byAllTimeGain[0] ?? null,
  }
}

export function getMarketIntelligenceView() {
  const store = getStore()
  const ownershipCountByPlayerId = new Map<string, number>()

  for (const record of store.portfoliosByUserId.values()) {
    for (const holding of record.holdings) {
      ownershipCountByPlayerId.set(
        holding.playerId,
        (ownershipCountByPlayerId.get(holding.playerId) ?? 0) + 1,
      )
    }
  }

  const mostOwned = Array.from(ownershipCountByPlayerId.entries())
    .map(([playerId, ownershipCount]) => {
      const player = store.playersById.get(playerId)
      if (!player) return null
      const club = store.clubsById.get(player.clubId)
      if (!club) return null

      return {
        playerId,
        ownershipCount,
        displayName: player.displayName,
        slug: player.slug,
        clubShortName: club.shortName,
      }
    })
    .filter((item): item is { playerId: string; ownershipCount: number; displayName: string; slug: string; clubShortName: string } => Boolean(item))
    .sort((left, right) => {
      if (right.ownershipCount !== left.ownershipCount) {
        return right.ownershipCount - left.ownershipCount
      }
      return left.displayName.localeCompare(right.displayName)
    })
    .slice(0, 5)

  return {
    mostOwned,
  }
}

export function getMarketAdminDashboardView(): MarketAdminDashboardView {
  const store = getStore()
  return {
    provider: store.provider,
    lastImportAt: store.lastImportAt,
    lastValuationAt: store.lastValuationAt,
    lastFixtureProcessedAt: store.lastFixtureProcessedAt,
    queuedFixtures: store.queuedFixtures,
    processingLog: [...store.systemLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50),
  }
}

export function appendMarketSystemLog(log: Omit<MarketSystemLogEntry, 'id' | 'createdAt'>): void {
  const store = getStore()
  store.systemLogs.push({
    id: `log-${store.systemLogs.length + 1}`,
    createdAt: nowISO(),
    ...log,
  })
}

export function setMarketImportStatus(input: {
  lastImportAt: string
  queuedFixtures: number
  message: string
  dryRun: boolean
  source: string
}): void {
  const store = getStore()
  store.lastImportAt = input.lastImportAt
  store.queuedFixtures = input.queuedFixtures
  appendMarketSystemLog({
    type: 'import',
    source: input.source,
    dryRun: input.dryRun,
    message: input.message,
  })
}

export function setMarketWeeklyStatus(input: {
  lastValuationAt: string
  lastFixtureProcessedAt: string | null
  queuedFixtures: number
  message: string
  dryRun: boolean
  source: string
}): void {
  const store = getStore()
  store.lastValuationAt = input.lastValuationAt
  store.lastFixtureProcessedAt = input.lastFixtureProcessedAt
  store.queuedFixtures = input.queuedFixtures
  appendMarketSystemLog({
    type: 'valuation',
    source: input.source,
    dryRun: input.dryRun,
    message: input.message,
  })
}

function maskUserId(userId: string): string {
  if (userId.length <= 8) return `user-${userId}`
  return `user-${userId.slice(0, 4)}...${userId.slice(-3)}`
}
