'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export const MARKET_JOURNEY_EVENT = 'verdict-xi:market-journey'

export function marketJourneyKey(userId: string | undefined, step: 'market' | 'roster') {
  return `verdict-xi:journey:${userId ?? 'guest'}:${step}`
}

export function MarketJourneyTracker({ userId }: { userId?: string }) {
  const pathname = usePathname()

  useEffect(() => {
    const step = pathname === '/market/roster' || pathname === '/market/portfolio'
      ? 'roster'
      : pathname.startsWith('/market/players') || pathname.startsWith('/market/player/')
        ? 'market'
        : null
    if (!step) return
    window.localStorage.setItem(marketJourneyKey(userId, step), '1')
    window.dispatchEvent(new CustomEvent(MARKET_JOURNEY_EVENT))
  }, [pathname, userId])

  return null
}
