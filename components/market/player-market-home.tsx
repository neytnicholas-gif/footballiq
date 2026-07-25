'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowRight, BarChart3, Coins, Lock, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { MarketDisclaimer } from '@/components/market/market-disclaimer'
import { MarketPlayerChip } from '@/components/market/market-player-chip'
import {
  calculateTradesRemaining,
  loadMarketPlayers,
  loadMyPortfolioData,
  refreshMyMarketPortfolio,
} from '@/lib/market/client'
import {
  formatChange,
  formatFiqCompact,
  formatFiqLong,
  MARKET_DAILY_BUY_LIMIT,
  MARKET_DAILY_SELL_LIMIT,
  MARKET_MAX_PORTFOLIO_SIZE,
} from '@/lib/market/format'
import type { MarketHolding, MarketPlayer, MarketPortfolio } from '@/lib/market/types'

export function PlayerMarketHome() {
  const { user, profile } = useAuth()
  const [players, setPlayers] = useState<MarketPlayer[]>([])
  const [portfolio, setPortfolio] = useState<MarketPortfolio | null>(null)
  const [holdings, setHoldings] = useState<MarketHolding[]>([])
  const [tradesMessage, setTradesMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    const [{ data: playerRows, error: playerError }, portfolioData] = await Promise.all([
      loadMarketPlayers(),
      user ? (async () => {
        await refreshMyMarketPortfolio()
        return loadMyPortfolioData()
      })() : Promise.resolve({ error: null, portfolio: null, holdings: [], transactions: [], watchlist: [] as number[] }),
    ])

    if (playerError) {
      setError(playerError.message)
    }

    if (portfolioData.error) {
      setError(portfolioData.error.message)
    }

    setPlayers(playerRows)
    setPortfolio(portfolioData.portfolio)
    setHoldings(portfolioData.holdings)

    if (user) {
      const remaining = calculateTradesRemaining(portfolioData.transactions)
      setTradesMessage(`${remaining.buysRemaining}/${MARKET_DAILY_BUY_LIMIT} buys left · ${remaining.salesRemaining}/${MARKET_DAILY_SELL_LIMIT} sales left today`)
    }

    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [user])

  const movers = useMemo(() => {
    const sorted = [...players].sort((a, b) => (b.current_value - b.previous_value) - (a.current_value - a.previous_value))
    const risers = sorted.slice(0, 4)
    const fallers = [...players]
      .sort((a, b) => (a.current_value - a.previous_value) - (b.current_value - b.previous_value))
      .slice(0, 4)
    return { risers, fallers }
  }, [players])

  const holdingsMap = useMemo(() => {
    const map = new Map<number, MarketHolding>()
    for (const holding of holdings) map.set(holding.player_id, holding)
    return map
  }, [holdings])

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[.25em] text-primary">FootballIQ flagship</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">FootballIQ Player Market</h1>
            <p className="mt-3 text-muted-foreground">
              Build your eight-player portfolio. Read the market. Prove your football judgement.
            </p>
          </div>
          <Link href="/market/players" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
            Browse market
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard icon={<Wallet className="size-5" />} label="Total account value" value={portfolio ? formatFiqCompact(portfolio.total_account_value) : '100.0m FIQ'} sub={portfolio ? formatFiqLong(portfolio.total_account_value) : 'Create an account to track your market account'} />
          <SummaryCard icon={<Coins className="size-5" />} label="Available balance" value={portfolio ? formatFiqCompact(portfolio.available_balance) : '100.0m FIQ'} sub={portfolio ? `Starting balance ${formatFiqCompact(portfolio.starting_balance)}` : 'No cash purchases. No withdrawals.'} />
          <SummaryCard icon={<BarChart3 className="size-5" />} label="Portfolio value" value={portfolio ? formatFiqCompact(portfolio.portfolio_value) : '0.0m FIQ'} sub={portfolio ? `${holdings.length}/${MARKET_MAX_PORTFOLIO_SIZE} slots used` : 'Up to eight players'} />
          <SummaryCard icon={<TrendingUp className="size-5" />} label="Realised profit/loss" value={portfolio ? formatChange(portfolio.realized_profit_loss) : '0'} sub={user ? tradesMessage : 'Sign in to start trading'} />
        </div>

        <div className="mt-5">
          <MarketDisclaimer />
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!user ? (
        <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 size-5 text-primary" />
            <div>
              <h2 className="text-xl font-bold">Market browsing is open. Trading requires an account.</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Anonymous visitors can explore prices, movers and player details. Create an account to back, sell, track portfolio growth and appear on market leaderboards.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/signup" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Create free account</Link>
                <Link href="/market/players" className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">Explore players</Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {user && !loading && holdings.length === 0 ? (
        <section className="rounded-[2rem] border border-primary/25 bg-primary/10 p-6 sm:p-8">
          <h2 className="text-2xl font-black">Fast start: place your first Back in under 30 seconds</h2>
          <p className="mt-2 text-sm text-muted-foreground">No formation constraints. Pick any player card, review movement and lock status, then Back to start your portfolio.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/market/players" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Open player marketplace</Link>
            <Link href="/market/portfolio" className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">View empty portfolio</Link>
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Current holdings</h2>
            <Link href="/market/portfolio" className="text-sm font-semibold text-primary">Open portfolio</Link>
          </div>
          {loading ? <p className="text-sm text-muted-foreground">Loading holdings…</p> : holdings.length === 0 ? <p className="text-sm text-muted-foreground">No holdings yet. Build your first eight-player portfolio.</p> : (
            <div className="space-y-3">
              {holdings.map((holding) => {
                const player = players.find((candidate) => candidate.id === holding.player_id)
                if (!player) return null
                return (
                  <div key={holding.id} className="flex items-center justify-between rounded-2xl border border-border bg-background/60 p-3">
                    <div className="flex items-center gap-3">
                      <MarketPlayerChip player={player} />
                      <div>
                        <p className="font-semibold">{player.display_name}</p>
                        <p className="text-xs text-muted-foreground">{player.club_name} · {player.position}</p>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <p>{formatFiqCompact(holding.current_value_snapshot)}</p>
                      <p className={holding.unrealized_profit_loss >= 0 ? 'text-primary' : 'text-destructive'}>
                        {holding.unrealized_profit_loss >= 0 ? '+' : ''}{formatFiqCompact(holding.unrealized_profit_loss)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Market movers</h2>
            <Link href="/market/players?trend=risers" className="text-sm font-semibold text-primary">Filter movers</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[.2em] text-primary">Top risers</p>
              <div className="space-y-2">
                {movers.risers.map((player) => (
                  <MoverRow key={player.id} player={player} positive />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[.2em] text-destructive">Top fallers</p>
              <div className="space-y-2">
                {movers.fallers.map((player) => (
                  <MoverRow key={player.id} player={player} positive={false} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Popular and watchlisted</h2>
          <div className="flex items-center gap-4">
            <Link href="/market/leagues" className="text-sm font-semibold text-primary">Friends leagues beta</Link>
            <Link href="/market/leaderboard" className="text-sm font-semibold text-primary">Market leaderboard</Link>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {players.slice(0, 8).map((player) => {
            const owned = holdingsMap.has(player.id)
            return (
              <Link key={player.id} href={`/market/player/${encodeURIComponent(player.slug)}`} className="rounded-2xl border border-border bg-background/60 p-3 transition hover:border-primary/45">
                <div className="flex items-start justify-between gap-3">
                  <MarketPlayerChip player={player} />
                  <span className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{player.position}</span>
                </div>
                <p className="mt-3 font-semibold">{player.display_name}</p>
                <p className="text-xs text-muted-foreground">{player.club_name}</p>
                <p className="mt-2 text-sm text-primary">{formatFiqCompact(player.current_value)}</p>
                <p className="text-xs text-muted-foreground">{owned ? 'Owned in your portfolio' : 'Open player card'}</p>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="rounded-[2rem] border border-border bg-card p-6">
        <h2 className="text-xl font-bold">Supporting football modes</h2>
        <p className="mt-2 text-sm text-muted-foreground">Player Market is now the flagship experience. Scout Vision, Referee Arena, Football Duels and Daily Challenge continue to sharpen your judgement.</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/quizzes/would-you-scout-him" className="rounded-xl border border-border px-4 py-2">Scout Vision</Link>
          <Link href="/quizzes/referee-decisions" className="rounded-xl border border-border px-4 py-2">Referee Arena</Link>
          <Link href="/quizzes/football-duels" className="rounded-xl border border-border px-4 py-2">Football Duels</Link>
          <Link href="/daily" className="rounded-xl border border-border px-4 py-2">Daily Challenge</Link>
        </div>
      </section>
    </div>
  )
}

function SummaryCard({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4">
      <div className="flex items-center gap-2 text-primary">{icon}<span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span></div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}

function MoverRow({ player, positive }: { player: MarketPlayer; positive: boolean }) {
  const delta = player.current_value - player.previous_value
  const icon = positive ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />
  return (
    <Link href={`/market/player/${encodeURIComponent(player.slug)}`} className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-3 py-2 text-sm">
      <span className="truncate pr-3">{player.display_name}</span>
      <span className={`inline-flex items-center gap-1 ${delta >= 0 ? 'text-primary' : 'text-destructive'}`}>
        {icon}
        {delta >= 0 ? '+' : ''}{formatFiqCompact(Math.abs(delta))}
      </span>
    </Link>
  )
}
