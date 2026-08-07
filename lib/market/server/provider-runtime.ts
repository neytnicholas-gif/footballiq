import type { RealPerformanceProvider } from '@/lib/market/performance-ingestion'
import { disabledRealPerformanceProvider } from '@/lib/market/performance-ingestion'

// The only runtime provider-selection boundary. No NEXT_PUBLIC variable is
// permitted here; the adapter stays disabled until licensing and server-side
// credentials are approved independently.
export function getRealPerformanceProvider(): RealPerformanceProvider {
  if (typeof window !== 'undefined') throw new Error('Provider adapters are server-only.')
  return disabledRealPerformanceProvider
}

// Trial adapters are constructed explicitly by offline/operator tooling. They
// are intentionally never selected from environment variables here, so adding
// a credential cannot accidentally activate production ingestion.
