'use client'

import { useEffect, useState } from 'react'
import { SiteHeader } from '@/components/site-header'
import { PlayerMarketLeaderboard, type MarketLeaderboardBoard } from '@/components/market/player-market-leaderboard'
import { loadMarketLeaderboard } from '@/lib/market/client'
import type { MarketLeaderboardRow } from '@/lib/market/types'

export default function PlayerMarketLeaderboardPage() {
  const [rows, setRows] = useState<MarketLeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [board, setBoard] = useState<MarketLeaderboardBoard>('daily_gain')

  useEffect(() => {
    let active = true

    void (async () => {
      setLoading(true)
      setError('')
      const { data, error: loadError } = await loadMarketLeaderboard(board)
      if (!active) return
      if (loadError) setError('Market rankings are temporarily unavailable. Please try again shortly.')
      setRows(data)
      setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [board])

  return (
    <main className="market-theme market-shell min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {error ? <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
        {loading ? <p role="status" aria-live="polite" className="text-sm text-muted-foreground">Loading market leaderboard…</p> : <PlayerMarketLeaderboard rows={rows} board={board} onBoardChange={setBoard} />}
      </section>
    </main>
  )
}
