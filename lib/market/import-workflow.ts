import { randomUUID } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { DEMO_CLUBS, DEMO_PLAYERS } from '@/lib/market/demo-seed'
import { setMarketImportStatus } from '@/lib/market/demo-store'
import { getMarketProviderAdapter } from '@/lib/market/provider'
import type {
  DataProviderAdapter,
  ImportIssue,
  ImportReport,
  PlayerDuplicateClassification,
  ProviderClub,
  ProviderCompetition,
  ProviderImportContext,
  ProviderPlayer,
  ProviderSeason,
} from '@/lib/market/provider/types'

type ImportOptions = {
  competitionKey?: string
  seasonKey?: string
  dryRun: boolean
  writeEnabled?: boolean
  adapterOverride?: DataProviderAdapter
  resume?: boolean
  requestDelayMs?: number
  progressFilePath?: string
  progressLogger?: (line: string) => void
}

type DiscoveryResult = {
  competition: ProviderCompetition
  season: ProviderSeason
}

type NormalizedClub = ProviderClub

type NormalizedPlayer = ProviderPlayer & {
  clubProviderId: string
  normalizedName: string
  unresolvedReason?: string
}

type DuplicateMembershipReport = {
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
}

type CanonicalPlayerRecord = {
  player: NormalizedPlayer
  activeClubProviderId?: string
  requiresReview: boolean
  classification: PlayerDuplicateClassification
  reason: string
}

type CanonicalizationSummary = {
  canonicalPlayers: CanonicalPlayerRecord[]
  exactDuplicatesRemoved: number
  conflictingClubMemberships: number
  unresolvedPlayersRequiringReview: number
  duplicateMemberships: DuplicateMembershipReport[]
}

const EXPECTED_PROMOTED_CLUBS = ['Coventry City', 'Ipswich Town', 'Hull City']

const DEFAULT_MARKET_TARGET_SEASON = '2026'
const DEFAULT_MARKET_DATA_PROVIDER = 'api-football'
const DEFAULT_API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io'
const SUPPORTED_MARKET_PROVIDERS = new Set(['api-football'])

type MarketImportEnv = {
  apiFootballKey: string
  apiFootballBaseUrl: string
  marketDataProvider: string
  targetLeagueId: string | null
  targetSeasonKey: string
}

type ImportProgressState = {
  version: 1
  source: string
  seasonKey: string
  providerCompetitionId: string
  startedAt: string
  updatedAt: string
  completedClubProviderIds: string[]
  normalizedPlayers: NormalizedPlayer[]
  playersPerClub: Record<string, number>
  positionCounts: Record<string, number>
  requestsUsed: number
  rateLimitRetries: number
}

const DEFAULT_REQUEST_DELAY_MS = 7000
const DEFAULT_RATE_LIMIT_WAIT_MS = 60000
const IMPORT_PROGRESS_FILE = path.join(process.cwd(), 'tmp', 'market-import-progress.json')

function nowISO(): string {
  return new Date().toISOString()
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeName(value: string): string {
  return normalizeSpaces(value).toLowerCase()
}

function toSeasonKey(rawSeason: string): string {
  const numericSeason = Number.parseInt(rawSeason, 10)
  if (!Number.isFinite(numericSeason)) {
    throw new Error('BLOCKED: MARKET_TARGET_SEASON is invalid. Use a numeric year, for example 2026.')
  }
  return `season-${numericSeason}`
}

function buildMissingEnvMessage(names: string[]): string {
  if (names.length === 1 && names[0] === 'API_FOOTBALL_KEY') {
    return [
      'BLOCKED: API_FOOTBALL_KEY is not configured in .env.local.',
      'Add the key locally, then run:',
      'npm run market:discover',
      'npm run market:import-squads:dry',
    ].join('\n')
  }

  const lines = ['Missing required environment variables in .env.local:']
  for (const name of names) {
    lines.push(`- ${name}`)
  }
  return `BLOCKED: ${lines.join('\n')}`
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function getValidatedMarketImportEnv(): MarketImportEnv {
  const missing: string[] = []
  const apiFootballKey = process.env.API_FOOTBALL_KEY?.trim() ?? ''

  if (!apiFootballKey) {
    missing.push('API_FOOTBALL_KEY')
  }

  if (missing.length > 0) {
    throw new Error(buildMissingEnvMessage(missing))
  }

  const apiFootballBaseUrl = process.env.API_FOOTBALL_BASE_URL?.trim() || DEFAULT_API_FOOTBALL_BASE_URL
  const marketDataProvider = process.env.MARKET_DATA_PROVIDER?.trim() || DEFAULT_MARKET_DATA_PROVIDER
  const targetLeagueId = process.env.MARKET_TARGET_LEAGUE_ID?.trim() || null
  const targetSeasonRaw = process.env.MARKET_TARGET_SEASON?.trim() || DEFAULT_MARKET_TARGET_SEASON

  if (!SUPPORTED_MARKET_PROVIDERS.has(marketDataProvider)) {
    throw new Error(
      `BLOCKED: MARKET_DATA_PROVIDER is invalid. Supported values: ${Array.from(SUPPORTED_MARKET_PROVIDERS).join(', ')}`
    )
  }

  if (!isValidHttpUrl(apiFootballBaseUrl)) {
    throw new Error('BLOCKED: API_FOOTBALL_BASE_URL is invalid. Use a valid http/https URL.')
  }

  return {
    apiFootballKey,
    apiFootballBaseUrl,
    marketDataProvider,
    targetLeagueId,
    targetSeasonKey: toSeasonKey(targetSeasonRaw),
  }
}

function redactSecrets(input: string): string {
  const sensitiveValues = [
    process.env.API_FOOTBALL_KEY,
    process.env.MARKET_ADMIN_SECRET,
  ].filter((item): item is string => Boolean(item && item.length > 0))

  return sensitiveValues.reduce((message, secret) => message.split(secret).join('[REDACTED]'), input)
}

function issue(code: string, message: string, providerId?: string): ImportIssue {
  return {
    code,
    message: redactSecrets(message),
    providerId,
  }
}

function getRequestDelayMs(override?: number): number {
  if (typeof override === 'number' && Number.isFinite(override) && override >= 0) {
    return override
  }

  const parsed = Number.parseInt(process.env.MARKET_IMPORT_REQUEST_DELAY_MS?.trim() || '', 10)
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed
  }

  return DEFAULT_REQUEST_DELAY_MS
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0s'
  const totalSeconds = Math.ceil(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

function getProgressFilePath(override?: string): string {
  return override ? path.resolve(override) : IMPORT_PROGRESS_FILE
}

async function loadProgressState(progressFilePath: string): Promise<ImportProgressState | null> {
  try {
    const content = await readFile(progressFilePath, 'utf8')
    const parsed = JSON.parse(content) as ImportProgressState
    if (parsed?.version !== 1) return null
    return parsed
  } catch {
    return null
  }
}

async function writeProgressState(progressFilePath: string, state: ImportProgressState): Promise<void> {
  await mkdir(path.dirname(progressFilePath), { recursive: true })
  await writeFile(progressFilePath, JSON.stringify(state, null, 2), 'utf8')
}

function parseTimestamp(value: string | undefined): number | null {
  if (!value) return null
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : null
}

function playerRowFingerprint(player: NormalizedPlayer): string {
  return [
    player.providerPlayerId,
    player.clubProviderId,
    player.fullName,
    player.displayName,
    player.positionGroup,
    player.detailedPosition || '',
    player.nationality || '',
    String(player.shirtNumber ?? ''),
    player.providerUpdatedAt || '',
  ].join('|')
}

function dedupeExactPlayerRows(rows: NormalizedPlayer[]): { dedupedRows: NormalizedPlayer[]; removedCount: number } {
  const unique = new Map<string, NormalizedPlayer>()

  for (const row of rows) {
    const key = playerRowFingerprint(row)
    if (!unique.has(key)) {
      unique.set(key, row)
    }
  }

  return {
    dedupedRows: Array.from(unique.values()),
    removedCount: rows.length - unique.size,
  }
}

function chooseDeterministicRow(rows: NormalizedPlayer[]): NormalizedPlayer {
  return [...rows].sort((a, b) => {
    const aTime = parseTimestamp(a.providerUpdatedAt) ?? -1
    const bTime = parseTimestamp(b.providerUpdatedAt) ?? -1
    if (bTime !== aTime) return bTime - aTime

    if (a.clubProviderId !== b.clubProviderId) {
      return a.clubProviderId.localeCompare(b.clubProviderId)
    }

    const aName = `${a.fullName}|${a.displayName}`
    const bName = `${b.fullName}|${b.displayName}`
    return aName.localeCompare(bName)
  })[0]
}

function classifyMembershipConflict(
  providerPlayerId: string,
  dedupedRows: NormalizedPlayer[],
): {
  classification: PlayerDuplicateClassification
  activeClubProviderId?: string
  requiresReview: boolean
  reason: string
} {
  const clubs = Array.from(new Set(dedupedRows.map((entry) => entry.clubProviderId)))
  if (clubs.length <= 1) {
    return {
      classification: 'exact-duplicate-payload',
      activeClubProviderId: clubs[0],
      requiresReview: false,
      reason: `Player ${providerPlayerId} only repeats identical payload rows within one club.`,
    }
  }

  const withTimestamps = dedupedRows
    .map((entry) => ({ clubProviderId: entry.clubProviderId, updatedAtMs: parseTimestamp(entry.providerUpdatedAt) }))
    .filter((entry): entry is { clubProviderId: string; updatedAtMs: number } => entry.updatedAtMs !== null)

  if (withTimestamps.length > 0) {
    const maxUpdatedAt = Math.max(...withTimestamps.map((entry) => entry.updatedAtMs))
    const clubsAtLatest = Array.from(
      new Set(withTimestamps.filter((entry) => entry.updatedAtMs === maxUpdatedAt).map((entry) => entry.clubProviderId))
    )

    if (clubsAtLatest.length === 1) {
      return {
        classification: 'possible-transfer',
        activeClubProviderId: clubsAtLatest[0],
        requiresReview: false,
        reason:
          `Player ${providerPlayerId} appears in multiple clubs; latest providerUpdatedAt points to club ${clubsAtLatest[0]} and older rows are treated as stale memberships.`,
      }
    }

    if (clubs.length === 2) {
      return {
        classification: 'possible-loan',
        requiresReview: true,
        reason:
          `Player ${providerPlayerId} appears in two clubs with overlapping update freshness and no single reliable active club.`,
      }
    }

    return {
      classification: 'conflicting-active-club',
      requiresReview: true,
      reason:
        `Player ${providerPlayerId} has multiple clubs tied as latest providerUpdatedAt; active club cannot be selected safely.`,
    }
  }

  return {
    classification: 'unresolved-provider-inconsistency',
    requiresReview: true,
    reason:
      `Player ${providerPlayerId} appears in multiple clubs without reliable providerUpdatedAt evidence for active membership.`,
  }
}

function canonicalizePlayers(rows: NormalizedPlayer[]): CanonicalizationSummary {
  const byProviderId = new Map<string, NormalizedPlayer[]>()
  for (const row of rows) {
    const providerId = row.providerPlayerId
    if (!providerId) continue
    const existing = byProviderId.get(providerId) ?? []
    existing.push(row)
    byProviderId.set(providerId, existing)
  }

  const canonicalPlayers: CanonicalPlayerRecord[] = []
  const duplicateMemberships: DuplicateMembershipReport[] = []
  let exactDuplicatesRemoved = 0
  let conflictingClubMemberships = 0
  let unresolvedPlayersRequiringReview = 0

  for (const [providerPlayerId, groupedRows] of byProviderId.entries()) {
    const { dedupedRows, removedCount } = dedupeExactPlayerRows(groupedRows)
    exactDuplicatesRemoved += removedCount

    const clubs = Array.from(new Set(dedupedRows.map((entry) => entry.clubProviderId)))
    const baseRow = chooseDeterministicRow(dedupedRows)

    if (clubs.length > 1 || removedCount > 0) {
      const classification = classifyMembershipConflict(providerPlayerId, dedupedRows)
      if (clubs.length > 1) {
        conflictingClubMemberships += 1
      }
      if (classification.requiresReview) {
        unresolvedPlayersRequiringReview += 1
      }

      duplicateMemberships.push({
        providerPlayerId,
        classification: classification.classification,
        clubs,
        activeClubProviderId: classification.activeClubProviderId,
        requiresReview: classification.requiresReview,
        reason: classification.reason,
        evidence: dedupedRows.map((entry) => ({
          clubProviderId: entry.clubProviderId,
          fullName: entry.fullName,
          displayName: entry.displayName,
          detailedPosition: entry.detailedPosition,
          nationality: entry.nationality,
          shirtNumber: entry.shirtNumber,
          providerUpdatedAt: entry.providerUpdatedAt,
        })),
      })

      canonicalPlayers.push({
        player: {
          ...baseRow,
          clubProviderId: classification.activeClubProviderId ?? baseRow.clubProviderId,
        },
        activeClubProviderId: classification.activeClubProviderId,
        requiresReview: classification.requiresReview,
        classification: classification.classification,
        reason: classification.reason,
      })
      continue
    }

    canonicalPlayers.push({
      player: baseRow,
      activeClubProviderId: baseRow.clubProviderId,
      requiresReview: false,
      classification: 'exact-duplicate-payload',
      reason: `Player ${providerPlayerId} has a single active club row.`,
    })
  }

  return {
    canonicalPlayers,
    exactDuplicatesRemoved,
    conflictingClubMemberships,
    unresolvedPlayersRequiringReview,
    duplicateMemberships,
  }
}

function selectCompetition(
  competitions: ProviderCompetition[],
  explicitLeagueId: string | null,
): ProviderCompetition {
  const englishPremierLeagueMatches = competitions.filter((competition) => {
    const name = normalizeName(competition.name)
    const country = normalizeName(competition.country ?? '')
    return name === 'premier league' && country === 'england'
  })

  if (explicitLeagueId) {
    const exact = competitions.find((competition) => competition.providerCompetitionId === explicitLeagueId)
    if (!exact) {
      throw new Error(`ERROR: league id ${explicitLeagueId} was not found in provider results`)
    }
    return exact
  }

  if (englishPremierLeagueMatches.length !== 1) {
    throw new Error(
      `ERROR: league discovery is ambiguous (${englishPremierLeagueMatches.length} matches for England Premier League)`
    )
  }

  return englishPremierLeagueMatches[0]
}

function selectSeason(seasons: ProviderSeason[], targetSeasonKey: string): ProviderSeason {
  const exact = seasons.find((season) => season.key === targetSeasonKey)
  if (!exact) {
    throw new Error(`ERROR: target season ${targetSeasonKey} was not returned by provider`)
  }
  return exact
}

function normalizeClub(club: ProviderClub): NormalizedClub | null {
  if (!club.providerClubId || !club.name) {
    return null
  }

  const normalizedName = normalizeSpaces(club.name)
  const normalizedShortName = normalizeSpaces(club.shortName || normalizedName)
  const slug = normalizeName(normalizedName).replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')

  return {
    ...club,
    providerClubId: String(club.providerClubId),
    name: normalizedName,
    shortName: normalizedShortName,
    slug,
  }
}

function normalizePlayer(clubProviderId: string, player: ProviderPlayer): NormalizedPlayer {
  const fullName = normalizeSpaces(player.fullName || '')
  const positionGroup = player.positionGroup
  let unresolvedReason: string | undefined

  if (!player.providerPlayerId) {
    unresolvedReason = 'missing provider player id'
  } else if (!fullName) {
    unresolvedReason = 'missing player name'
  } else if (!positionGroup || positionGroup === 'Unknown') {
    unresolvedReason = 'unknown position mapping'
  }

  return {
    ...player,
    clubProviderId,
    providerPlayerId: String(player.providerPlayerId || ''),
    fullName,
    displayName: normalizeSpaces(player.displayName || fullName),
    detailedPosition: player.detailedPosition ? normalizeSpaces(player.detailedPosition) : undefined,
    normalizedName: normalizeName(fullName),
    unresolvedReason,
  }
}

function getExistingReferenceSets() {
  const existingClubProviderIds = new Set(DEMO_CLUBS.map((club) => club.providerClubId))
  const existingPlayerProviderIds = new Set(DEMO_PLAYERS.map((player) => player.providerPlayerId))
  return {
    existingClubProviderIds,
    existingPlayerProviderIds,
  }
}

async function fetchAllSquadPlayers(
  adapter: DataProviderAdapter,
  seasonKey: string,
  club: NormalizedClub,
  context: ProviderImportContext,
): Promise<ProviderPlayer[]> {
  const players: ProviderPlayer[] = []
  let page = 1
  const perPage = 50

  while (true) {
    const squadPage = await adapter.fetchSquad(club.providerClubId, seasonKey, { page, perPage }, context)
    players.push(...squadPage.items)
    if (!squadPage.hasNextPage) break
    page += 1
    if (page > 200) {
      throw new Error(`ERROR: pagination guard triggered for club ${club.providerClubId}`)
    }
  }

  return players
}

export async function discoverMarketCompetition(options?: {
  dryRun?: boolean
  adapterOverride?: DataProviderAdapter
  contextOverride?: ProviderImportContext
}): Promise<DiscoveryResult> {
  const adapter = options?.adapterOverride ?? getMarketProviderAdapter()
  const requestedAt = nowISO()
  const env = getValidatedMarketImportEnv()

  const leagueIdFromEnv = env.targetLeagueId
  const targetSeasonKey = env.targetSeasonKey

  const context: ProviderImportContext = options?.contextOverride ?? {
    dryRun: options?.dryRun ?? true,
    requestedAt,
    source: adapter.name,
  }

  const competitions = await adapter.fetchCompetitions({ page: 1, perPage: 100 }, context)
  const selectedCompetition = selectCompetition(competitions.items, leagueIdFromEnv)

  const seasons = await adapter.fetchSeasons(selectedCompetition.key, { page: 1, perPage: 200 }, context)
  const selectedSeason = selectSeason(seasons.items, targetSeasonKey)

  return {
    competition: selectedCompetition,
    season: selectedSeason,
  }
}

export async function runMarketSeasonImport(options: ImportOptions): Promise<ImportReport> {
  const startedAt = nowISO()
  const adapter = options.adapterOverride ?? getMarketProviderAdapter()
  const progressFilePath = getProgressFilePath(options.progressFilePath)
  const requestDelayMs = getRequestDelayMs(options.requestDelayMs)
  const progressLogger = options.progressLogger

  // Ensure request delay is consistently applied in the provider layer for this run.
  process.env.MARKET_IMPORT_REQUEST_DELAY_MS = String(requestDelayMs)

  let requestsUsed = 0
  let rateLimitRetries = 0

  const logProgress = (line: string) => {
    if (progressLogger) {
      progressLogger(line)
    }
  }

  const context: ProviderImportContext = {
    dryRun: options.dryRun,
    requestedAt: startedAt,
    source: adapter.name,
    onProviderRequest: (event) => {
      if (event.status === 'success') {
        requestsUsed += 1
      }
      if (event.status === 'rate-limited') {
        rateLimitRetries += 1
        const waitMs = event.waitMs ?? DEFAULT_RATE_LIMIT_WAIT_MS
        logProgress(`Rate limited on ${event.path}. Waiting ${formatDuration(waitMs)} before retry.`)
      }
    },
  }

  const issues: ImportIssue[] = []
  const duplicateWarnings: Array<{ code: string; message: string; providerId?: string }> = []
  const unresolvedRecords: Array<{ code: string; message: string; providerId?: string; clubProviderId?: string }> = []
  const missingRequiredFields: Array<{ entity: 'club' | 'player'; field: string; providerId?: string; message: string }> = []
  const notes: string[] = []
  const playersPerClub: Record<string, number> = {}
  const positionCounts: Record<string, number> = {
    Goalkeeper: 0,
    Defender: 0,
    Midfielder: 0,
    Forward: 0,
    Unknown: 0,
  }

  let competition: ProviderCompetition
  let season: ProviderSeason

  try {
    const discovery = await discoverMarketCompetition({
      dryRun: options.dryRun,
      adapterOverride: adapter,
      contextOverride: context,
    })
    competition = discovery.competition
    season = discovery.season
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown discovery error'
    issues.push(issue('DISCOVERY_ERROR', message))

    const finishedAt = nowISO()
    setMarketImportStatus({
      lastImportAt: finishedAt,
      queuedFixtures: 0,
      message: `Import blocked at discovery: ${redactSecrets(message)}`,
      dryRun: true,
      source: adapter.name,
    })

    return {
      source: adapter.name,
      dryRun: true,
      startedAt,
      finishedAt,
      accessTimestamp: startedAt,
      writeMode: 'dry-run',
      imported: {
        competitions: 0,
        seasons: 0,
        clubs: 0,
        squads: 0,
        fixtures: 0,
        matchStats: 0,
      },
      skipped: {
        unresolvedPlayers: 0,
        duplicates: 0,
        suspiciousRecords: 0,
        records: 0,
      },
      runtime: {
        requestsUsed,
        rateLimitRetries,
        elapsedMs: Math.max(new Date(finishedAt).getTime() - new Date(startedAt).getTime(), 0),
        zeroPlayerClubs: [],
        completedClubs: 0,
        totalClubs: 0,
        resumed: Boolean(options.resume),
        progressFilePath,
      },
      issues,
      notes: ['Discovery failed before data retrieval.'],
    }
  }

  if (options.writeEnabled) {
    throw new Error('BLOCKED: database write mode is disabled in Sprint 7A')
  }

  if (options.competitionKey && options.competitionKey !== competition.key) {
    throw new Error(
      `ERROR: provided competitionKey ${options.competitionKey} does not match discovered key ${competition.key}`
    )
  }

  if (options.seasonKey && options.seasonKey !== season.key) {
    throw new Error(`ERROR: provided seasonKey ${options.seasonKey} does not match discovered key ${season.key}`)
  }

  const seasonKey = options.seasonKey ?? season.key

  const rawClubsPage = await adapter.fetchClubs(seasonKey, { page: 1, perPage: 100 }, context)
  const normalizedClubs = rawClubsPage.items
    .map(normalizeClub)
    .filter((club): club is NormalizedClub => Boolean(club))

  const resumed = Boolean(options.resume)
  const completedClubProviderIds = new Set<string>()
  const loadedProgress = resumed ? await loadProgressState(progressFilePath) : null

  const normalizedPlayers: NormalizedPlayer[] = []

  if (
    loadedProgress &&
    loadedProgress.source === adapter.name &&
    loadedProgress.seasonKey === seasonKey &&
    loadedProgress.providerCompetitionId === competition.providerCompetitionId
  ) {
    for (const providerId of loadedProgress.completedClubProviderIds) {
      completedClubProviderIds.add(providerId)
    }
    normalizedPlayers.push(...(loadedProgress.normalizedPlayers ?? []))
    logProgress(`Resume mode: loaded progress for ${completedClubProviderIds.size}/${normalizedClubs.length} clubs.`)
  } else if (resumed) {
    logProgress('Resume mode: no compatible progress file found; starting from first club.')
  }

  const startedMs = Date.now()

  const clubIdSet = new Set<string>()
  const clubNameSet = new Set<string>()
  const clubSlugSet = new Set<string>()

  for (const club of normalizedClubs) {
    const clubId = club.providerClubId
    const normalizedName = normalizeName(club.name)

    if (clubIdSet.has(clubId)) {
      issues.push(issue('DUPLICATE_CLUB_PROVIDER_ID', `duplicate club provider id ${clubId}`, clubId))
    }
    clubIdSet.add(clubId)

    if (clubNameSet.has(normalizedName)) {
      issues.push(issue('DUPLICATE_CLUB_NAME', `duplicate club name ${club.name}`, clubId))
    }
    clubNameSet.add(normalizedName)

    if (clubSlugSet.has(club.slug)) {
      issues.push(issue('DUPLICATE_CLUB_SLUG', `duplicate club slug ${club.slug}`, clubId))
    }
    clubSlugSet.add(club.slug)

    if (!club.primaryColour || !club.secondaryColour) {
      missingRequiredFields.push({
        entity: 'club',
        field: 'colour',
        providerId: clubId,
        message: `club ${club.name} is missing colour configuration`,
      })
    }
  }

  if (normalizedClubs.length !== 20) {
    issues.push(issue('INVALID_CLUB_COUNT', `expected 20 clubs but provider returned ${normalizedClubs.length}`))
  }

  const missingExpectedPromotedClubs = EXPECTED_PROMOTED_CLUBS.filter(
    (clubName) => !normalizedClubs.some((club) => normalizeName(club.name) === normalizeName(clubName))
  )
  if (missingExpectedPromotedClubs.length > 0) {
    notes.push(
      `WARNING: expected promoted clubs not found in provider response: ${missingExpectedPromotedClubs.join(', ')}`
    )
  }

  if (loadedProgress?.playersPerClub) {
    Object.assign(playersPerClub, loadedProgress.playersPerClub)
  }
  if (loadedProgress?.positionCounts) {
    for (const key of Object.keys(positionCounts)) {
      positionCounts[key] = loadedProgress.positionCounts[key] ?? 0
    }
  }
  if (loadedProgress?.requestsUsed && loadedProgress.requestsUsed > requestsUsed) {
    requestsUsed = loadedProgress.requestsUsed
  }
  if (loadedProgress?.rateLimitRetries && loadedProgress.rateLimitRetries > rateLimitRetries) {
    rateLimitRetries = loadedProgress.rateLimitRetries
  }

  for (let clubIndex = 0; clubIndex < normalizedClubs.length; clubIndex += 1) {
    const club = normalizedClubs[clubIndex]
    if (completedClubProviderIds.has(club.providerClubId)) {
      continue
    }

    logProgress(`Club ${clubIndex + 1}/${normalizedClubs.length}`)

    const squadPlayers = await fetchAllSquadPlayers(adapter, seasonKey, club, context)
    playersPerClub[club.name] = squadPlayers.length

    for (const providerPlayer of squadPlayers) {
      const player = normalizePlayer(club.providerClubId, providerPlayer)
      normalizedPlayers.push(player)
      positionCounts[player.positionGroup] = (positionCounts[player.positionGroup] ?? 0) + 1

      if (!player.providerPlayerId) {
        missingRequiredFields.push({
          entity: 'player',
          field: 'providerPlayerId',
          message: `missing provider player id in club ${club.name}`,
        })
      }
      if (!player.fullName) {
        missingRequiredFields.push({
          entity: 'player',
          field: 'fullName',
          providerId: player.providerPlayerId,
          message: `missing player full name in club ${club.name}`,
        })
      }
      if (!player.detailedPosition) {
        missingRequiredFields.push({
          entity: 'player',
          field: 'detailedPosition',
          providerId: player.providerPlayerId,
          message: `missing provider position text for player ${player.fullName || player.providerPlayerId}`,
        })
      }

      if (player.unresolvedReason) {
        unresolvedRecords.push({
          code: 'UNRESOLVED_PLAYER',
          message: `${player.fullName || player.providerPlayerId}: ${player.unresolvedReason}`,
          providerId: player.providerPlayerId,
          clubProviderId: club.providerClubId,
        })
      }
    }

    completedClubProviderIds.add(club.providerClubId)

    await writeProgressState(progressFilePath, {
      version: 1,
      source: adapter.name,
      seasonKey,
      providerCompetitionId: competition.providerCompetitionId,
      startedAt,
      updatedAt: nowISO(),
      completedClubProviderIds: Array.from(completedClubProviderIds),
      normalizedPlayers,
      playersPerClub,
      positionCounts,
      requestsUsed,
      rateLimitRetries,
    })

    const completedCount = completedClubProviderIds.size
    const remainingClubs = normalizedClubs.length - completedCount
    const elapsedMs = Date.now() - startedMs
    const estimatedRemainingMs = completedCount > 0
      ? (elapsedMs / completedCount) * remainingClubs
      : 0

    logProgress(`Club imported: ${club.name}`)
    logProgress(`Players imported: ${squadPlayers.length}`)
    logProgress(`Requests used: ${requestsUsed}`)
    logProgress(`Estimated remaining time: ${formatDuration(estimatedRemainingMs)}`)
  }

  const canonicalization = canonicalizePlayers(normalizedPlayers)
  const canonicalPlayers = canonicalization.canonicalPlayers.map((entry) => entry.player)
  const writeEligibleCanonicalPlayers = canonicalization.canonicalPlayers
    .filter((entry) => !entry.requiresReview)
    .map((entry) => entry.player)

  for (const duplicate of canonicalization.duplicateMemberships) {
    if (duplicate.classification === 'exact-duplicate-payload') {
      duplicateWarnings.push({
        code: 'EXACT_DUPLICATE_PAYLOAD',
        providerId: duplicate.providerPlayerId,
        message: `${duplicate.reason} clubs=${duplicate.clubs.join(', ')}`,
      })
      continue
    }

    const warningCode = duplicate.requiresReview ? 'PLAYER_MEMBERSHIP_REVIEW_REQUIRED' : 'PLAYER_MEMBERSHIP_WARNING'
    duplicateWarnings.push({
      code: warningCode,
      providerId: duplicate.providerPlayerId,
      message: `${duplicate.classification}: ${duplicate.reason}`,
    })

    if (duplicate.requiresReview) {
      unresolvedRecords.push({
        code: 'PLAYER_MEMBERSHIP_REQUIRES_REVIEW',
        message: `${duplicate.classification}: ${duplicate.reason}`,
        providerId: duplicate.providerPlayerId,
        clubProviderId: duplicate.activeClubProviderId,
      })
    }
  }

  const { existingClubProviderIds, existingPlayerProviderIds } = getExistingReferenceSets()
  const importedClubProviderIds = new Set(normalizedClubs.map((club) => club.providerClubId))
  const importedPlayerProviderIds = new Set(
    writeEligibleCanonicalPlayers
      .filter((player) => player.providerPlayerId.length > 0)
      .map((player) => player.providerPlayerId)
  )

  let clubInserts = 0
  let clubUpdates = 0
  for (const club of normalizedClubs) {
    if (!existingClubProviderIds.has(club.providerClubId)) {
      clubInserts += 1
    } else {
      clubUpdates += 1
    }
  }

  let playerInserts = 0
  let playerUpdates = 0
  for (const player of writeEligibleCanonicalPlayers) {
    if (!player.providerPlayerId) continue
    if (!existingPlayerProviderIds.has(player.providerPlayerId)) {
      playerInserts += 1
    } else {
      playerUpdates += 1
    }
  }

  let clubDeactivations = 0
  for (const existingProviderId of existingClubProviderIds) {
    if (!importedClubProviderIds.has(existingProviderId)) {
      clubDeactivations += 1
    }
  }

  let playerDeactivations = 0
  for (const existingProviderId of existingPlayerProviderIds) {
    if (!importedPlayerProviderIds.has(existingProviderId)) {
      playerDeactivations += 1
    }
  }

  for (const duplicate of duplicateWarnings) {
    if (duplicate.code === 'EXACT_DUPLICATE_PAYLOAD') {
      continue
    }

    if (duplicate.code === 'PLAYER_MEMBERSHIP_REVIEW_REQUIRED') {
      issues.push(issue('PLAYER_MEMBERSHIP_REVIEW_REQUIRED', duplicate.message, duplicate.providerId))
      continue
    }

    issues.push(issue('PLAYER_MEMBERSHIP_WARNING', duplicate.message, duplicate.providerId))
  }

  for (const missing of missingRequiredFields) {
    if (missing.entity === 'player' && missing.field === 'detailedPosition') {
      continue
    }
    issues.push(issue('MISSING_REQUIRED_FIELD', missing.message, missing.providerId))
  }

  if (normalizedClubs.length !== 20 || issues.some((entry) => entry.code.startsWith('DUPLICATE_CLUB_'))) {
    issues.push(issue('IMPORT_ABORTED', 'club validation failed; import was stopped before write stage'))
  }

  const finishedAt = nowISO()

  setMarketImportStatus({
    lastImportAt: finishedAt,
    queuedFixtures: 0,
    message: `clubs=${normalizedClubs.length}, rawPlayers=${normalizedPlayers.length}, canonicalPlayers=${canonicalPlayers.length}, issues=${issues.length}`,
    dryRun: true,
    source: adapter.name,
  })

  notes.push('Dry-run mode executed. No database writes were attempted.')
  notes.push('Write mode is intentionally disabled in Sprint 7A.')
  notes.push('No provider logos, crests, photos, or official kit artwork are stored.')
  notes.push(`Raw player rows received: ${normalizedPlayers.length}`)
  notes.push(`Unique canonical players: ${canonicalPlayers.length}`)
  notes.push(`Exact duplicate rows removed: ${canonicalization.exactDuplicatesRemoved}`)
  notes.push(`Conflicting club memberships: ${canonicalization.conflictingClubMemberships}`)
  notes.push(`Unresolved players requiring review: ${canonicalization.unresolvedPlayersRequiringReview}`)

  const zeroPlayerClubs = Object.entries(playersPerClub)
    .filter(([, count]) => count === 0)
    .map(([clubName]) => clubName)

  const elapsedMs = Math.max(new Date(finishedAt).getTime() - new Date(startedAt).getTime(), 0)
  notes.push(`Requests used: ${requestsUsed}`)
  notes.push(`Rate-limit retries: ${rateLimitRetries}`)

  return {
    source: adapter.name,
    dryRun: true,
    startedAt,
    finishedAt,
    accessTimestamp: startedAt,
    providerCompetitionId: competition.providerCompetitionId,
    competitionName: competition.name,
    seasonKey,
    importRunId: randomUUID(),
    writeMode: 'staging-disabled',
    imported: {
      competitions: 1,
      seasons: 1,
      clubs: normalizedClubs.length,
      squads: canonicalPlayers.length,
      fixtures: 0,
      matchStats: 0,
    },
    skipped: {
      unresolvedPlayers: unresolvedRecords.length,
      duplicates: duplicateWarnings.length,
      suspiciousRecords: 0,
      records: unresolvedRecords.length,
    },
    runtime: {
      requestsUsed,
      rateLimitRetries,
      elapsedMs,
      zeroPlayerClubs,
      completedClubs: completedClubProviderIds.size,
      totalClubs: normalizedClubs.length,
      resumed,
      progressFilePath,
    },
    normalization: {
      rawPlayerRowsReceived: normalizedPlayers.length,
      uniqueCanonicalPlayers: canonicalPlayers.length,
      exactDuplicatesRemoved: canonicalization.exactDuplicatesRemoved,
      conflictingClubMemberships: canonicalization.conflictingClubMemberships,
      unresolvedPlayersRequiringReview: canonicalization.unresolvedPlayersRequiringReview,
      duplicateMemberships: canonicalization.duplicateMemberships,
    },
    positionCounts,
    playersPerClub,
    unresolvedRecords,
    duplicateWarnings,
    missingRequiredFields,
    prospectiveChanges: {
      clubs: {
        inserts: clubInserts,
        updates: clubUpdates,
        deactivations: clubDeactivations,
      },
      players: {
        inserts: playerInserts,
        updates: playerUpdates,
        deactivations: playerDeactivations,
      },
    },
    issues,
    notes,
  }
}

export function summarizeImportReport(report: ImportReport): string[] {
  const lines: string[] = []

  if (report.issues.some((entry) => entry.code === 'DISCOVERY_ERROR')) {
    const discoveryMessage = report.issues.find((entry) => entry.code === 'DISCOVERY_ERROR')?.message ?? 'Discovery failed'
    if (discoveryMessage.startsWith('BLOCKED:')) {
      lines.push(discoveryMessage)
    } else {
      lines.push(`ERROR: ${discoveryMessage}`)
    }
    return lines
  }

  if (report.imported.clubs === 20) {
    lines.push('PASS: 20 clubs validated')
  } else {
    lines.push(`ERROR: expected 20 clubs, received ${report.imported.clubs}`)
  }

  if (report.normalization) {
    lines.push(
      `PASS: ${report.normalization.rawPlayerRowsReceived} raw squad rows normalized into ${report.normalization.uniqueCanonicalPlayers} canonical players`
    )
    lines.push(`PASS: ${report.normalization.exactDuplicatesRemoved} exact duplicate rows deduplicated`)
  } else {
    lines.push(`PASS: ${report.imported.squads} squad records normalized`)
  }

  if (report.skipped.unresolvedPlayers > 0) {
    lines.push(`WARNING: ${report.skipped.unresolvedPlayers} players have unresolved records`)
  } else {
    lines.push('PASS: no unresolved player records')
  }

  const reviewWarnings = report.issues.filter((entry) => entry.code === 'PLAYER_MEMBERSHIP_REVIEW_REQUIRED')
  const membershipWarnings = report.issues.filter((entry) => entry.code === 'PLAYER_MEMBERSHIP_WARNING')

  if (reviewWarnings.length > 0) {
    lines.push(`WARNING: ${reviewWarnings.length} unresolved cross-club membership conflict(s) require review`)
  }

  if (membershipWarnings.length > 0) {
    lines.push(`WARNING: ${membershipWarnings.length} resolved cross-club membership warning(s) detected`)
  }

  if (reviewWarnings.length === 0 && membershipWarnings.length === 0) {
    const exactDuplicateCount = report.normalization?.exactDuplicatesRemoved ?? 0
    if (exactDuplicateCount > 0) {
      lines.push(`PASS: exact duplicate payload rows were deduplicated automatically`) 
    } else {
      lines.push('PASS: no duplicate warnings found')
    }
  } else {
    lines.push(`WARNING: ${reviewWarnings.length + membershipWarnings.length} membership warning(s) reported`)
  }

  if (report.normalization && report.normalization.unresolvedPlayersRequiringReview > 0) {
    lines.push(`WARNING: ${report.normalization.unresolvedPlayersRequiringReview} players are excluded from live-write eligibility until reviewed`)
  }

  if (report.issues.length > 0) {
    const blocking = report.issues.filter((entry) => entry.code.startsWith('IMPORT_ABORTED') || entry.code.startsWith('INVALID_'))
    if (blocking.length > 0) {
      lines.push(`ERROR: ${blocking.length} blocking validation issue(s)`) 
    } else {
      lines.push(`WARNING: ${report.issues.length} issue(s) reported`) 
    }
  } else {
    lines.push('PASS: no import issues reported')
  }

  return lines
}
