'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { PlayerMarketDetail } from '@/components/market/player-market-detail'
import { MarketDisclaimer } from '@/components/market/market-disclaimer'
import { useAuth } from '@/components/auth-provider'
import {
  calculateTradesRemaining,
  loadMarketPlayers,
  loadMyPortfolioData,
  loadPlayerSeasonStats,
  loadPlayerValueHistory,
  refreshMyMarketPortfolio,
} from '@/lib/market/client'
import type { MarketHolding, MarketPlayer, MarketSeasonStats, MarketValueHistoryPoint } from '@/lib/market/types'

export default function PlayerMarketDetailPage() {
  const { user } = useAuth()
  const params = useParams<{ slug: string }>()
  const slug = decodeURIComponent(params.slug)

  const [players, setPlayers] = useState<MarketPlayer[]>([])
  const [stats, setStats] = useState<MarketSeasonStats[]>([])
  const [history, setHistory] = useState<MarketValueHistoryPoint[]>([])
  const [holdings, setHoldings] = useState<MarketHolding[]>([])
  const [watchlist, setWatchlist] = useState<number[]>([])
  const [buysRemaining, setBuysRemaining] = useState(3)
  const [salesRemaining, setSalesRemaining] = useState(3)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const player = useMemo(() => players.find((entry) => entry.slug === slug) ?? null, [players, slug])

  async function load() {
    setLoading(true)
    setError('')

    const { data: marketPlayers, error: playerError } = await loadMarketPlayers()
    if (playerError) {
      setError(playerError.message)
      setLoading(false)
      return
    }

    setPlayers(marketPlayers)
    const currentPlayer = marketPlayers.find((entry) => entry.slug === slug)
    if (!currentPlayer) {
      setLoading(false)
      return
    }

    const [statsResult, historyResult, portfolioResult] = await Promise.all([
      loadPlayerSeasonStats(currentPlayer.id),
      loadPlayerValueHistory(currentPlayer.id),
      user
        ? (async () => {
            await refreshMyMarketPortfolio()
            return loadMyPortfolioData()
          })()
        : loadMyPortfolioData(),
    ])

    if (statsResult.error) setError(statsResult.error.message)
    if (historyResult.error) setError(historyResult.error.message)
    if (portfolioResult.error) setError(portfolioResult.error.message)

    setStats(statsResult.data)
    setHistory(historyResult.data)
    setHoldings(portfolioResult.holdings)
    setWatchlist(portfolioResult.watchlist)

    const remaining = calculateTradesRemaining(portfolioResult.transactions)
    setBuysRemaining(remaining.buysRemaining)
    setSalesRemaining(remaining.salesRemaining)

    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [slug, user])

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-5"><MarketDisclaimer /></div>
        {error ? <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
        {loading ? <p className="text-sm text-muted-foreground">Loading player card…</p> : !player ? <p className="text-sm text-muted-foreground">Player not found.</p> : (
          <PlayerMarketDetail
            player={player}
            stats={stats}
            history={history}
            holdings={holdings}
            watchlist={watchlist}
            buysRemaining={buysRemaining}
            salesRemaining={salesRemaining}
            onRefresh={load}
          />
        )}
      </section>
    </main>
  )
}
