'use client'

import { useEffect, useState } from 'react'
import { loadMyMarketProgression } from '@/lib/market/client'
import type { MarketFormationKey } from '@/lib/market/formation'

export function useMarketFormation() {
  const [formation, setFormation] = useState<MarketFormationKey>('4-3-3')
  useEffect(() => {
    let active = true
    void loadMyMarketProgression(false).then((result) => {
      if (active) setFormation(result.data.preferences.active_formation)
    })
    return () => { active = false }
  }, [])
  return formation
}
