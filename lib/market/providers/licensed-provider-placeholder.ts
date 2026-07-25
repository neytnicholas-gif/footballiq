import type { PlayerDataProvider } from '@/lib/market/provider'
import { validateProviderAudit } from '@/lib/market/provider'

function notEnabled() {
  throw new Error('Licensed market data provider is disabled. Legal/licensing verification is required before activation.')
}

export const licensedProviderPlaceholder: PlayerDataProvider = {
  name: 'Licensed Provider Placeholder (Disabled)',
  async fetchPlayers() {
    notEnabled()
    return []
  },
  async fetchSeasonStats() {
    notEnabled()
    return []
  },
  async fetchFixtures() {
    notEnabled()
    return []
  },
  normalisePlayer() {
    return null
  },
  normaliseStats() {
    return null
  },
  validateProvenance(meta) {
    return validateProviderAudit(meta)
  },
}
