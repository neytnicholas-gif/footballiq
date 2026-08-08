'use client'

import { useEffect, useState } from 'react'
import { SiteHeader } from '@/components/site-header'
import { PlayerMarketBrowser } from '@/components/market/player-market-browser'
import { MarketDisclaimer } from '@/components/market/market-disclaimer'
import { useAuth } from '@/components/auth-provider'
import { calculateTradesRemaining, loadMarketPlayers, loadMarketSeasonStats, loadMyPortfolioData, refreshMyMarketPortfolio } from '@/lib/market/client'
import type { MarketHolding, MarketPlayer, MarketSeasonStats } from '@/lib/market/types'

export default function PlayerMarketPlayersPage() {
  const { user } = useAuth()
  const [players, setPlayers] = useState<MarketPlayer[]>([])
  const [holdings, setHoldings] = useState<MarketHolding[]>([])
  const [watchlist, setWatchlist] = useState<number[]>([])
  const [statsByPlayerId, setStatsByPlayerId] = useState<Record<number, MarketSeasonStats | undefined>>({})
  const [buysRemaining, setBuysRemaining] = useState(3)
  const [salesRemaining, setSalesRemaining] = useState(3)
  const [availableCash, setAvailableCash] = useState(100_000_000)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    const [{ data: playerRows, error: playerError }, { data: allStats, error: allStatsError }] = await Promise.all([
      loadMarketPlayers(),
      loadMarketSeasonStats(),
    ])
    if (playerError) setError(playerError.message)
    if (allStatsError) setError(allStatsError.message)

    const latestStatsMap: Record<number, MarketSeasonStats | undefined> = {}
    for (const row of allStats) {
      if (!latestStatsMap[row.player_id]) latestStatsMap[row.player_id] = row
    }

    setPlayers(playerRows)
    setStatsByPlayerId(latestStatsMap)

    if (user) {
      await refreshMyMarketPortfolio()
    }

    const portfolioData = await loadMyPortfolioData()
    if (portfolioData.error) setError(portfolioData.error.message)
    setHoldings(portfolioData.holdings)
    setWatchlist(portfolioData.watchlist)
    setAvailableCash(portfolioData.portfolio?.available_balance ?? 100_000_000)
    const remaining = calculateTradesRemaining(portfolioData.transactions)
    setBuysRemaining(remaining.buysRemaining)
    setSalesRemaining(remaining.salesRemaining)

    setLoading(false)
  }

  useEffect(() => {
    let active = true

    void (async () => {
      await load()
      if (!active) return
    })()

    return () => {
      active = false
    }
  }, [user])

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,.10),transparent_34%),linear-gradient(180deg,#f7fbf9_0%,#eef6f2_48%,#f8faf9_100%)]">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-5"><MarketDisclaimer /></div>
        {error ? <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
        {loading ? <p className="text-sm text-muted-foreground">Loading market players…</p> : <PlayerMarketBrowser players={players} holdings={holdings} watchlist={watchlist} statsByPlayerId={statsByPlayerId} userSignedIn={Boolean(user)} buysRemaining={buysRemaining} salesRemaining={salesRemaining} availableCash={availableCash} onTradeAction={load} />}
      </section>
    </main>
  )
}
