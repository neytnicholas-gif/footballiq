'use client'

import { useEffect, useState } from 'react'
import { SiteHeader } from '@/components/site-header'
import { PlayerMarketReveal } from '@/components/market/player-market-reveal'
import { MarketNavigation } from '@/components/market/market-navigation'
import { loadMarketPlayers, loadMyLatestReveal, loadMyRevealHistory } from '@/lib/market/client'
import type { MarketPlayer, MarketRevealSummary } from '@/lib/market/types'
import { friendlyMarketLoadError } from '@/lib/market/user-errors'

export default function PlayerMarketRevealPage() {
  const [latest, setLatest] = useState<MarketRevealSummary | null>(null)
  const [history, setHistory] = useState<MarketRevealSummary[]>([])
  const [players, setPlayers] = useState<MarketPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    void (async () => {
      setLoading(true)
      setError('')
      const [latestResult, historyResult, playersResult] = await Promise.all([loadMyLatestReveal(), loadMyRevealHistory(12), loadMarketPlayers()])
      if (!active) return
      if (latestResult.error) setError(friendlyMarketLoadError(latestResult.error))
      if (historyResult.error) setError(friendlyMarketLoadError(historyResult.error))
      setLatest(latestResult.data)
      setHistory(historyResult.data)
      setPlayers(playersResult.data)
      setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [])

  return (
    <main className="market-theme min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,.10),transparent_34%),linear-gradient(180deg,#f7fbf9_0%,#eef6f2_48%,#f8faf9_100%)]">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <MarketNavigation />
        {error ? <p role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
        {loading ? <p className="text-sm text-muted-foreground">Loading Reveal…</p> : <PlayerMarketReveal latest={latest} history={history} players={players} />}
      </section>
    </main>
  )
}
