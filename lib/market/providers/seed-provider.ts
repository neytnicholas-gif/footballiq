import type { PlayerDataProvider, NormalizedPlayer, NormalizedSeasonStats } from '@/lib/market/provider'
import { createProviderAudit, toMarketSlug, validateProviderAudit } from '@/lib/market/provider'

const seedPlayers: Array<Omit<NormalizedPlayer, 'audit' | 'slug'> & { slug?: string }> = [
  { displayName: 'Lucas Vale', shortName: 'L. Vale', clubName: 'Northbridge FC', position: 'GK', nationality: 'Portugal', active: true, openingValue: 5900000, previousValue: 6100000, currentValue: 6200000 },
  { displayName: 'Mateo Ryder', shortName: 'M. Ryder', clubName: 'Kingsport Athletic', position: 'GK', nationality: 'Argentina', active: true, openingValue: 6800000, previousValue: 7000000, currentValue: 7100000 },
  { displayName: 'Leon Costa', shortName: 'L. Costa', clubName: 'Harbor United', position: 'DEF', nationality: 'Spain', active: true, openingValue: 7900000, previousValue: 8400000, currentValue: 8600000 },
  { displayName: 'Julian Rossi', shortName: 'J. Rossi', clubName: 'Riverside Albion', position: 'DEF', nationality: 'Italy', active: true, openingValue: 8500000, previousValue: 9000000, currentValue: 9100000 },
  { displayName: 'Rafael Nunes', shortName: 'R. Nunes', clubName: 'Southgate City', position: 'MID', nationality: 'Brazil', active: true, openingValue: 11500000, previousValue: 12000000, currentValue: 12300000 },
  { displayName: 'Enzo Marin', shortName: 'E. Marin', clubName: 'Riverside Albion', position: 'MID', nationality: 'France', active: true, openingValue: 10500000, previousValue: 11200000, currentValue: 11400000 },
  { displayName: 'Andre Silva Jr', shortName: 'A. Silva', clubName: 'Northbridge FC', position: 'FWD', nationality: 'Brazil', active: true, openingValue: 12800000, previousValue: 13500000, currentValue: 13700000 },
  { displayName: 'Matias Orozco', shortName: 'M. Orozco', clubName: 'Kingsport Athletic', position: 'FWD', nationality: 'Chile', active: true, openingValue: 10800000, previousValue: 11600000, currentValue: 11900000 },
]

const seedStats: NormalizedSeasonStats[] = seedPlayers.map((player) => ({
  playerSlug: player.slug ?? toMarketSlug(player.displayName),
  season: '2026',
  competitionLabel: 'Domestic League',
  stats: {
    appearances: player.position === 'GK' ? 28 : 31,
    starts: player.position === 'GK' ? 28 : 27,
    minutes: player.position === 'GK' ? 2520 : 2360,
    goals: player.position === 'FWD' ? 12 : player.position === 'MID' ? 6 : null,
    assists: player.position === 'MID' ? 7 : player.position === 'FWD' ? 4 : null,
    clean_sheets: player.position === 'GK' || player.position === 'DEF' ? 10 : null,
    shots: player.position === 'MID' || player.position === 'FWD' ? 42 : null,
    shots_on_target: player.position === 'MID' || player.position === 'FWD' ? 18 : null,
    chances_created: player.position === 'MID' ? 34 : null,
    key_passes: player.position === 'MID' ? 46 : null,
    tackles: player.position === 'DEF' || player.position === 'MID' ? 44 : null,
    interceptions: player.position === 'DEF' || player.position === 'MID' ? 39 : null,
    clearances: player.position === 'DEF' ? 92 : null,
    saves: player.position === 'GK' ? 87 : null,
    goals_conceded: player.position === 'GK' ? 35 : player.position === 'DEF' ? 41 : null,
  },
  audit: createProviderAudit('owner-seed', 'owner_seed_demo', false, 'internal-seed-v1'),
}))

function normalizeSeedPlayer(raw: unknown): NormalizedPlayer | null {
  if (!raw || typeof raw !== 'object') return null
  const player = raw as Record<string, unknown>
  const name = typeof player.displayName === 'string' ? player.displayName : null
  const club = typeof player.clubName === 'string' ? player.clubName : null
  const position = player.position
  const currentValue = typeof player.currentValue === 'number' ? player.currentValue : null

  if (!name || !club || !currentValue || (position !== 'GK' && position !== 'DEF' && position !== 'MID' && position !== 'FWD')) {
    return null
  }

  return {
    slug: typeof player.slug === 'string' ? player.slug : toMarketSlug(name),
    displayName: name,
    shortName: typeof player.shortName === 'string' ? player.shortName : null,
    clubName: club,
    position,
    nationality: typeof player.nationality === 'string' ? player.nationality : null,
    active: player.active !== false,
    openingValue: typeof player.openingValue === 'number' ? player.openingValue : currentValue,
    previousValue: typeof player.previousValue === 'number' ? player.previousValue : currentValue,
    currentValue,
    audit: createProviderAudit('owner-seed', 'owner_seed_demo', false, 'internal-seed-v1'),
  }
}

function normalizeSeedStats(raw: unknown): NormalizedSeasonStats | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (typeof row.playerSlug !== 'string' || typeof row.season !== 'string' || typeof row.competitionLabel !== 'string' || typeof row.stats !== 'object' || row.stats === null) {
    return null
  }

  return {
    playerSlug: row.playerSlug,
    season: row.season,
    competitionLabel: row.competitionLabel,
    stats: row.stats as NormalizedSeasonStats['stats'],
    audit: createProviderAudit('owner-seed', 'owner_seed_demo', false, 'internal-seed-v1'),
  }
}

export const seedDataProvider: PlayerDataProvider = {
  name: 'Owner Seed Provider',
  async fetchPlayers() {
    return seedPlayers.map((row) => normalizeSeedPlayer(row)).filter((row): row is NormalizedPlayer => row !== null)
  },
  async fetchSeasonStats() {
    return seedStats.map((row) => normalizeSeedStats(row)).filter((row): row is NormalizedSeasonStats => row !== null)
  },
  async fetchFixtures() {
    return []
  },
  normalisePlayer: normalizeSeedPlayer,
  normaliseStats: normalizeSeedStats,
  validateProvenance(meta) {
    return validateProviderAudit(meta)
  },
}
