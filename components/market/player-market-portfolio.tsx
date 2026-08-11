'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { ArrowUpRight, Award, Wallet } from 'lucide-react'
import { MarketPlayerChip } from '@/components/market/market-player-chip'
import { useMarketFormation } from '@/components/market/use-market-formation'
import { countFormation } from '@/lib/market/formation'
import { formatFiqCompact, formatMarketDateTime, MARKET_MAX_PORTFOLIO_SIZE } from '@/lib/market/format'
import type { MarketHolding, MarketMatchweekRun, MarketPlayer, MarketPortfolio, MarketRevealSummary, MarketTransaction } from '@/lib/market/types'

export function PlayerMarketPortfolio({
  portfolio,
  players,
  holdings,
  transactions,
  watchlist,
  userSignedIn,
  runs,
  reveals,
  buysRemaining,
}: {
  portfolio: MarketPortfolio | null
  players: MarketPlayer[]
  holdings: MarketHolding[]
  transactions: MarketTransaction[]
  watchlist: number[]
  userSignedIn: boolean
  runs: MarketMatchweekRun[]
  reveals: MarketRevealSummary[]
  buysRemaining: number
}) {
  const activeFormation = useMarketFormation()
  const limits = activeFormation === '3-4-3' ? { GK: 1, DEF: 3, MID: 4, FWD: 3 } : { GK: 1, DEF: 4, MID: 3, FWD: 3 }
  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players])
  const formation = useMemo(() => countFormation(holdings, playersById), [holdings, playersById])
  const watchedPlayers = useMemo(() => watchlist.map((playerId) => playersById.get(playerId)).filter((player): player is MarketPlayer => Boolean(player)), [watchlist, playersById])
  const bestHolding = useMemo(
    () => holdings.reduce<MarketHolding | null>((best, row) => (!best || row.unrealized_profit_loss > best.unrealized_profit_loss ? row : best), null),
    [holdings],
  )
  const worstHolding = useMemo(
    () => holdings.reduce<MarketHolding | null>((worst, row) => (!worst || row.unrealized_profit_loss < worst.unrealized_profit_loss ? row : worst), null),
    [holdings],
  )
  const todayMovement = useMemo(() => holdings.reduce((sum, row) => sum + (row.current_value_snapshot - row.acquisition_value), 0), [holdings])
  const totalSpent = useMemo(() => holdings.reduce((sum, row) => sum + row.acquisition_value, 0), [holdings])
  const seasonMovement = useMemo(() => {
    let movement = 0
    for (const holding of holdings) {
      const player = playersById.get(holding.player_id)
      if (!player) continue
      movement += player.current_value - player.opening_season_value
    }
    return movement
  }, [holdings, playersById])
  const totalProfitLoss = useMemo(() => (portfolio ? portfolio.total_account_value - portfolio.starting_balance : 0), [portfolio])
  const totalRoi = useMemo(() => {
    if (!portfolio || portfolio.starting_balance <= 0) return 0
    return ((portfolio.total_account_value - portfolio.starting_balance) / portfolio.starting_balance) * 100
  }, [portfolio])
  const movementLabel = (value: number) => value === 0 ? 'No movement' : `${value > 0 ? '+' : '-'}${formatFiqCompact(Math.abs(value))}`

  if (!portfolio) {
    return (
      <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
        <h1 className="text-3xl font-black">Portfolio</h1>
        <p className="mt-3 text-sm text-muted-foreground">Create an account to unlock portfolio management and market history.</p>
        <Link href="/signup" className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Create account</Link>
      </section>
    )
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">Your full roster</h1>
            <p className="mt-2 text-sm text-muted-foreground">Your {activeFormation} plan: {limits.GK} GK, {limits.DEF} DEF, {limits.MID} MID, {limits.FWD} FWD.</p>
          </div>
          <Link href="/market/players#live-roster" className="rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Back to market</Link>
          <Link href="/market/rewards" className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary"><Award className="size-4"/>Challenges & rewards</Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Total account value" value={formatFiqCompact(portfolio.total_account_value)} />
          <Metric label="Budget remaining" value={formatFiqCompact(portfolio.available_balance)} />
          <Metric label="Total spent" value={formatFiqCompact(totalSpent)} />
          <Metric label="Current squad value" value={formatFiqCompact(portfolio.portfolio_value)} />
          <Metric label="Realised game gain/loss" value={movementLabel(portfolio.realized_profit_loss)} tone={portfolio.realized_profit_loss > 0 ? 'positive' : portfolio.realized_profit_loss < 0 ? 'negative' : 'default'} />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Today movement" value={movementLabel(todayMovement)} tone={todayMovement > 0 ? 'positive' : todayMovement < 0 ? 'negative' : 'default'} />
          <Metric label="Season movement" value={movementLabel(seasonMovement)} tone={seasonMovement > 0 ? 'positive' : seasonMovement < 0 ? 'negative' : 'default'} />
          <Metric
            label="Best performer"
            value={bestHolding ? movementLabel(bestHolding.unrealized_profit_loss) : 'N/A'}
            tone={bestHolding && bestHolding.unrealized_profit_loss > 0 ? 'positive' : 'default'}
          />
          <Metric
            label="Weakest performer"
            value={worstHolding ? movementLabel(worstHolding.unrealized_profit_loss) : 'N/A'}
            tone={worstHolding && worstHolding.unrealized_profit_loss < 0 ? 'negative' : 'default'}
          />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Metric label="Total game gain/loss" value={movementLabel(totalProfitLoss)} tone={totalProfitLoss > 0 ? 'positive' : totalProfitLoss < 0 ? 'negative' : 'default'} />
          <Metric label="Overall game return" value={totalRoi === 0 ? 'No movement' : `${totalRoi > 0 ? '+' : ''}${totalRoi.toFixed(2)}%`} tone={totalRoi > 0 ? 'positive' : totalRoi < 0 ? 'negative' : 'default'} />
          <Metric label="Legacy update records" value={String(runs.length)} />
        </div>

        <div className="mt-4 rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
          Gameweek allowance: {buysRemaining} of 11 signings remaining · sales free squad slots
          <span className="ml-2">· {activeFormation}: GK {formation.GK}/{limits.GK}, DEF {formation.DEF}/{limits.DEF}, MID {formation.MID}/{limits.MID}, FWD {formation.FWD}/{limits.FWD}</span>
        </div>
      </section>

      <section className="rounded-[2rem] border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Current holdings ({holdings.length}/{MARKET_MAX_PORTFOLIO_SIZE})</h2>
          <Link href="/market/players" className="text-sm font-semibold text-primary">Browse more</Link>
        </div>
        {holdings.length === 0 ? <p className="text-sm text-muted-foreground">No active holdings yet.</p> : (
          <div className="grid gap-3">
            {holdings.map((holding) => {
              const player = playersById.get(holding.player_id)
              if (!player) return null
              return (
                <Link key={holding.id} href={`/market/player/${encodeURIComponent(player.slug)}`} className="grid gap-3 rounded-2xl border border-border bg-background/70 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <MarketPlayerChip player={player} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{player.display_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{player.club_name} · {player.position}</p>
                      <p className="mt-1 text-sm font-black text-primary">{formatFiqCompact(player.current_value)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm sm:block sm:text-right">
                    <p className="text-muted-foreground">Purchase price</p>
                    <p>{formatFiqCompact(holding.acquisition_value)}</p>
                  </div>
                  <div className="flex items-center justify-between text-sm sm:block sm:text-right">
                    <p className="text-muted-foreground">Now</p>
                    <p>{formatFiqCompact(holding.current_value_snapshot)}</p>
                    <p className={holding.unrealized_profit_loss > 0 ? 'text-primary' : holding.unrealized_profit_loss < 0 ? 'text-destructive' : 'text-muted-foreground'}>
                      {movementLabel(holding.unrealized_profit_loss)}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-border bg-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Watchlist ({watchedPlayers.length})</h2>
            <p className="mt-1 text-xs text-muted-foreground">Players you are monitoring before deciding whether to buy.</p>
          </div>
          <Link href="/market/players" className="text-sm font-semibold text-primary">Find players</Link>
        </div>
        {watchedPlayers.length === 0 ? <p className="text-sm text-muted-foreground">No watched players yet. Use Watch on any market card to add one.</p> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {watchedPlayers.map((player) => (
              <Link key={player.id} href={`/market/player/${encodeURIComponent(player.slug)}`} className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-background/70 p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                <MarketPlayerChip player={player} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{player.display_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{player.club_name} · {player.competition_name}</p>
                  <p className="mt-1 text-sm font-bold text-primary">{formatFiqCompact(player.current_value)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-border bg-card p-6">
          <h2 className="text-xl font-bold">Recent transaction history</h2>
          <div className="mt-4 space-y-2">
            {transactions.length === 0 ? <p className="text-sm text-muted-foreground">No transactions yet.</p> : transactions.map((tx) => {
              const player = playersById.get(tx.player_id)
              return (
                <div key={tx.id} className="rounded-xl border border-border bg-background/60 p-3 text-sm">
                  <p className="font-semibold">{tx.transaction_type.toUpperCase()} · {player?.display_name ?? 'Player'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatMarketDateTime(tx.created_at)} · {formatFiqCompact(tx.execution_value)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Balance {formatFiqCompact(tx.balance_before)} → {formatFiqCompact(tx.balance_after)}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-card p-6">
          <h2 className="text-xl font-bold">Portfolio growth guidance</h2>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p className="rounded-xl border border-border bg-background/60 p-3">Holdings are valued at current FootballIQ market values, not real transfer fees.</p>
            <p className="rounded-xl border border-border bg-background/60 p-3">Each gameweek grants 11 new signings. Sales free squad slots without consuming another signing.</p>
            <p className="rounded-xl border border-border bg-background/60 p-3">{userSignedIn ? 'Atomic server-side execution protects account trades against duplicate clicks and multi-tab race conditions.' : 'Guest progress is saved on this device. Create an account to protect trades with server-side execution and sync across devices.'}</p>
            <Link href="/market/leaderboard" className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 font-semibold text-primary">
              Compare performance on leaderboard
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-border bg-card p-6">
          <h2 className="text-xl font-bold">Legacy update history</h2>
          <div className="mt-4 space-y-2">
            {runs.length === 0 ? <p className="text-sm text-muted-foreground">No match has changed player prices yet.</p> : runs.map((run) => (
              <div key={run.id} className="rounded-xl border border-border bg-background/60 px-3 py-2 text-sm">
                <p className="font-semibold">{run.week_label}</p>
                <p className="text-xs text-muted-foreground">Weekly change {run.weekly_portfolio_gain >= 0 ? '+' : '-'}{formatFiqCompact(Math.abs(run.weekly_portfolio_gain))} · ROI {run.current_roi_pct.toFixed(2)}%</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Reveal history</h2>
            <Link href="/market/reveal" className="text-sm font-semibold text-primary">Open The Reveal</Link>
          </div>
          <div className="mt-4 space-y-2">
            {reveals.length === 0 ? <p className="text-sm text-muted-foreground">No Reveal snapshots yet.</p> : reveals.map((reveal) => (
              <div key={`${reveal.scope_key}-${reveal.week_number}`} className="rounded-xl border border-border bg-background/60 px-3 py-2 text-sm">
                <p className="font-semibold">{reveal.week_label}</p>
                <p className="text-xs text-muted-foreground">{reveal.weekly_change >= 0 ? '+' : '-'}{formatFiqCompact(Math.abs(reveal.weekly_change))} · {reveal.weekly_return_pct >= 0 ? '+' : ''}{reveal.weekly_return_pct.toFixed(2)}%</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'positive' | 'negative' }) {
  const icon = label === 'Available balance' ? <Wallet className="size-4" /> : null
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${tone === 'positive' ? 'text-primary' : tone === 'negative' ? 'text-destructive' : 'text-foreground'}`}>{value}</p>
      {icon ? <div className="mt-1 text-muted-foreground">{icon as ReactNode}</div> : null}
    </div>
  )
}
