'use client'

import { useEffect, useState } from 'react'
import { SiteHeader } from '@/components/site-header'
import { PlayerMarketPortfolio } from '@/components/market/player-market-portfolio'
import { MarketNavigation } from '@/components/market/market-navigation'
import { useAuth } from '@/components/auth-provider'
import {
  calculateTradesRemaining,
  loadMatchweekRuns,
  loadMyRevealHistory,
  loadMyGameweekStatus,
  loadMarketPlayers,
  loadMyPortfolioData,
} from '@/lib/market/client'
import type { MarketHolding, MarketMatchweekRun, MarketPlayer, MarketPortfolio, MarketRevealSummary, MarketTransaction } from '@/lib/market/types'
import type { GuestMarketImportResult } from '@/lib/market/client'
import { friendlyMarketLoadError } from '@/lib/market/user-errors'

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

      const historyPromise = Promise.all([
        loadMatchweekRuns(12),
        loadMyRevealHistory(12),
      ])
      const [{ data: marketPlayers, error: playerError }, portfolioData, gameweekStatus] = await Promise.all([
        loadMarketPlayers(),
        loadMyPortfolioData(),
        loadMyGameweekStatus(),
      ])

      if (!active) return

      if (playerError) setError(friendlyMarketLoadError(playerError))
      if (portfolioData.error) setError(friendlyMarketLoadError(portfolioData.error))
      setPlayers(marketPlayers)
      setPortfolio(portfolioData.portfolio)
      setHoldings(portfolioData.holdings)
      setTransactions(portfolioData.transactions)
      setWatchlist(portfolioData.watchlist)
      const remaining = calculateTradesRemaining(portfolioData.transactions)
      setBuysRemaining(gameweekStatus.data?.signings_remaining ?? remaining.buysRemaining)

      setLoading(false)

      const [runsResult, revealsResult] = await historyPromise
      if (!active) return
      if (runsResult.error) setError(friendlyMarketLoadError(runsResult.error))
      if (revealsResult.error) setError(friendlyMarketLoadError(revealsResult.error))
      setRuns(runsResult.data)
      setReveals(revealsResult.data)
    })()

    return () => {
      active = false
    }
  }, [user])

  return (
    <main className="market-theme market-shell min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <MarketNavigation />
        {importResult?.imported ? (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-emerald-300/20 bg-[#0b463e] px-4 py-3 text-sm text-emerald-50 shadow-sm">
            <div>
              <p className="font-bold">Your guest portfolio is now saved to your account.</p>
              <p className="mt-1 text-xs text-emerald-50/65">Preserved {importResult.holdings ?? 0} player selections and {importResult.watchlist ?? 0} watchlist picks at current Early Shout prices.</p>
            </div>
            <button type="button" onClick={() => setImportResult(null)} className="rounded-lg border border-emerald-800/15 px-2 py-1 text-xs font-semibold">Dismiss</button>
          </div>
        ) : null}
        {error ? <p role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
        {loading ? (
          <div role="status" aria-live="polite" className="rounded-[2rem] border border-emerald-200/10 bg-[#082f2a] p-6 text-emerald-50 shadow-sm sm:p-8">
            <p className="font-black text-white">Opening your roster…</p>
            <p className="mt-1 text-sm text-emerald-50/60">Loading your players and budget.</p>
            <div aria-hidden="true" className="mt-5 grid animate-pulse gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => <span key={index} className="h-20 rounded-2xl bg-emerald-950/10" />)}
            </div>
          </div>
        ) : (
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
          />
        )}
      </section>
    </main>
  )
}
