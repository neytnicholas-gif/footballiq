'use client'

import { useEffect, useState } from 'react'
import { loadMyMarketProgression, MARKET_FORMATION_CHANGED_EVENT } from '@/lib/market/client'
import type { MarketFormationKey } from '@/lib/market/formation'

export function useMarketFormation() {
  const [formation, setFormation] = useState<MarketFormationKey>('4-3-3')
  useEffect(() => {
    let active = true
    const onFormationChanged = (event: Event) => {
      const next = (event as CustomEvent<MarketFormationKey>).detail
      if (next) setFormation(next)
    }
    window.addEventListener(MARKET_FORMATION_CHANGED_EVENT, onFormationChanged)
    void loadMyMarketProgression(false).then((result) => {
      if (active) setFormation(result.data.preferences.active_formation)
    })
    return () => {
      active = false
      window.removeEventListener(MARKET_FORMATION_CHANGED_EVENT, onFormationChanged)
    }
  }, [])
  return formation
}
