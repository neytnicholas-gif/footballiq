'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowRight, BarChart3, Coins, Lock, PlayCircle, Trophy, TrendingDown, TrendingUp, Users, Wallet } from 'lucide-react'
import { countFormation } from '@/lib/market/formation'
import { useAuth } from '@/components/auth-provider'
import { MarketDisclaimer } from '@/components/market/market-disclaimer'
import { MarketPlayerChip } from '@/components/market/market-player-chip'
import {
  applySimulatedMatchweek,
  calculateTradesRemaining,
  loadLatestMatchweekRun,
  loadMarketPlayers,
  loadMarketSeasonStats,
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
import { MARKET_SIMULATION_METHOD_VERSION, seedMatchweekProvider } from '@/lib/market/simulation'
import type { MarketHolding, MarketMatchweekApplyResult, MarketMatchweekRun, MarketPlayer, MarketPortfolio, MarketSeasonStats } from '@/lib/market/types'

export function PlayerMarketHome() {
  const { user } = useAuth()
  const [players, setPlayers] = useState<MarketPlayer[]>([])
  const [portfolio, setPortfolio] = useState<MarketPortfolio | null>(null)
  const [holdings, setHoldings] = useState<MarketHolding[]>([])
  const [latestStatsByPlayerId, setLatestStatsByPlayerId] = useState<Map<number, MarketSeasonStats | undefined>>(new Map())
  const [lastRun, setLastRun] = useState<MarketMatchweekRun | null>(null)
  const [latestResult, setLatestResult] = useState<MarketMatchweekApplyResult | null>(null)
  const [tradesMessage, setTradesMessage] = useState('')
  const [simulating, setSimulating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    const [{ data: playerRows, error: playerError }, { data: seasonStatsRows, error: seasonStatsError }, portfolioData, latestRunData] = await Promise.all([
      loadMarketPlayers(),
      loadMarketSeasonStats(),
      user ? (async () => {
        await refreshMyMarketPortfolio()
        return loadMyPortfolioData()
      })() : Promise.resolve({ error: null, portfolio: null, holdings: [], transactions: [], watchlist: [] as number[] }),
      user ? loadLatestMatchweekRun() : Promise.resolve({ data: null, error: null }),
    ])

    if (playerError) {
      setError(playerError.message)
    }

    if (portfolioData.error) {
      setError(portfolioData.error.message)
    }

    if (seasonStatsError) {
      setError(seasonStatsError.message)
    }

    if (latestRunData.error) {
      setError(latestRunData.error.message)
    }

    setPlayers(playerRows)
    setPortfolio(portfolioData.portfolio)
    setHoldings(portfolioData.holdings)
    setLastRun(latestRunData.data)

    const statsMap = new Map<number, MarketSeasonStats | undefined>()
    for (const row of seasonStatsRows) {
      if (!statsMap.has(row.player_id)) statsMap.set(row.player_id, row)
    }
    setLatestStatsByPlayerId(statsMap)

    if (user) {
      const remaining = calculateTradesRemaining(portfolioData.transactions)
      setTradesMessage(`${remaining.buysRemaining}/${MARKET_DAILY_BUY_LIMIT} buys left · ${remaining.salesRemaining}/${MARKET_DAILY_SELL_LIMIT} sales left today`)
    }

    setLoading(false)
  }

  async function handleSimulateMatchweek() {
    if (!user) {
      setError('Sign in to run the matchweek simulator.')
      return
    }

    const hasValidFormation = formation.GK === 1 && formation.DEF === 4 && formation.MID === 3 && formation.FWD === 3
    if (!hasValidFormation) {
      setError('Complete a valid 1-4-3-3 squad before simulating a matchweek.')
      return
    }

    setSimulating(true)
    setError('')

    const nextWeek = (lastRun?.week_number ?? 0) + 1
    const weekLabel = `Matchweek ${nextWeek}`
    const payload = seedMatchweekProvider.simulateMatchweek({
      players,
      latestStatsByPlayerId,
      weekSeed: `${weekLabel}-${MARKET_SIMULATION_METHOD_VERSION}`,
    })

    const { data, error: simulateError } = await applySimulatedMatchweek(weekLabel, payload)
    if (simulateError || !data) {
      setError(simulateError?.message ?? 'Matchweek simulation failed')
      setSimulating(false)
      return
    }

    setLatestResult(data)
    await load()
    setSimulating(false)
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

  const playersById = useMemo(() => new Map(players.map((entry) => [entry.id, entry])), [players])
  const formation = useMemo(() => countFormation(holdings, playersById), [holdings, playersById])
  const isValidSquad = formation.GK === 1 && formation.DEF === 4 && formation.MID === 3 && formation.FWD === 3

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[.25em] text-primary">FootballIQ flagship</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">FootballIQ Player Market</h1>
            <p className="mt-3 text-muted-foreground">
              Build a complete 11-player 1-4-3-3 squad. Read movement. Time entries and exits. Prove your football judgement.
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
          <SummaryCard icon={<BarChart3 className="size-5" />} label="Portfolio value" value={portfolio ? formatFiqCompact(portfolio.portfolio_value) : '0.0m FIQ'} sub={portfolio ? `${holdings.length}/${MARKET_MAX_PORTFOLIO_SIZE} slots used` : '11-player squad target'} />
          <SummaryCard icon={<TrendingUp className="size-5" />} label="Realised profit/loss" value={portfolio ? formatChange(portfolio.realized_profit_loss) : '0'} sub={user ? tradesMessage : 'Sign in to start trading'} />
        </div>

        {user ? (
          <div className="mt-3 rounded-xl border border-border bg-background/60 px-4 py-3 text-xs text-muted-foreground">
            Formation status: GK {formation.GK}/1 · DEF {formation.DEF}/4 · MID {formation.MID}/3 · FWD {formation.FWD}/3
          </div>
        ) : null}

        <div className="mt-5">
          <MarketDisclaimer />
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {user ? (
        <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">First playable loop</p>
              <h2 className="mt-1 text-2xl font-black">Matchweek simulator</h2>
              <p className="mt-2 text-sm text-muted-foreground">Generate realistic sample performances, revalue the market, and roll straight into your next buy/sell cycle.</p>
            </div>
            <button
              onClick={() => void handleSimulateMatchweek()}
              disabled={simulating || loading || !isValidSquad}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-45"
            >
              <PlayCircle className="size-4" />
              {simulating ? 'Simulating…' : 'Simulate Matchweek'}
            </button>
          </div>
          {!isValidSquad ? <p className="mt-3 text-xs text-amber-200">Build a complete 1-4-3-3 squad to unlock simulation.</p> : null}

          {latestResult ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <SummaryCard icon={<TrendingUp className="size-5" />} label="Biggest winner" value={latestResult.biggest_winner.player_name ?? 'N/A'} sub={`${latestResult.biggest_winner.delta >= 0 ? '+' : ''}${formatFiqCompact(Math.abs(latestResult.biggest_winner.delta))}`} />
              <SummaryCard icon={<TrendingDown className="size-5" />} label="Biggest loser" value={latestResult.biggest_loser.player_name ?? 'N/A'} sub={`-${formatFiqCompact(Math.abs(latestResult.biggest_loser.delta))}`} />
              <SummaryCard icon={<BarChart3 className="size-5" />} label="Weekly gain/loss" value={`${latestResult.weekly_portfolio_gain >= 0 ? '+' : ''}${formatFiqCompact(Math.abs(latestResult.weekly_portfolio_gain))}`} sub={latestResult.week_label} />
              <SummaryCard icon={<Trophy className="size-5" />} label="Current ROI" value={`${latestResult.current_roi_pct >= 0 ? '+' : ''}${latestResult.current_roi_pct.toFixed(2)}%`} sub="Since starting balance" />
              <SummaryCard icon={<Coins className="size-5" />} label="Total profit since start" value={`${latestResult.total_profit_since_start >= 0 ? '+' : ''}${formatFiqCompact(Math.abs(latestResult.total_profit_since_start))}`} sub={`${formatFiqCompact(latestResult.portfolio_after)} total`} />
            </div>
          ) : lastRun ? (
            <div className="mt-4 rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
              Latest run: {lastRun.week_label} · Weekly {lastRun.weekly_portfolio_gain >= 0 ? '+' : ''}{formatFiqCompact(Math.abs(lastRun.weekly_portfolio_gain))} · ROI {lastRun.current_roi_pct.toFixed(2)}%
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">No matchweek simulated yet. Build your squad and run your first week.</div>
          )}
        </section>
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
          <p className="mt-2 text-sm text-muted-foreground">Formation is strict: 1 GK, 4 DEF, 3 MID, 3 FWD. Start with your GK and core defenders, then build midfield and attack.</p>
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
          {loading ? <p className="text-sm text-muted-foreground">Loading holdings…</p> : holdings.length === 0 ? <p className="text-sm text-muted-foreground">No holdings yet. Build your first 11-player squad.</p> : (
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
          <h2 className="text-xl font-bold">Social pulse</h2>
          <Link href="/market/leaderboard" className="text-sm font-semibold text-primary">See leaderboard</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SocialStub icon={<Trophy className="size-4" />} title="Top Traders" value="Coming live in Phase 2" hint="Highest average return over last 14 days" />
          <SocialStub icon={<Wallet className="size-4" />} title="Highest Portfolio" value="Coming live in Phase 2" hint="Largest total account value this week" />
          <SocialStub icon={<TrendingUp className="size-4" />} title="Biggest Weekly Gain" value="Coming live in Phase 2" hint="Strongest week-on-week performance" />
          <SocialStub icon={<Coins className="size-4" />} title="Most Profitable Trade" value="Coming live in Phase 2" hint="Single highest realized sell profit" />
          <SocialStub icon={<Users className="size-4" />} title="Friends" value="Coming live in Phase 2" hint="Invite friends and build private leagues" />
          <SocialStub icon={<BarChart3 className="size-4" />} title="Market Leaderboard" value="Live now" hint="Track daily, weekly and season performance" />
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

function SocialStub({ icon, title, value, hint }: { icon: ReactNode; title: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-3">
      <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[.16em] text-muted-foreground">{icon}{title}</p>
      <p className="mt-2 text-sm font-semibold text-primary">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}
