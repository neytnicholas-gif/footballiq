'use client'

import { useEffect, useState } from 'react'
import { SiteHeader } from '@/components/site-header'
import { PlayerMarketPortfolio } from '@/components/market/player-market-portfolio'
import { useAuth } from '@/components/auth-provider'
import {
  calculateTradesRemaining,
  loadMatchweekRuns,
  loadMyRevealHistory,
  loadMyGameweekStatus,
  loadMarketPlayers,
  loadMyPortfolioData,
  refreshMyMarketPortfolio,
} from '@/lib/market/client'
import type { MarketHolding, MarketMatchweekRun, MarketPlayer, MarketPortfolio, MarketRevealSummary, MarketTransaction } from '@/lib/market/types'
import type { GuestMarketImportResult } from '@/lib/market/client'

export default function PlayerMarketPortfolioPage() {
  const { user } = useAuth()
  const [portfolio, setPortfolio] = useState<MarketPortfolio | null>(null)
  const [players, setPlayers] = useState<MarketPlayer[]>([])
  const [holdings, setHoldings] = useState<MarketHolding[]>([])
  const [transactions, setTransactions] = useState<MarketTransaction[]>([])
  const [watchlist, setWatchlist] = useState<number[]>([])
  const [runs, setRuns] = useState<MarketMatchweekRun[]>([])
  const [reveals, setReveals] = useState<MarketRevealSummary[]>([])
  const [buysRemaining, setBuysRemaining] = useState(11)
  const [salesRemaining, setSalesRemaining] = useState(11)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [importResult, setImportResult] = useState<GuestMarketImportResult | null>(null)

  useEffect(() => {
    function readImportResult() {
      try {
        const raw = window.sessionStorage.getItem('fiq-market-account-import-result-v1')
        if (!raw) return
        setImportResult(JSON.parse(raw) as GuestMarketImportResult)
        window.sessionStorage.removeItem('fiq-market-account-import-result-v1')
      } catch {
        setImportResult(null)
      }
    }

    function onImported(event: Event) {
      setImportResult((event as CustomEvent<GuestMarketImportResult>).detail)
    }

    readImportResult()
    window.addEventListener('fiq-market-account-imported', onImported)
    return () => window.removeEventListener('fiq-market-account-imported', onImported)
  }, [])

  useEffect(() => {
    let active = true

    void (async () => {
      setLoading(true)
      setError('')

      const [{ data: marketPlayers, error: playerError }, portfolioData, runsResult, revealsResult, gameweekStatus] = await Promise.all([
        loadMarketPlayers(),
        (async () => {
          if (user) await refreshMyMarketPortfolio()
          return loadMyPortfolioData()
        })(),
        loadMatchweekRuns(12),
        loadMyRevealHistory(12),
        loadMyGameweekStatus(),
      ])

      if (!active) return

      if (playerError) setError(playerError.message)
      if (portfolioData.error) setError(portfolioData.error.message)
      if (runsResult.error) setError(runsResult.error.message)
      if (revealsResult.error) setError(revealsResult.error.message)

      setPlayers(marketPlayers)
      setPortfolio(portfolioData.portfolio)
      setHoldings(portfolioData.holdings)
      setTransactions(portfolioData.transactions)
      setWatchlist(portfolioData.watchlist)
      setRuns(runsResult.data)
      setReveals(revealsResult.data)

      const remaining = calculateTradesRemaining(portfolioData.transactions)
      setBuysRemaining(gameweekStatus.data?.signings_remaining ?? remaining.buysRemaining)
      setSalesRemaining(gameweekStatus.data ? 11 : remaining.salesRemaining)

      setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [user])

  return (
    <main className="market-theme min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,.10),transparent_34%),linear-gradient(180deg,#f7fbf9_0%,#eef6f2_48%,#f8faf9_100%)]">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        {importResult?.imported ? (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-emerald-700/25 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 shadow-sm">
            <div>
              <p className="font-bold">Your guest portfolio is now saved to your account.</p>
              <p className="mt-1 text-xs text-emerald-900/75">Preserved {importResult.holdings ?? 0} player selections and {importResult.watchlist ?? 0} watchlist picks at current FootballIQ prices.</p>
            </div>
            <button type="button" onClick={() => setImportResult(null)} className="rounded-lg border border-emerald-800/15 px-2 py-1 text-xs font-semibold">Dismiss</button>
          </div>
        ) : null}
        {error ? <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
        {loading ? <p className="text-sm text-muted-foreground">Loading portfolio…</p> : (
          <PlayerMarketPortfolio
            portfolio={portfolio}
            players={players}
            holdings={holdings}
            transactions={transactions}
            watchlist={watchlist}
            userSignedIn={Boolean(user)}
            runs={runs}
            reveals={reveals}
            buysRemaining={buysRemaining}
            salesRemaining={salesRemaining}
          />
        )}
      </section>
    </main>
  )
}
