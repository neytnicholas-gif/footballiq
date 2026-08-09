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
import { buildSampleSeasonStats } from '@/lib/market/sample-data'
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

    const isDemoPlayer = currentPlayer.provenance_status === 'owner_seed_demo'
    const [statsResult, historyResult, portfolioResult] = await Promise.all([
      isDemoPlayer
        ? Promise.resolve({ data: buildSampleSeasonStats(marketPlayers).filter((row) => row.player_id === currentPlayer.id), error: null })
        : loadPlayerSeasonStats(currentPlayer.id),
      isDemoPlayer
        ? Promise.resolve({ data: [] as MarketValueHistoryPoint[], error: null })
        : loadPlayerValueHistory(currentPlayer.id),
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
    const verifiedHistory = historyResult.data.length > 0 ? historyResult.data : buildPlayerHistory(currentPlayer)
    setHistory(verifiedHistory)
    setHoldings(portfolioResult.holdings)
    setWatchlist(portfolioResult.watchlist)
    setAvailableCash(portfolioResult.portfolio?.available_balance ?? 100_000_000)

    const remaining = calculateTradesRemaining(portfolioResult.transactions)
    setBuysRemaining(remaining.buysRemaining)
    setSalesRemaining(remaining.salesRemaining)

    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [slug, user])

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

function buildPlayerHistory(player: MarketPlayer): MarketValueHistoryPoint[] {
  const values = [player.opening_season_value]
  if (player.previous_value !== values.at(-1)) values.push(player.previous_value)
  if (player.current_value !== values.at(-1)) values.push(player.current_value)
  return values.map((value, index) => ({
    id: -(index + 1), player_id: player.id, value,
    recorded_at: index === values.length - 1 ? player.value_updated_at : player.created_at,
    reason_category: index === 0 ? 'season_opening' : 'verified_performance',
    methodology_version: 'fiq-real-performance-v2.0.0', created_at: player.created_at,
  }))
}
