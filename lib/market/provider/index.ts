import { apiFootballAdapter } from '@/lib/market/provider/api-football'
import type { DataProviderAdapter } from '@/lib/market/provider/types'

export function getMarketProviderAdapter(): DataProviderAdapter {
  const provider = process.env.MARKET_DATA_PROVIDER || 'api-football'

  switch (provider) {
    case 'api-football':
      return apiFootballAdapter
    default:
      throw new Error(`Unsupported MARKET_DATA_PROVIDER: ${provider}`)
  }
}
