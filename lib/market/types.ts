export type PositionGroup = 'GK' | 'DEF' | 'MID' | 'FWD'

export type AvailabilityStatus = 'available' | 'injured' | 'suspended' | 'transferred' | 'unknown'

export type MarketSort = 'alphabetical' | 'price-asc' | 'price-desc' | 'movement-desc' | 'movement-asc' | 'club-asc'

export type AvailabilityFilter = 'ALL' | 'AVAILABLE_ONLY'

export type OwnershipFilter = 'ALL' | 'OWNED_ONLY'

export type HomeAway = 'home' | 'away'

export type TransactionType = 'buy' | 'sell'

export type ValuationEventType = 'match_rating' | 'manual_adjustment' | 'correction'

export type MarketSeason = {
  id: string
  name: string
  competitionKey: string
  seasonKey: string
  startsAt: string
  endsAt: string
  isActive: boolean
  dataUpdatedAt: string
}

export type MarketClub = {
  id: string
  seasonId: string
  providerClubId: string
  name: string
  shortName: string
  slug: string
  primaryColour: string
  secondaryColour: string
  isActive: boolean
  dataUpdatedAt: string
}

export type MarketPlayer = {
  id: string
  seasonId: string
  clubId: string
  providerPlayerId: string
  fullName: string
  displayName: string
  slug: string
  positionGroup: PositionGroup
  detailedPosition: string
  nationality?: string | null
  shirtNumber?: number | null
  currentPriceMinor: number
  initialPriceMinor: number
  performanceBankMilli: number
  latestRatingMilli?: number | null
  isAvailable: boolean
  availabilityStatus: AvailabilityStatus
  dataUpdatedAt: string
  isDemoSeed: boolean
}

export type MarketPlayerMatchStat = {
  id: string
  playerId: string
  providerFixtureId: string
  fixtureDate: string
  opponentClubId?: string | null
  homeOrAway?: HomeAway | null
  started: boolean
  minutesPlayed: number
  providerRatingMilli?: number | null
  goals: number
  assists: number
  shots: number
  shotsOnTarget: number
  keyPasses: number
  passes: number
  passAccuracy?: number | null
  tackles: number
  interceptions: number
  clearances: number
  blocks: number
  saves: number
  goalsConceded: number
  cleanSheet: boolean
  yellowCards: number
  redCards: number
  penaltiesScored: number
  penaltiesMissed: number
  ownGoals: number
  providerUpdatedAt?: string | null
  importedAt: string
  valuationProcessedAt?: string | null
  idempotencyKey: string
}

export type MarketValuationEvent = {
  id: string
  playerId: string
  matchStatId?: string | null
  eventType: ValuationEventType
  previousPriceMinor: number
  newPriceMinor: number
  previousBankMilli: number
  ratingMilli?: number | null
  baselineRatingMilli: number
  ratingDeltaMilli: number
  bankAfterEventMilli: number
  priceChangeMinor: number
  reason: string
  calculationVersion: string
  effectiveAt: string
  createdAt: string
  idempotencyKey: string
}

export type MarketHolding = {
  id: string
  portfolioId: string
  playerId: string
  quantity: number
  purchasePriceMinor: number
  currentValueMinor: number
  unrealisedProfitMinor: number
  purchasedAt: string
  updatedAt: string
}

export type MarketTransaction = {
  id: string
  portfolioId: string
  playerId: string
  transactionType: TransactionType
  executedPriceMinor: number
  balanceBeforeMinor: number
  balanceAfterMinor: number
  holdingValueBeforeMinor: number
  holdingValueAfterMinor: number
  idempotencyKey: string
  createdAt: string
}

export type MarketDailyLimit = {
  id: string
  portfolioId: string
  activityDate: string
  purchasesCount: number
  salesCount: number
  createdAt: string
  updatedAt: string
}

export type MarketPortfolio = {
  id: string
  userId: string
  seasonId: string
  startingBalanceMinor: number
  cashBalanceMinor: number
  currentHoldingsValueMinor: number
  totalPortfolioValueMinor: number
  realisedProfitMinor: number
  unrealisedProfitMinor: number
  createdAt: string
  updatedAt: string
}

export type MarketSettings = {
  activeSeasonId: string
  startingBalanceMinor: number
  maximumHoldings: number
  maximumDailyPurchases: number
  maximumDailySales: number
  universalBaselineRatingMilli: number
  minimumMinutes: number
  substituteMinimumMinutes: number
  priceStepMinor: number
  minimumPriceMinor: number
  maximumPriceMinor: number
  maximumWeeklyPriceChangeMinor: number
  valuationCalculationVersion: string
  weeklyUpdateDay: number
  fiqCurrencyLabel: string
}

export type MarketPlayerView = {
  player: MarketPlayer
  club: MarketClub
  latestMovementMinor: number
}

export type MarketLeaderboardRow = {
  rank: number
  username: string
  totalPortfolioValueMinor: number
  totalProfitMinor: number
  weeklyGainMinor: number
  allTimeGainMinor: number
  percentageReturnBps: number
  weeklyMovementMinor?: number
}

export type MarketLeaderboardBundle = {
  byPortfolioValue: MarketLeaderboardRow[]
  byWeeklyGain: MarketLeaderboardRow[]
  byAllTimeGain: MarketLeaderboardRow[]
  byReturnPercent: MarketLeaderboardRow[]
  mostProfitableTrader: MarketLeaderboardRow | null
}

export type MarketPriceHistoryPoint = {
  date: string
  valueMinor: number
  reason: string
}

export type MarketSeasonStatsSummary = {
  hasCompetitiveStats: boolean
  matchesPlayed: number
  starts: number
  minutesPlayed: number
  goals: number
  assists: number
  cleanSheets: number
  yellowCards: number
  redCards: number
  averageRatingMilli: number | null
}

export type PlayerTransactionHistoryItem = {
  id: string
  username: string
  transactionType: TransactionType
  executedPriceMinor: number
  createdAt: string
}

export type MarketPlayerProfileView = {
  player: MarketPlayer
  club: MarketClub
  latestMovementMinor: number
  weeklyChangeMinor: number
  ownershipCount: number
  ownershipPercentage: number
  lastUpdatedAt: string
  seasonStats: MarketSeasonStatsSummary
  recentMatches: MarketPlayerMatchStat[]
  valuationHistory: MarketValuationEvent[]
  priceHistory: MarketPriceHistoryPoint[]
  transactionHistory: PlayerTransactionHistoryItem[]
}

export type MarketSystemLogEntry = {
  id: string
  type: 'import' | 'valuation'
  source: string
  dryRun: boolean
  createdAt: string
  message: string
}

export type MarketAdminDashboardView = {
  provider: string
  lastImportAt: string | null
  lastValuationAt: string | null
  lastFixtureProcessedAt: string | null
  queuedFixtures: number
  processingLog: MarketSystemLogEntry[]
}

export type PortfolioView = {
  portfolio: MarketPortfolio
  holdings: Array<MarketHolding & { player: MarketPlayer; club: MarketClub }>
  transactions: Array<MarketTransaction & { player: MarketPlayer }>
  dailyLimit: MarketDailyLimit
  purchasesRemaining: number
  salesRemaining: number
  weeklyChangeMinor: number
  allTimeProfitMinor: number
}
