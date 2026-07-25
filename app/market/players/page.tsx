'use client'

import { useEffect, useState } from 'react'
import { SiteHeader } from '@/components/site-header'
import { PlayerMarketBrowser } from '@/components/market/player-market-browser'
import { MarketDisclaimer } from '@/components/market/market-disclaimer'
import { useAuth } from '@/components/auth-provider'
import { loadMarketPlayers, loadMyPortfolioData } from '@/lib/market/client'
import type { MarketHolding, MarketPlayer } from '@/lib/market/types'

export default function PlayerMarketPlayersPage() {
  const { user } = useAuth()
  const [players, setPlayers] = useState<MarketPlayer[]>([])
  const [holdings, setHoldings] = useState<MarketHolding[]>([])
  const [watchlist, setWatchlist] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    void (async () => {
      setLoading(true)
      setError('')

      const { data: playerRows, error: playerError } = await loadMarketPlayers()
      if (!active) return
      if (playerError) setError(playerError.message)
      setPlayers(playerRows)

      if (user) {
        const portfolioData = await loadMyPortfolioData()
        if (!active) return
        if (portfolioData.error) setError(portfolioData.error.message)
        setHoldings(portfolioData.holdings)
        setWatchlist(portfolioData.watchlist)
      } else {
        setHoldings([])
        setWatchlist([])
      }

      setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [user])

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-5"><MarketDisclaimer /></div>
        {error ? <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
        {loading ? <p className="text-sm text-muted-foreground">Loading market players…</p> : <PlayerMarketBrowser players={players} holdings={holdings} watchlist={watchlist} />}
      </section>
    </main>
  )
}
