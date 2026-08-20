'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { PlayerMarketBrowser } from '@/components/market/player-market-browser'
import { MarketDisclaimer } from '@/components/market/market-disclaimer'
import { MarketNavigation } from '@/components/market/market-navigation'
import { useAuth } from '@/components/auth-provider'
import { calculateTradesRemaining, loadMarketPlayers, loadMyGameweekChip, loadMyGameweekStatus, loadMyPortfolioData } from '@/lib/market/client'
import type { MarketGameweekChipStatus, MarketHolding, MarketPlayer } from '@/lib/market/types'
import { friendlyMarketLoadError } from '@/lib/market/user-errors'

export default function PlayerMarketPlayersPage() {
  const { user } = useAuth()
  const [players, setPlayers] = useState<MarketPlayer[]>([])
  const [holdings, setHoldings] = useState<MarketHolding[]>([])
  const [watchlist, setWatchlist] = useState<number[]>([])
  const [buysRemaining, setBuysRemaining] = useState(11)
  const [availableCash, setAvailableCash] = useState(100_000_000)
  const [chipStatus, setChipStatus] = useState<MarketGameweekChipStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [playerSearch, setPlayerSearch] = useState('')
  const hasLoaded = useRef(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (hasLoaded.current) setRefreshing(true)
    else setLoading(true)
    setError('')

    const { data: playerRows, error: playerError } = await loadMarketPlayers()
    if (playerError) setError(friendlyMarketLoadError(playerError))

    setPlayers(playerRows)

    const [portfolioData, gameweekStatus, chipResult] = await Promise.all([
      loadMyPortfolioData(),
      loadMyGameweekStatus(),
      user ? loadMyGameweekChip() : Promise.resolve({ data: null, error: null }),
    ])
    if (portfolioData.error) setError(friendlyMarketLoadError(portfolioData.error))
    setHoldings(portfolioData.holdings)
    setWatchlist(portfolioData.watchlist)
    setAvailableCash(portfolioData.portfolio?.available_balance ?? 100_000_000)
    setChipStatus(chipResult.data)
    const remaining = calculateTradesRemaining(portfolioData.transactions)
    setBuysRemaining(gameweekStatus.data?.signings_remaining ?? remaining.buysRemaining)

    hasLoaded.current = true
    setLoading(false)
    setRefreshing(false)
  }, [user])

  useEffect(() => {
    let active = true

    void (async () => {
      await load()
      if (!active) return
    })()

    return () => {
      active = false
    }
  }, [load])

  return (
    <main className="market-theme market-shell min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <form
          role="search"
          aria-label="Search the player market"
          onSubmit={(event) => {
            event.preventDefault()
            document.getElementById('player-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
          className="mb-3 rounded-2xl border border-emerald-300/25 bg-[#071f28]/95 p-2 shadow-[0_18px_50px_-34px_rgba(16,185,129,.75)]"
        >
          <div className="flex min-h-14 items-center gap-2 rounded-xl border border-white/10 bg-white/[.07] px-3 transition focus-within:border-emerald-300/60 focus-within:ring-2 focus-within:ring-emerald-300/20">
            <Search className="size-5 shrink-0 text-emerald-300" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search players by name"
              value={playerSearch}
              onChange={(event) => setPlayerSearch(event.target.value)}
              placeholder="Search any player by name…"
              autoComplete="off"
              spellCheck={false}
              className="min-h-12 min-w-0 flex-1 bg-transparent px-1 text-base font-semibold text-white outline-none placeholder:text-slate-500 [&::-webkit-search-cancel-button]:appearance-none"
            />
            {playerSearch ? <button type="button" onClick={() => setPlayerSearch('')} aria-label="Clear player search" className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"><X className="size-4" aria-hidden="true" /></button> : null}
            <button type="submit" className="hidden min-h-10 shrink-0 rounded-lg bg-emerald-300 px-4 text-sm font-black text-emerald-950 transition hover:bg-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 sm:inline-flex sm:items-center">Find player</button>
          </div>
        </form>
        <MarketNavigation />
        <div className="mb-5"><MarketDisclaimer /></div>
        {error ? <p role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
        {loading ? <p role="status" aria-live="polite" className="text-sm text-muted-foreground">Loading market players…</p> : <><PlayerMarketBrowser players={players} holdings={holdings} watchlist={watchlist} statsByPlayerId={{}} userSignedIn={Boolean(user)} buysRemaining={buysRemaining} availableCash={availableCash} chipStatus={chipStatus} search={playerSearch} onSearchChange={setPlayerSearch} onTradeAction={load} />{refreshing ? <p role="status" aria-live="polite" className="fixed bottom-4 left-1/2 z-[70] -translate-x-1/2 rounded-full border border-emerald-200/15 bg-[#082f2a]/95 px-4 py-2 text-xs font-semibold text-emerald-100 shadow-lg">Updating squad…</p> : null}</>}
      </section>
    </main>
  )
}
