'use client'

import { useEffect, useRef, useState } from 'react'
import { SiteHeader } from '@/components/site-header'
import { PlayerMarketBrowser } from '@/components/market/player-market-browser'
import { MarketDisclaimer } from '@/components/market/market-disclaimer'
import { useAuth } from '@/components/auth-provider'
import { calculateTradesRemaining, loadMarketPlayers, loadMyGameweekStatus, loadMyPortfolioData } from '@/lib/market/client'
import type { MarketHolding, MarketPlayer } from '@/lib/market/types'

export default function PlayerMarketPlayersPage() {
  const { user } = useAuth()
  const [players, setPlayers] = useState<MarketPlayer[]>([])
  const [holdings, setHoldings] = useState<MarketHolding[]>([])
  const [watchlist, setWatchlist] = useState<number[]>([])
  const [buysRemaining, setBuysRemaining] = useState(11)
  const [availableCash, setAvailableCash] = useState(100_000_000)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const hasLoaded = useRef(false)
  const [error, setError] = useState('')

  async function load() {
    if (hasLoaded.current) setRefreshing(true)
    else setLoading(true)
    setError('')

    const { data: playerRows, error: playerError } = await loadMarketPlayers()
    if (playerError) setError(playerError.message)

    setPlayers(playerRows)

    const [portfolioData, gameweekStatus] = await Promise.all([loadMyPortfolioData(), loadMyGameweekStatus()])
    if (portfolioData.error) setError(portfolioData.error.message)
    setHoldings(portfolioData.holdings)
    setWatchlist(portfolioData.watchlist)
    setAvailableCash(portfolioData.portfolio?.available_balance ?? 100_000_000)
    const remaining = calculateTradesRemaining(portfolioData.transactions)
    setBuysRemaining(gameweekStatus.data?.signings_remaining ?? remaining.buysRemaining)

    hasLoaded.current = true
    setLoading(false)
    setRefreshing(false)
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
    <main className="market-theme min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,.10),transparent_34%),linear-gradient(180deg,#f7fbf9_0%,#eef6f2_48%,#f8faf9_100%)]">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-5"><MarketDisclaimer /></div>
        {error ? <p role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
        {loading ? <p role="status" aria-live="polite" className="text-sm text-muted-foreground">Loading market players…</p> : <><PlayerMarketBrowser players={players} holdings={holdings} watchlist={watchlist} statsByPlayerId={{}} userSignedIn={Boolean(user)} buysRemaining={buysRemaining} availableCash={availableCash} onTradeAction={load} />{refreshing ? <p role="status" aria-live="polite" className="fixed bottom-4 left-1/2 z-[70] -translate-x-1/2 rounded-full border border-emerald-900/15 bg-white/95 px-4 py-2 text-xs font-semibold text-emerald-900 shadow-lg">Updating squad…</p> : null}</>}
      </section>
    </main>
  )
}
