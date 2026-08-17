'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { ArrowUpRight, Award, CircleDollarSign, Minus, ShieldCheck, Sparkles, TrendingDown, TrendingUp, Users, Wallet } from 'lucide-react'
import { MarketPlayerChip } from '@/components/market/market-player-chip'
import { ClubColourDot } from '@/components/market/club-colour-dot'
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
  const rosterProgress = Math.round((holdings.length / MARKET_MAX_PORTFOLIO_SIZE) * 100)

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
      <section className="relative overflow-hidden rounded-[2rem] border border-emerald-800/20 bg-[#07352f] text-white shadow-[0_28px_80px_-48px_rgba(6,78,59,.95)]">
        <div aria-hidden="true" className="absolute -right-20 -top-24 size-72 rounded-full bg-emerald-300/10 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-28 left-1/3 size-64 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[.18em] text-emerald-100"><Sparkles className="size-3.5" />Squad room</p>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Your {activeFormation} starting XI</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/75">Build all 11 places, watch each game price move, then decide who earns a place next week.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/market/players#live-roster" className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-emerald-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Change your team</Link>
              <Link href="/market/rewards" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><Award className="size-4"/>Rewards</Link>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <HeroMetric icon={<Users className="size-4" />} label="Players signed" value={`${holdings.length} / ${MARKET_MAX_PORTFOLIO_SIZE}`} />
            <HeroMetric icon={<Wallet className="size-4" />} label="Cash to spend" value={formatFiqCompact(portfolio.available_balance)} />
            <HeroMetric icon={<ShieldCheck className="size-4" />} label="Squad value" value={formatFiqCompact(portfolio.portfolio_value)} />
            <HeroMetric icon={<CircleDollarSign className="size-4" />} label="Total account" value={formatFiqCompact(portfolio.total_account_value)} />
          </div>

          <div className="mt-5 grid gap-4 border-t border-white/10 pt-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="flex items-center justify-between gap-4 text-xs font-bold text-emerald-50/75"><span>Roster complete</span><span>{rosterProgress}%</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/25"><span className="block h-full rounded-full bg-gradient-to-r from-emerald-300 to-cyan-300 transition-[width]" style={{ width: `${rosterProgress}%` }} /></div>
            </div>
            <p className="text-xs leading-5 text-emerald-50/75"><strong className="text-white">{buysRemaining} signings left</strong> this gameweek · GK {formation.GK}/{limits.GK} · DEF {formation.DEF}/{limits.DEF} · MID {formation.MID}/{limits.MID} · FWD {formation.FWD}/{limits.FWD}</p>
          </div>
        </div>
      </section>

      <RosterPitch holdings={holdings} playersById={playersById} limits={limits} activeFormation={activeFormation} />

      <section aria-labelledby="roster-performance-title" className="rounded-[2rem] border border-emerald-200/10 bg-[#0a3c36] p-5 text-emerald-50 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[11px] font-black uppercase tracking-[.18em] text-emerald-300">Your numbers</p><h2 id="roster-performance-title" className="mt-1 text-2xl font-black text-white">Squad performance</h2></div>
          <p className="text-xs text-emerald-50/55">Simple game totals · no real money</p>
        </div>
        <div className="mt-5 grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Total game gain/loss" value={movementLabel(totalProfitLoss)} tone={totalProfitLoss > 0 ? 'positive' : totalProfitLoss < 0 ? 'negative' : 'default'} />
          <Metric label="This squad's movement" value={movementLabel(todayMovement)} tone={todayMovement > 0 ? 'positive' : todayMovement < 0 ? 'negative' : 'default'} />
          <Metric label="Cash already spent" value={formatFiqCompact(totalSpent)} />
          <Metric label="Overall game return" value={totalRoi === 0 ? 'No movement' : `${totalRoi > 0 ? '+' : ''}${totalRoi.toFixed(2)}%`} tone={totalRoi > 0 ? 'positive' : totalRoi < 0 ? 'negative' : 'default'} />
        </div>
        <details className="group mt-5 border-t border-white/10 pt-4">
          <summary className="cursor-pointer list-none text-sm font-bold text-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">More performance details <span aria-hidden="true" className="ml-1 inline-block transition group-open:rotate-180">⌄</span></summary>
          <div className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Season movement" value={movementLabel(seasonMovement)} tone={seasonMovement > 0 ? 'positive' : seasonMovement < 0 ? 'negative' : 'default'} />
            <Metric label="Realised gain/loss" value={movementLabel(portfolio.realized_profit_loss)} tone={portfolio.realized_profit_loss > 0 ? 'positive' : portfolio.realized_profit_loss < 0 ? 'negative' : 'default'} />
            <Metric label="Best player" value={bestHolding ? movementLabel(bestHolding.unrealized_profit_loss) : 'Not yet'} tone={bestHolding && bestHolding.unrealized_profit_loss > 0 ? 'positive' : 'default'} />
            <Metric label="Biggest drop" value={worstHolding ? movementLabel(worstHolding.unrealized_profit_loss) : 'Not yet'} tone={worstHolding && worstHolding.unrealized_profit_loss < 0 ? 'negative' : 'default'} />
          </div>
        </details>
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
                      <p className="flex min-w-0 items-center gap-2 font-semibold"><ClubColourDot clubName={player.club_name} /><span className="truncate">{player.display_name}</span></p>
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
                  <p className="flex min-w-0 items-center gap-2 font-semibold"><ClubColourDot clubName={player.club_name} /><span className="truncate">{player.display_name}</span></p>
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
                  <p className="flex items-center gap-2 font-semibold">{player ? <ClubColourDot clubName={player.club_name} /> : null}<span>{tx.transaction_type.toUpperCase()} · {player?.display_name ?? 'Player'}</span></p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatMarketDateTime(tx.created_at)} · {formatFiqCompact(tx.execution_value)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Balance {formatFiqCompact(tx.balance_before)} → {formatFiqCompact(tx.balance_after)}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-card p-6">
          <h2 className="text-xl font-bold">How your team value works</h2>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p className="rounded-xl border border-border bg-background/60 p-3">Your players use current Early Shout game prices, not real transfer fees.</p>
            <p className="rounded-xl border border-border bg-background/60 p-3">Each gameweek gives you 11 signings. Selling a player opens their squad slot and does not use another signing.</p>
            <p className="rounded-xl border border-border bg-background/60 p-3">{userSignedIn ? 'If you tap twice, Early Shout only completes the trade once.' : 'Guest progress is saved on this device. Create an account to keep your team when you switch devices.'}</p>
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
    <section aria-labelledby="formation-board-title" className="overflow-hidden rounded-[2rem] border border-emerald-950/20 bg-[#052e29] text-white shadow-[0_28px_80px_-45px_rgba(6,78,59,.9)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 bg-black/10 px-5 py-5 sm:px-7">
        <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300">Matchday board</p><h2 id="formation-board-title" className="mt-1 text-2xl font-black">Your {activeFormation} team</h2><p className="mt-1 text-xs text-emerald-50/70">Select a player for their price, form and match details.</p></div>
        <div className="flex items-center gap-2"><span className="rounded-full border border-emerald-200/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-black text-emerald-100">{holdings.length}/{MARKET_MAX_PORTFOLIO_SIZE} selected</span><Link href="/market/players" className="rounded-xl bg-emerald-300 px-4 py-2 text-sm font-black text-emerald-950 transition hover:bg-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Find players</Link></div>
      </div>
      <div className="relative bg-[radial-gradient(circle_at_50%_0%,rgba(52,211,153,.16),transparent_35%),linear-gradient(90deg,rgba(255,255,255,.028)_50%,transparent_50%),linear-gradient(rgba(255,255,255,.04)_50%,transparent_50%)] bg-[size:auto,48px_48px,48px_48px] px-3 py-7 sm:px-6 sm:py-9">
        <div aria-hidden="true" className="pointer-events-none absolute inset-4 rounded-[1.5rem] border-2 border-white/15"><span className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/12" /><span className="absolute left-1/2 top-0 h-full border-l-2 border-white/12" /><span className="absolute left-1/2 top-0 h-12 w-36 -translate-x-1/2 rounded-b-[3rem] border-x-2 border-b-2 border-white/10" /><span className="absolute bottom-0 left-1/2 h-12 w-36 -translate-x-1/2 rounded-t-[3rem] border-x-2 border-t-2 border-white/10" /></div>
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
    <div role="listitem" className="w-28 shrink-0 snap-center sm:w-32"><Link href={`/market/player/${encodeURIComponent(player.slug)}`} aria-label={`Open ${player.display_name} details`} className="group block rounded-2xl border border-emerald-200/20 bg-[#0b463e]/95 p-2 text-center text-white shadow-[0_16px_35px_-22px_rgba(0,0,0,.9)] outline-none transition hover:-translate-y-1 hover:border-emerald-200/60 hover:bg-[#0d5147] hover:shadow-xl focus-visible:ring-2 focus-visible:ring-white">
      <span className="mb-1 inline-flex rounded-full bg-black/25 px-2 py-0.5 text-[8px] font-black tracking-wide text-emerald-200">{player.position}</span>
      <span className="mx-auto block w-fit"><MarketPlayerChip player={player} /></span>
      <span className="mt-2 flex min-w-0 items-center justify-center gap-1.5 text-xs font-black" title={player.display_name}><ClubColourDot clubName={player.club_name} className="size-2.5 shadow-[0_0_0_1px_rgba(255,255,255,.8)]" /><span className="truncate">{player.short_name || player.display_name}</span></span>
      <span className="mt-0.5 block truncate text-[9px] text-emerald-50/55">{player.club_name}</span>
      <span className="mt-1.5 block text-[11px] font-black text-emerald-200">{formatFiqCompact(player.current_value)}</span>
      <span className={`mt-0.5 flex items-center justify-center gap-1 text-[9px] font-bold ${movement > 0 ? 'text-emerald-300' : movement < 0 ? 'text-rose-300' : 'text-emerald-50/55'}`}><MovementIcon className="size-3" aria-hidden="true" />{movement === 0 ? 'No change' : `${movement > 0 ? '+' : '-'}${formatFiqCompact(Math.abs(movement))}`}</span>
      <span className="mt-1 block text-[9px] text-emerald-50/50">Owned by {(player.ownership_percentage ?? 0).toFixed(1)}%</span>
    </Link></div>
  )
}

function EmptyRosterSlot({ position }: { position: 'GK' | 'DEF' | 'MID' | 'FWD' }) {
  const label = position === 'GK' ? 'goalkeeper' : position === 'DEF' ? 'defender' : position === 'MID' ? 'midfielder' : 'forward'
  const tone = position === 'GK' ? 'from-amber-300/20' : position === 'DEF' ? 'from-cyan-300/15' : position === 'MID' ? 'from-emerald-300/15' : 'from-rose-300/15'
  return <div role="listitem" className="w-28 shrink-0 snap-center sm:w-32"><Link href={`/market/players?position=${position}`} aria-label={`Choose a ${label}`} className={`group flex h-[158px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/30 bg-gradient-to-b ${tone} to-white/5 p-2 text-center text-white transition hover:-translate-y-0.5 hover:border-white/55 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`}><span className="grid size-10 place-items-center rounded-full border border-white/25 bg-white/10 text-2xl font-light transition group-hover:scale-110 group-hover:bg-white/20">+</span><span className="mt-3 text-[10px] font-black uppercase tracking-wide">Choose {position}</span><span className="mt-1 text-[9px] text-emerald-50/60">Open market</span></Link></div>
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'positive' | 'negative' }) {
  return (
    <div className="border-l-2 border-emerald-300/20 pl-3 first:border-l-0 first:pl-0 sm:first:border-l-2 sm:first:pl-3">
      <p className="text-[11px] font-semibold text-emerald-50/55">{label}</p>
      <p className={`mt-1 text-lg font-black ${tone === 'positive' ? 'text-emerald-300' : tone === 'negative' ? 'text-rose-300' : 'text-white'}`}>{value}</p>
    </div>
  )
}

function HeroMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.08] p-4 backdrop-blur-sm"><p className="flex items-center gap-2 text-xs font-bold text-emerald-50/70">{icon}{label}</p><p className="mt-2 text-2xl font-black tracking-tight text-white">{value}</p></div>
}
