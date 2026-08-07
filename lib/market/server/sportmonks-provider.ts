import type { RealPerformanceProvider } from '@/lib/market/performance-ingestion'
import {
  normaliseSportmonksAppearance,
  normaliseSportmonksFixture,
  normaliseSportmonksPlayer,
  SPORTMONKS_PROVIDER_NAME,
  type SportmonksFixtureRow,
  type SportmonksLineupRow,
  type SportmonksSquadRow,
} from '@/lib/market/providers/sportmonks'

export type SportmonksTrialSource = {
  fetchSquads(): Promise<SportmonksSquadRow[]>
  fetchFixtures(since: string): Promise<SportmonksFixtureRow[]>
  fetchLineups(providerFixtureId: string): Promise<SportmonksLineupRow[]>
  sourceReference(kind: 'squads' | 'fixtures' | 'lineups', id?: string): string
}

export type SportmonksTrialConfig = {
  enabled: boolean
  seasonStart: string
  now(): Date
}

function assertServer() {
  if (typeof window !== 'undefined') throw new Error('Sportmonks provider access is server-only.')
}

function assertTrialEnabled(config: SportmonksTrialConfig) {
  assertServer()
  if (!config.enabled) throw new Error('Sportmonks trial adapter is disabled.')
}

export function createSportmonksTrialProvider(source: SportmonksTrialSource, config: SportmonksTrialConfig): RealPerformanceProvider {
  return {
    name: `${SPORTMONKS_PROVIDER_NAME} (trial)`,
    enabled: config.enabled,
    async fetchPlayers() {
      assertTrialEnabled(config)
      const rows = await source.fetchSquads()
      return rows.flatMap((row) => {
        const result = normaliseSportmonksPlayer(row, { seasonStart: config.seasonStart })
        return result.value ? [result.value] : []
      })
    },
    async fetchFixtures(since) {
      assertTrialEnabled(config)
      const rows = await source.fetchFixtures(since)
      return rows.flatMap((row) => {
        const result = normaliseSportmonksFixture(row)
        return result.value ? [result.value] : []
      })
    },
    async fetchAppearances(fixtureId) {
      assertTrialEnabled(config)
      const rows = await source.fetchLineups(fixtureId)
      const context = {
        sourceReference: source.sourceReference('lineups', fixtureId),
        retrievedAt: config.now().toISOString(),
      }
      return rows.flatMap((row) => {
        const result = normaliseSportmonksAppearance(row, context)
        return result.value ? [result.value] : []
      })
    },
  }
}
