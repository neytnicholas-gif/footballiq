'use client'

import { useEffect, useState } from 'react'
import { SiteHeader } from '@/components/site-header'
import { PlayerMarketLeaderboard } from '@/components/market/player-market-leaderboard'
import { loadMarketLeaderboard } from '@/lib/market/client'
import type { MarketLeaderboardRow } from '@/lib/market/types'

export default function PlayerMarketLeaderboardPage() {
  const [rows, setRows] = useState<MarketLeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    void (async () => {
      const { data, error: loadError } = await loadMarketLeaderboard('daily_gain')
      if (!active) return
      if (loadError) setError(loadError.message)
      setRows(data)
      setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [])

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {error ? <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
        {loading ? <p className="text-sm text-muted-foreground">Loading market leaderboard…</p> : <PlayerMarketLeaderboard rows={rows} />}
      </section>
    </main>
  )
}
