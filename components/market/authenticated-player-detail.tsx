'use client'

import { useAuth } from '@/components/auth-provider'
import { PlayerDetailPanel } from '@/components/market/player-detail-panel'
import type { MarketPlayerProfileView } from '@/lib/market/types'

export function AuthenticatedPlayerDetail({ row }: { row: MarketPlayerProfileView }) {
  const { user, loading } = useAuth()
  return <PlayerDetailPanel row={row} authRequired={loading || !user} owned={false} />
}
