'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { ArrowUpRight, Award, Minus, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
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

      <RosterPitch holdings={holdings} playersById={playersById} limits={limits} activeFormation={activeFormation} />

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

const positionRows = [
  { position: 'FWD', label: 'Forwards' },
  { position: 'MID', label: 'Midfielders' },
  { position: 'DEF', label: 'Defenders' },
  { position: 'GK', label: 'Goalkeeper' },
] as const

function RosterPitch({
  holdings,
  playersById,
  limits,
  activeFormation,
}: {
  holdings: MarketHolding[]
  playersById: Map<number, MarketPlayer>
  limits: Record<'GK' | 'DEF' | 'MID' | 'FWD', number>
  activeFormation: string
}) {
  const holdingByPlayerId = new Map(holdings.map((holding) => [holding.player_id, holding]))
  return (
    <section aria-labelledby="formation-board-title" className="overflow-hidden rounded-[2rem] border border-emerald-950/20 bg-emerald-950 text-white shadow-[0_28px_80px_-45px_rgba(6,78,59,.9)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-7">
        <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-emerald-200">Full-screen roster</p><h2 id="formation-board-title" className="mt-1 text-2xl font-black">Your {activeFormation} team</h2><p className="mt-1 text-xs text-emerald-100/70">Tap any player to open their full stats, form and price details.</p></div>
        <Link href="/market/players" className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Change your team</Link>
      </div>
      <div className="relative bg-[linear-gradient(90deg,rgba(255,255,255,.025)_50%,transparent_50%),linear-gradient(rgba(255,255,255,.035)_50%,transparent_50%)] bg-[size:48px_48px] px-3 py-6 sm:px-6 sm:py-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-4 rounded-[1.5rem] border-2 border-white/12"><span className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/10" /><span className="absolute left-1/2 top-0 h-full border-l-2 border-white/10" /></div>
        <div className="relative space-y-6 sm:space-y-7">
          {positionRows.map(({ position, label }) => {
            const players = holdings.map((holding) => playersById.get(holding.player_id)).filter((player): player is MarketPlayer => player?.position === position)
            const slots = Array.from({ length: limits[position] }, (_, index) => players[index] ?? null)
            return <div key={position}><p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[.18em] text-emerald-100/60">{label}</p><div role="list" aria-label={label} className="flex snap-x justify-start gap-2 overflow-x-auto px-1 pb-1 sm:justify-center sm:overflow-visible">{slots.map((player, index) => player ? <RosterPlayerCard key={player.id} player={player} holding={holdingByPlayerId.get(player.id)} /> : <EmptyRosterSlot key={`${position}-${index}`} position={position} />)}</div></div>
          })}
        </div>
      </div>
    </section>
  )
}

function RosterPlayerCard({ player, holding }: { player: MarketPlayer; holding?: MarketHolding }) {
  const movement = holding?.unrealized_profit_loss ?? player.current_value - player.previous_value
  const MovementIcon = movement > 0 ? TrendingUp : movement < 0 ? TrendingDown : Minus
  return (
    <Link role="listitem" href={`/market/player/${encodeURIComponent(player.slug)}`} aria-label={`Open ${player.display_name} details`} className="group w-28 shrink-0 snap-center rounded-2xl border border-white/20 bg-white/95 p-2 text-center text-slate-950 shadow-lg outline-none transition hover:-translate-y-1 hover:border-emerald-200 focus-visible:ring-2 focus-visible:ring-white sm:w-32">
      <span className="mx-auto block w-fit"><MarketPlayerChip player={player} /></span>
      <span className="mt-2 block truncate text-xs font-black" title={player.display_name}>{player.short_name || player.display_name}</span>
      <span className="mt-0.5 block truncate text-[9px] text-slate-500">{player.club_name}</span>
      <span className="mt-1.5 block text-[11px] font-black text-emerald-800">{formatFiqCompact(player.current_value)}</span>
      <span className={`mt-0.5 flex items-center justify-center gap-1 text-[9px] font-bold ${movement > 0 ? 'text-emerald-700' : movement < 0 ? 'text-rose-700' : 'text-slate-500'}`}><MovementIcon className="size-3" aria-hidden="true" />{movement === 0 ? 'No change' : `${movement > 0 ? '+' : '-'}${formatFiqCompact(Math.abs(movement))}`}</span>
      <span className="mt-1 block text-[9px] text-slate-500">Owned by {(player.ownership_percentage ?? 0).toFixed(1)}%</span>
    </Link>
  )
}

function EmptyRosterSlot({ position }: { position: 'GK' | 'DEF' | 'MID' | 'FWD' }) {
  return <Link role="listitem" href={`/market/players?position=${position}`} className="flex h-[150px] w-28 shrink-0 snap-center flex-col items-center justify-center rounded-2xl border border-dashed border-white/30 bg-white/5 p-2 text-center text-emerald-100 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-32"><span className="text-2xl font-black">+</span><span className="mt-1 text-[10px] font-bold">Add {position}</span></Link>
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
