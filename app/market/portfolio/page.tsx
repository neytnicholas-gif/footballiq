'use client'

import { useEffect, useState } from 'react'
import { SiteHeader } from '@/components/site-header'
import { PlayerMarketPortfolio } from '@/components/market/player-market-portfolio'
import { useAuth } from '@/components/auth-provider'
import {
  calculateTradesRemaining,
  loadMarketPlayers,
  loadMyPortfolioData,
  refreshMyMarketPortfolio,
} from '@/lib/market/client'
import type { MarketHolding, MarketPlayer, MarketPortfolio, MarketTransaction } from '@/lib/market/types'

export default function PlayerMarketPortfolioPage() {
  const { user } = useAuth()
  const [portfolio, setPortfolio] = useState<MarketPortfolio | null>(null)
  const [players, setPlayers] = useState<MarketPlayer[]>([])
  const [holdings, setHoldings] = useState<MarketHolding[]>([])
  const [transactions, setTransactions] = useState<MarketTransaction[]>([])
  const [buysRemaining, setBuysRemaining] = useState(3)
  const [salesRemaining, setSalesRemaining] = useState(3)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    void (async () => {
      setLoading(true)
      setError('')

      const [{ data: marketPlayers, error: playerError }, portfolioData] = await Promise.all([
        loadMarketPlayers(),
        user
          ? (async () => {
              await refreshMyMarketPortfolio()
              return loadMyPortfolioData()
            })()
          : Promise.resolve({ error: null, portfolio: null, holdings: [], transactions: [], watchlist: [] as number[] }),
      ])

      if (!active) return

      if (playerError) setError(playerError.message)
      if (portfolioData.error) setError(portfolioData.error.message)

      setPlayers(marketPlayers)
      setPortfolio(portfolioData.portfolio)
      setHoldings(portfolioData.holdings)
      setTransactions(portfolioData.transactions)

      const remaining = calculateTradesRemaining(portfolioData.transactions)
      setBuysRemaining(remaining.buysRemaining)
      setSalesRemaining(remaining.salesRemaining)

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
        {error ? <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
        {loading ? <p className="text-sm text-muted-foreground">Loading portfolio…</p> : (
          <PlayerMarketPortfolio
            portfolio={portfolio}
            players={players}
            holdings={holdings}
            transactions={transactions}
            buysRemaining={buysRemaining}
            salesRemaining={salesRemaining}
          />
        )}
      </section>
    </main>
  )
}
