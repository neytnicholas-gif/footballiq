'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { SiteHeader } from '@/components/site-header'
import { PlayerMarketDetail } from '@/components/market/player-market-detail'
import { MarketDisclaimer } from '@/components/market/market-disclaimer'
import {
  calculateTradesRemaining,
  loadMarketPlayers,
  loadMyGameweekChip,
  loadMyGameweekStatus,
  loadMyPortfolioData,
  loadPlayerDetailData,
} from '@/lib/market/client'
import type { MarketGameweekChipStatus, MarketHolding, MarketOpeningPriceExplanation, MarketPlayer, MarketSeasonStats, MarketValueHistoryPoint } from '@/lib/market/types'
import { friendlyMarketLoadError } from '@/lib/market/user-errors'

export default function PlayerMarketDetailPage() {
  const { user } = useAuth()
  const params = useParams<{ slug: string }>()
  const slug = decodeURIComponent(params.slug)

  const [players, setPlayers] = useState<MarketPlayer[]>([])
  const [stats, setStats] = useState<MarketSeasonStats[]>([])
  const [openingExplanation, setOpeningExplanation] = useState<MarketOpeningPriceExplanation | null>(null)
  const [history, setHistory] = useState<MarketValueHistoryPoint[]>([])
  const [holdings, setHoldings] = useState<MarketHolding[]>([])
  const [watchlist, setWatchlist] = useState<number[]>([])
  const [availableCash, setAvailableCash] = useState(100_000_000)
  const [buysRemaining, setBuysRemaining] = useState(11)
  const [chipStatus, setChipStatus] = useState<MarketGameweekChipStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const player = useMemo(() => players.find((entry) => entry.slug === slug) ?? null, [players, slug])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    const { data: marketPlayers, error: playerError } = await loadMarketPlayers()
    if (playerError) {
      setError(friendlyMarketLoadError(playerError))
      setLoading(false)
      return
    }

    setPlayers(marketPlayers)
    const currentPlayer = marketPlayers.find((entry) => entry.slug === slug)
    if (!currentPlayer) {
      setLoading(false)
      return
    }

    const [detailResult, portfolioResult, gameweekStatus, chipResult] = await Promise.all([
      loadPlayerDetailData(currentPlayer.id),
      loadMyPortfolioData(),
      loadMyGameweekStatus(),
      user ? loadMyGameweekChip() : Promise.resolve({ data: null, error: null }),
    ])

    if (detailResult.error) setError(friendlyMarketLoadError(detailResult.error))
    if (portfolioResult.error) setError(friendlyMarketLoadError(portfolioResult.error))

    setStats(detailResult.data.stats)
    setOpeningExplanation(detailResult.data.openingExplanation)
    setHistory(detailResult.data.history)
    setHoldings(portfolioResult.holdings)
    setWatchlist(portfolioResult.watchlist)
    setAvailableCash(portfolioResult.portfolio?.available_balance ?? 100_000_000)
    setChipStatus(chipResult.data)

    const remaining = calculateTradesRemaining(portfolioResult.transactions)
    setBuysRemaining(gameweekStatus.data?.signings_remaining ?? remaining.buysRemaining)

    setLoading(false)
  }, [slug, user])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  return (
    <main className="market-theme market-shell min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-5"><MarketDisclaimer /></div>
        {error ? <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
        {loading ? <p className="text-sm text-muted-foreground">Loading player card…</p> : !player ? <p className="text-sm text-muted-foreground">Player not found.</p> : (
          <PlayerMarketDetail
            players={players}
            player={player}
            stats={stats}
            openingExplanation={openingExplanation}
            history={history}
            holdings={holdings}
            watchlist={watchlist}
            availableCash={availableCash}
            buysRemaining={buysRemaining}
            chipStatus={chipStatus}
            onRefresh={load}
          />
        )}
      </section>
    </main>
  )
}
