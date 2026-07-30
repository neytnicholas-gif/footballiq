export type ProviderPagination = {
  page: number
  perPage: number
}

export type ProviderImportContext = {
  dryRun: boolean
  requestedAt: string
  source: string
  onProviderRequest?: (event: {
    path: string
    status: 'success' | 'rate-limited'
    waitMs?: number
  }) => void
}

export type ProviderCompetition = {
  providerCompetitionId: string
  name: string
  key: string
  country?: string
  current?: boolean
}

export type ProviderSeason = {
  providerSeasonId: string
  key: string
  startsAt: string
  endsAt: string
}

export type ProviderClub = {
  providerClubId: string
  name: string
  shortName: string
  slug: string
  primaryColour?: string
  secondaryColour?: string
  accentColour?: string
  foregroundColour?: string
  colourConfidence?: 'generated' | 'review-required'
  providerUpdatedAt?: string
}

export type ProviderPlayer = {
  providerPlayerId: string
  fullName: string
  displayName: string
  positionGroup: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward' | 'Unknown'
  detailedPosition?: string
  nationality?: string
  shirtNumber?: number
  availabilityStatus?: string
  providerUpdatedAt?: string
}

export type ProviderFixture = {
  providerFixtureId: string
  fixtureDate: string
  homeClubProviderId: string
  awayClubProviderId: string
  status: 'scheduled' | 'completed' | 'postponed' | 'unknown'
}

export type ProviderPlayerMatchStats = {
  providerFixtureId: string
  providerPlayerId: string
  fixtureDate: string
  started: boolean
  minutesPlayed: number
  providerRating?: number
  goals: number
  assists: number
  shots: number
  shotsOnTarget: number
  keyPasses: number
  passes: number
  passAccuracy?: number
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
  providerUpdatedAt?: string
  rawProviderPayload?: unknown
}

export type ProviderPage<T> = {
  items: T[]
  page: number
  hasNextPage: boolean
  totalItems?: number
  totalPages?: number
}

export type ImportIssue = {
  code: string
  message: string
  providerId?: string
}

export type PlayerDuplicateClassification =
  | 'exact-duplicate-payload'
  | 'possible-transfer'
  | 'possible-loan'
  | 'conflicting-active-club'
  | 'unresolved-provider-inconsistency'

export type ImportReport = {
  source: string
  dryRun: boolean
  startedAt: string
  finishedAt: string
  accessTimestamp?: string
  providerCompetitionId?: string
  competitionName?: string
  seasonKey?: string
  importRunId?: string
  writeMode?: 'dry-run' | 'staging-disabled'
  imported: {
    competitions: number
    seasons: number
    clubs: number
    squads: number
    fixtures: number
    matchStats: number
  }
  skipped: {
    unresolvedPlayers: number
    duplicates: number
    suspiciousRecords: number
    records: number
  }
  positionCounts?: Record<string, number>
  playersPerClub?: Record<string, number>
  unresolvedRecords?: Array<{ code: string; message: string; providerId?: string; clubProviderId?: string }>
  duplicateWarnings?: Array<{ code: string; message: string; providerId?: string }>
  missingRequiredFields?: Array<{ entity: 'club' | 'player'; field: string; providerId?: string; message: string }>
  prospectiveChanges?: {
    clubs: { inserts: number; updates: number; deactivations: number }
    players: { inserts: number; updates: number; deactivations: number }
  }
  runtime?: {
    requestsUsed: number
    rateLimitRetries: number
    elapsedMs: number
    zeroPlayerClubs: string[]
    completedClubs: number
    totalClubs: number
    resumed: boolean
    progressFilePath: string
  }
  normalization?: {
    rawPlayerRowsReceived: number
    uniqueCanonicalPlayers: number
    exactDuplicatesRemoved: number
    conflictingClubMemberships: number
    unresolvedPlayersRequiringReview: number
    duplicateMemberships: Array<{
      providerPlayerId: string
      classification: PlayerDuplicateClassification
      clubs: string[]
      activeClubProviderId?: string
      requiresReview: boolean
      reason: string
      evidence: Array<{
        clubProviderId: string
        fullName: string
        displayName: string
        detailedPosition?: string
        nationality?: string
        shirtNumber?: number
        providerUpdatedAt?: string
      }>
    }>
  }
  issues: ImportIssue[]
  notes: string[]
}

export type DataProviderAdapter = {
  name: string
  fetchCompetitions(pagination: ProviderPagination, context: ProviderImportContext): Promise<ProviderPage<ProviderCompetition>>
  fetchSeasons(competitionKey: string, pagination: ProviderPagination, context: ProviderImportContext): Promise<ProviderPage<ProviderSeason>>
  fetchClubs(seasonKey: string, pagination: ProviderPagination, context: ProviderImportContext): Promise<ProviderPage<ProviderClub>>
  fetchSquad(clubProviderId: string, seasonKey: string, pagination: ProviderPagination, context: ProviderImportContext): Promise<ProviderPage<ProviderPlayer>>
  fetchFixtures(seasonKey: string, pagination: ProviderPagination, context: ProviderImportContext): Promise<ProviderPage<ProviderFixture>>
  fetchPlayerMatchStats(seasonKey: string, pagination: ProviderPagination, context: ProviderImportContext): Promise<ProviderPage<ProviderPlayerMatchStats>>
}
