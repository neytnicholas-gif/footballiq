import { readFile } from 'fs/promises'
import { readFileSync } from 'fs'
import path from 'path'
import { getFootballIQClubColours } from '@/lib/market/club-colours'
import { readImportReviewDecisions } from '@/lib/market/import-review'
import { computeInitialFootballIQValueMinor } from '@/lib/market/initial-valuation'
import type { MarketClub, MarketPlayer, MarketSeason } from '@/lib/market/types'

type ProgressPlayerRow = {
  providerPlayerId: string
  fullName: string
  displayName: string
  positionGroup: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward' | 'Unknown'
  detailedPosition?: string
  nationality?: string
  shirtNumber?: number
  clubProviderId: string
}

type ProgressFile = {
  seasonKey: string
  completedClubProviderIds: string[]
  playersPerClub: Record<string, number>
  normalizedPlayers: ProgressPlayerRow[]
}

type DuplicateMembership = {
  providerPlayerId: string
  requiresReview: boolean
  activeClubProviderId?: string
  clubs: string[]
  reason: string
}

type ReportFile = {
  seasonKey: string
  normalization?: {
    duplicateMemberships: DuplicateMembership[]
  }
}

type DevelopmentDatasetJson = {
  generatedAt: string
  sourceSeasonKey: string
  seasonLabel: string
  notes: string[]
  clubs: Array<{
    providerClubId: string
    name: string
    shortName: string
    slug: string
    primaryColour: string
    secondaryColour: string
  }>
  players: Array<{
    providerPlayerId: string
    fullName: string
    displayName: string
    positionGroup: 'GK' | 'DEF' | 'MID' | 'FWD'
    detailedPosition: string
    nationality?: string
    shirtNumber?: number
    clubProviderId: string
    initialPriceMinor: number
  }>
}

const PROGRESS_PATH = path.join(process.cwd(), 'tmp', 'market-import-progress.json')
const REPORT_PATH = path.join(process.cwd(), 'tmp', 'market-import-preview.json')
const DATASET_PATH = path.join(process.cwd(), 'tmp', 'market-playable-dataset.json')

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function slugify(value: string): string {
  return normalizeSpaces(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function mapPositionGroup(value: ProgressPlayerRow['positionGroup']): 'GK' | 'DEF' | 'MID' | 'FWD' | null {
  if (value === 'Goalkeeper') return 'GK'
  if (value === 'Defender') return 'DEF'
  if (value === 'Midfielder') return 'MID'
  if (value === 'Forward') return 'FWD'
  return null
}

function buildClubNameMap(progress: ProgressFile): Map<string, string> {
  const providerIds = progress.completedClubProviderIds
  const names = Object.keys(progress.playersPerClub)
  const map = new Map<string, string>()

  const count = Math.min(providerIds.length, names.length)
  for (let index = 0; index < count; index += 1) {
    map.set(providerIds[index], names[index])
  }

  return map
}

async function readJson<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, 'utf8')
  return JSON.parse(content) as T
}

export async function loadDevelopmentDatasetFromFile(): Promise<{
  season: MarketSeason
  clubs: MarketClub[]
  players: MarketPlayer[]
} | null> {
  try {
    const raw = await readJson<DevelopmentDatasetJson>(DATASET_PATH)
    const seasonId = `dev-${raw.sourceSeasonKey}`

    const season: MarketSeason = {
      id: seasonId,
      name: `Development ${raw.seasonLabel}`,
      competitionKey: 'development-premier-league',
      seasonKey: raw.sourceSeasonKey,
      startsAt: `${raw.sourceSeasonKey.replace('season-', '')}-08-01T00:00:00.000Z`,
      endsAt: `${Number.parseInt(raw.sourceSeasonKey.replace('season-', ''), 10) + 1}-05-31T23:59:59.999Z`,
      isActive: true,
      dataUpdatedAt: raw.generatedAt,
    }

    const clubs: MarketClub[] = raw.clubs.map((club) => ({
      id: `club-${club.providerClubId}`,
      seasonId,
      providerClubId: club.providerClubId,
      name: club.name,
      shortName: club.shortName,
      slug: club.slug,
      primaryColour: club.primaryColour,
      secondaryColour: club.secondaryColour,
      isActive: true,
      dataUpdatedAt: raw.generatedAt,
    }))

    const players: MarketPlayer[] = raw.players.map((player) => ({
      id: `player-${player.providerPlayerId}`,
      seasonId,
      clubId: `club-${player.clubProviderId}`,
      providerPlayerId: player.providerPlayerId,
      fullName: player.fullName,
      displayName: player.displayName,
      slug: slugify(`${player.fullName}-${player.providerPlayerId}`),
      positionGroup: player.positionGroup,
      detailedPosition: player.detailedPosition,
      nationality: player.nationality ?? null,
      shirtNumber: typeof player.shirtNumber === 'number' ? player.shirtNumber : null,
      initialPriceMinor: player.initialPriceMinor,
      currentPriceMinor: player.initialPriceMinor,
      performanceBankMilli: 0,
      latestRatingMilli: null,
      isAvailable: true,
      availabilityStatus: 'available',
      dataUpdatedAt: raw.generatedAt,
      isDemoSeed: true,
    }))

    return { season, clubs, players }
  } catch {
    return null
  }
}

export function loadDevelopmentDatasetFromFileSync(): {
  season: MarketSeason
  clubs: MarketClub[]
  players: MarketPlayer[]
} | null {
  try {
    const raw = JSON.parse(readFileSync(DATASET_PATH, 'utf8')) as DevelopmentDatasetJson
    const seasonId = `dev-${raw.sourceSeasonKey}`

    const season: MarketSeason = {
      id: seasonId,
      name: `Development ${raw.seasonLabel}`,
      competitionKey: 'development-premier-league',
      seasonKey: raw.sourceSeasonKey,
      startsAt: `${raw.sourceSeasonKey.replace('season-', '')}-08-01T00:00:00.000Z`,
      endsAt: `${Number.parseInt(raw.sourceSeasonKey.replace('season-', ''), 10) + 1}-05-31T23:59:59.999Z`,
      isActive: true,
      dataUpdatedAt: raw.generatedAt,
    }

    const clubs: MarketClub[] = raw.clubs.map((club) => ({
      id: `club-${club.providerClubId}`,
      seasonId,
      providerClubId: club.providerClubId,
      name: club.name,
      shortName: club.shortName,
      slug: club.slug,
      primaryColour: club.primaryColour,
      secondaryColour: club.secondaryColour,
      isActive: true,
      dataUpdatedAt: raw.generatedAt,
    }))

    const players: MarketPlayer[] = raw.players.map((player) => ({
      id: `player-${player.providerPlayerId}`,
      seasonId,
      clubId: `club-${player.clubProviderId}`,
      providerPlayerId: player.providerPlayerId,
      fullName: player.fullName,
      displayName: player.displayName,
      slug: slugify(`${player.fullName}-${player.providerPlayerId}`),
      positionGroup: player.positionGroup,
      detailedPosition: player.detailedPosition,
      nationality: player.nationality ?? null,
      shirtNumber: typeof player.shirtNumber === 'number' ? player.shirtNumber : null,
      initialPriceMinor: player.initialPriceMinor,
      currentPriceMinor: player.initialPriceMinor,
      performanceBankMilli: 0,
      latestRatingMilli: null,
      isAvailable: true,
      availabilityStatus: 'available',
      dataUpdatedAt: raw.generatedAt,
      isDemoSeed: true,
    }))

    return { season, clubs, players }
  } catch {
    return null
  }
}

export async function buildDevelopmentDatasetFromImportArtifacts(): Promise<{
  dataset: DevelopmentDatasetJson
  excluded: Array<{
    providerPlayerId: string
    reason: string
    clubs: string[]
  }>
}> {
  const report = await readJson<ReportFile>(REPORT_PATH)
  const progress = await readJson<ProgressFile>(PROGRESS_PATH)
  const reviewDecisions = await readImportReviewDecisions()

  const unresolvedMemberships = new Map<string, DuplicateMembership>()
  const resolvedMemberships = new Map<string, DuplicateMembership>()

  for (const membership of report.normalization?.duplicateMemberships ?? []) {
    if (membership.requiresReview) {
      unresolvedMemberships.set(membership.providerPlayerId, membership)
    } else {
      resolvedMemberships.set(membership.providerPlayerId, membership)
    }
  }

  const rowsByProviderId = new Map<string, ProgressPlayerRow[]>()
  for (const row of progress.normalizedPlayers) {
    if (!row.providerPlayerId) continue
    const existing = rowsByProviderId.get(row.providerPlayerId) ?? []
    existing.push(row)
    rowsByProviderId.set(row.providerPlayerId, existing)
  }

  const clubNameByProviderId = buildClubNameMap(progress)

  const clubsSeen = new Map<string, DevelopmentDatasetJson['clubs'][number]>()
  const players: DevelopmentDatasetJson['players'] = []
  const excluded: Array<{ providerPlayerId: string; reason: string; clubs: string[] }> = []

  const providerIds = Array.from(rowsByProviderId.keys()).sort((a, b) => a.localeCompare(b))

  for (const providerPlayerId of providerIds) {
    const rows = rowsByProviderId.get(providerPlayerId) ?? []
    if (rows.length === 0) continue

    const unresolved = unresolvedMemberships.get(providerPlayerId)
    if (unresolved) {
      const reviewed = reviewDecisions.decisions[providerPlayerId]
      if (reviewed?.activeClubProviderId) {
        const reviewedRow = rows.find((row) => row.clubProviderId === reviewed.activeClubProviderId)
        if (reviewedRow) {
          rows.length = 0
          rows.push(reviewedRow)
        } else {
          excluded.push({
            providerPlayerId,
            reason: `Reviewed active club ${reviewed.activeClubProviderId} not present in latest raw rows.`,
            clubs: unresolved.clubs,
          })
          continue
        }
      } else {
        excluded.push({
          providerPlayerId,
          reason: unresolved.reason,
          clubs: unresolved.clubs,
        })
        continue
      }
    }

    if (rows.length === 0) {
      excluded.push({
        providerPlayerId,
        reason: 'No normalized rows available after unresolved-membership review handling.',
        clubs: [],
      })
      continue
    }

    let selected = rows[0]
    const resolved = resolvedMemberships.get(providerPlayerId)
    if (resolved?.activeClubProviderId) {
      const byClub = rows.find((row) => row.clubProviderId === resolved.activeClubProviderId)
      if (byClub) selected = byClub
    }

    const fullName = normalizeSpaces(selected.fullName || '')
    const displayName = normalizeSpaces(selected.displayName || fullName)
    const positionGroup = mapPositionGroup(selected.positionGroup)

    if (!fullName || !displayName || !positionGroup || !providerPlayerId || !selected.clubProviderId) {
      excluded.push({
        providerPlayerId,
        reason: 'Missing required playable fields (name, position, provider id, or club id).',
        clubs: Array.from(new Set(rows.map((row) => row.clubProviderId))),
      })
      continue
    }

    const clubName = clubNameByProviderId.get(selected.clubProviderId)
    if (!clubName) {
      excluded.push({
        providerPlayerId,
        reason: `Club name could not be mapped for provider club id ${selected.clubProviderId}.`,
        clubs: [selected.clubProviderId],
      })
      continue
    }

    if (!clubsSeen.has(selected.clubProviderId)) {
      const colours = getFootballIQClubColours(clubName)
      clubsSeen.set(selected.clubProviderId, {
        providerClubId: selected.clubProviderId,
        name: clubName,
        shortName: normalizeSpaces(clubName.split(' ').slice(0, 2).join(' ')),
        slug: slugify(clubName),
        primaryColour: colours.primary,
        secondaryColour: colours.secondary,
      })
    }

    const initialPriceMinor = computeInitialFootballIQValueMinor({
      providerPlayerId,
      positionGroup,
      hasNationality: Boolean(selected.nationality),
      hasDetailedPosition: Boolean(selected.detailedPosition && selected.detailedPosition.trim().length > 0),
      squadDataConfidence: resolved ? 'medium' : 'high',
    })

    players.push({
      providerPlayerId,
      fullName,
      displayName,
      positionGroup,
      detailedPosition: normalizeSpaces(selected.detailedPosition || selected.positionGroup),
      nationality: selected.nationality ? normalizeSpaces(selected.nationality) : undefined,
      shirtNumber: typeof selected.shirtNumber === 'number' ? selected.shirtNumber : undefined,
      clubProviderId: selected.clubProviderId,
      initialPriceMinor,
    })
  }

  const seasonYear = progress.seasonKey.replace('season-', '')
  const dataset: DevelopmentDatasetJson = {
    generatedAt: new Date().toISOString(),
    sourceSeasonKey: progress.seasonKey,
    seasonLabel: `${seasonYear}/${String(Number.parseInt(seasonYear, 10) + 1).slice(-2)} development season`,
    notes: [
      'Development dataset generated from cached dry-run import artifacts.',
      'Unresolved duplicate memberships are excluded from playable market data.',
      'FootballIQ values are deterministic development-only starting values, not external market prices.',
    ],
    clubs: Array.from(clubsSeen.values()).sort((a, b) => a.name.localeCompare(b.name)),
    players: players.sort((a, b) => a.displayName.localeCompare(b.displayName)),
  }

  return {
    dataset,
    excluded,
  }
}
