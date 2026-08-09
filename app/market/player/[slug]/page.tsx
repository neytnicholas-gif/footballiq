'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { PlayerMarketDetail } from '@/components/market/player-market-detail'
import { MarketDisclaimer } from '@/components/market/market-disclaimer'
import { useAuth } from '@/components/auth-provider'
import {
  calculateTradesRemaining,
  loadMarketPlayers,
  loadMyGameweekStatus,
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
  const [availableCash, setAvailableCash] = useState(100_000_000)
  const [buysRemaining, setBuysRemaining] = useState(11)
  const [salesRemaining, setSalesRemaining] = useState(11)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const player = useMemo(() => players.find((entry) => entry.slug === slug) ?? null, [players, slug])

  const load = useCallback(async () => {
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

    const [statsResult, historyResult, portfolioResult, gameweekStatus] = await Promise.all([
      loadPlayerSeasonStats(currentPlayer.id),
      loadPlayerValueHistory(currentPlayer.id),
      user
        ? (async () => {
            await refreshMyMarketPortfolio()
            return loadMyPortfolioData()
          })()
        : loadMyPortfolioData(),
      loadMyGameweekStatus(),
    ])

    if (statsResult.error) setError(statsResult.error.message)
    if (historyResult.error) setError(historyResult.error.message)
    if (portfolioResult.error) setError(portfolioResult.error.message)

    setStats(statsResult.data)
    setHistory(historyResult.data)
    setHoldings(portfolioResult.holdings)
    setWatchlist(portfolioResult.watchlist)
    setAvailableCash(portfolioResult.portfolio?.available_balance ?? 100_000_000)

    const remaining = calculateTradesRemaining(portfolioResult.transactions)
    setBuysRemaining(gameweekStatus.data?.signings_remaining ?? remaining.buysRemaining)
    setSalesRemaining(gameweekStatus.data ? 11 : remaining.salesRemaining)

    setLoading(false)
  }, [slug, user])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  return (
    <main className="market-theme min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,.10),transparent_34%),linear-gradient(180deg,#f7fbf9_0%,#eef6f2_48%,#f8faf9_100%)]">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-5"><MarketDisclaimer /></div>
        {error ? <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
        {loading ? <p className="text-sm text-muted-foreground">Loading player card…</p> : !player ? <p className="text-sm text-muted-foreground">Player not found.</p> : (
          <PlayerMarketDetail
            players={players}
            player={player}
            stats={stats}
            history={history}
            holdings={holdings}
            watchlist={watchlist}
            availableCash={availableCash}
            buysRemaining={buysRemaining}
            salesRemaining={salesRemaining}
            onRefresh={load}
          />
        )}
      </section>
    </main>
  )
}
