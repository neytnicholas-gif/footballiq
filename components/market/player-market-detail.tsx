'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Clock3, Star } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { MarketPlayerChip } from '@/components/market/market-player-chip'
import { MarketTradeDialog } from '@/components/market/market-trade-dialog'
import { useMarketFormation } from '@/components/market/use-market-formation'
import { buyMarketPlayer, sellMarketPlayer, toggleMarketWatchlist } from '@/lib/market/client'
import { canBuyPosition, countFormation } from '@/lib/market/formation'
import { createMarketRequestKey, formatFiqCompact, formatMarketDateTime, MARKET_MAX_PORTFOLIO_SIZE } from '@/lib/market/format'
import type { MarketHolding, MarketPlayer, MarketSeasonStats, MarketValueHistoryPoint } from '@/lib/market/types'

export function PlayerMarketDetail({
  players,
  player,
  stats,
  history,
  holdings,
  watchlist,
  availableCash,
  buysRemaining,
  onRefresh,
}: {
  players: MarketPlayer[]
  player: MarketPlayer
  stats: MarketSeasonStats[]
  history: MarketValueHistoryPoint[]
  holdings: MarketHolding[]
  watchlist: number[]
  availableCash: number
  buysRemaining: number
  onRefresh: () => Promise<void>
}) {
  const { user, refreshProfile } = useAuth()
  const [busy, setBusy] = useState<'buy' | 'sell' | 'watch' | null>(null)
  const [notice, setNotice] = useState<{ kind: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [tradeIntent, setTradeIntent] = useState<{ action: 'buy' | 'sell'; requestKey: string } | null>(null)
  const [renderedAt] = useState(() => Date.now())
  const activeFormation = useMarketFormation()

  const holding = useMemo(() => holdings.find((item) => item.player_id === player.id) ?? null, [holdings, player.id])
  const owned = Boolean(holding)
  const watchlisted = watchlist.includes(player.id)
  const trend = player.current_value - player.previous_value
  const lockActive = player.is_trade_locked && (!player.trade_lock_ends_at || new Date(player.trade_lock_ends_at).getTime() > renderedAt)
  const lockReason = player.trade_lock_reason ?? 'market review in progress'
  const playersById = useMemo(() => new Map(players.map((entry) => [entry.id, entry])), [players])
  const formation = useMemo(() => countFormation(holdings, playersById), [holdings, playersById])
  const hasPositionSlot = canBuyPosition(player.position, formation, activeFormation)
  const canBuy = player.active
    && !owned
    && buysRemaining > 0
    && busy === null
    && !lockActive
    && holdings.length < MARKET_MAX_PORTFOLIO_SIZE
    && availableCash >= player.current_value
    && hasPositionSlot

  async function handleBuy(requestKey: string) {
    setBusy('buy')
    setNotice(null)
    const { data, error } = await buyMarketPlayer(player.slug, player.id, requestKey)
    if (error) {
      setNotice({ kind: 'error', message: error.message })
      setBusy(null)
      return
    }
    setNotice({ kind: 'success', message: String(data?.message ?? 'Purchase completed') })
    if (user) await refreshProfile()
    await onRefresh()
    setBusy(null)
  }

  async function handleSell(requestKey: string) {
    setBusy('sell')
    setNotice(null)
    const { data, error } = await sellMarketPlayer(player.slug, player.id, requestKey)
    if (error) {
      setNotice({ kind: 'error', message: error.message })
      setBusy(null)
      return
    }
    setNotice({ kind: 'success', message: String(data?.message ?? 'Sale completed') })
    if (user) await refreshProfile()
    await onRefresh()
    setBusy(null)
  }

  async function handleWatchlist() {
    setBusy('watch')
    setNotice(null)
    const { data, error } = await toggleMarketWatchlist(player.slug, player.id)
    if (error) {
      setNotice({ kind: 'error', message: error.message })
      setBusy(null)
      return
    }
    setNotice({ kind: 'success', message: data?.watchlisted ? 'Added to watchlist' : 'Removed from watchlist' })
    await onRefresh()
    setBusy(null)
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-emerald-950/10 bg-gradient-to-br from-white via-white to-emerald-50/70 p-6 shadow-[0_24px_70px_-55px_rgba(6,78,59,.65)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <MarketPlayerChip player={player} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Player card</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">{player.display_name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{player.club_name} · {player.position}{player.nationality ? ` · ${player.nationality}` : ''}</p>
              {player.availability_status ? <p className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${player.availability_status === 'available' ? 'border-emerald-700/20 bg-emerald-50 text-emerald-800' : player.availability_status === 'limited' ? 'border-amber-700/20 bg-amber-50 text-amber-800' : 'border-red-700/20 bg-red-50 text-red-800'}`}>{player.availability_status === 'available' ? 'Available' : player.availability_status === 'limited' ? 'Limited availability' : 'Unavailable'}</p> : null}
            </div>
          </div>
          <Link href="/market/portfolio" className="rounded-xl border border-emerald-800 bg-emerald-950 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">Back to full roster</Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Current value" value={formatFiqCompact(player.current_value)} />
          <Metric label="Picked by" value={`${(player.ownership_percentage ?? 0).toFixed(1)}% of teams`} />
          <Metric label="Previous value" value={formatFiqCompact(player.previous_value)} />
          <Metric label="Opening value" value={formatFiqCompact(player.opening_season_value)} />
          <Metric label="Movement" value={`${trend >= 0 ? '+' : ''}${formatFiqCompact(Math.abs(trend))}`} tone={trend >= 0 ? 'positive' : 'negative'} />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
          <div className="rounded-2xl border border-emerald-950/10 bg-white/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-muted-foreground">Value history</p>
            <div className="mt-3 h-40 overflow-hidden rounded-xl border border-border bg-card p-3">
              <ValueHistoryChart points={history} currentValue={player.current_value} />
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-950/10 bg-white/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-muted-foreground">Trade controls</p>
            <div className="mt-3 space-y-2">
              <button
                onClick={() => setTradeIntent({ action: 'buy', requestKey: createMarketRequestKey(`buy-${player.slug}`) })}
                disabled={!canBuy}
                className="min-h-11 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50"
              >
                {busy === 'buy' ? 'Buying…' : lockActive ? 'Temporarily locked' : owned ? 'Already held' : !hasPositionSlot ? `${player.position} slot full` : availableCash < player.current_value ? 'Not enough cash' : holdings.length >= MARKET_MAX_PORTFOLIO_SIZE ? 'Portfolio full (11/11)' : 'Buy'}
              </button>
              <button
                onClick={() => setTradeIntent({ action: 'sell', requestKey: createMarketRequestKey(`sell-${player.slug}`) })}
                disabled={!owned || busy !== null || lockActive}
                className="min-h-11 w-full rounded-xl border border-border px-4 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50"
              >
                {busy === 'sell' ? 'Selling…' : lockActive ? 'Temporarily locked' : 'Sell'}
              </button>
              <button
                onClick={() => void handleWatchlist()}
                disabled={busy !== null}
                className="min-h-11 w-full rounded-xl border border-border px-4 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50"
              >
                {busy === 'watch' ? 'Updating…' : watchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
              </button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              You can buy {buysRemaining} more players this gameweek. Selling opens a place in your team and does not use a signing. Your team can have {MARKET_MAX_PORTFOLIO_SIZE} players.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Your team: GK {formation.GK}/1 · DEF {formation.DEF}/4 · MID {formation.MID}/3 · FWD {formation.FWD}/3</p>
            {!owned && !hasPositionSlot ? <p className="mt-2 text-xs text-amber-200">No {player.position} slots left. Sell an existing {player.position} first to replace.</p> : null}
            {!owned && availableCash < player.current_value ? <p className="mt-2 text-xs text-amber-200">Insufficient cash for this purchase.</p> : null}
            {!owned && holdings.length >= MARKET_MAX_PORTFOLIO_SIZE ? <p className="mt-2 text-xs text-amber-200">Portfolio is full. Sell one player before buying another.</p> : null}
            {lockActive ? (
              <p className="mt-2 rounded-lg border border-amber-300/30 bg-amber-200/10 px-2.5 py-2 text-xs text-amber-200">
                Trading lock active: {lockReason}{player.trade_lock_ends_at ? ` (until ${formatMarketDateTime(player.trade_lock_ends_at)})` : ''}.
              </p>
            ) : null}
          </div>
        </div>

        {notice ? <Notice kind={notice.kind} message={notice.message} /> : null}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-border bg-card p-6">
          <h2 className="text-xl font-bold">Season statistics</h2>
          <p className="mt-1 text-xs text-muted-foreground">Nullable metrics are intentionally shown as unavailable when unverified or missing.</p>
          {stats.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No season stats available for this player yet.</p> : (
            <div className="mt-4 space-y-4">
              {stats.slice(0, 2).map((row) => (
                <div key={row.id} className="rounded-2xl border border-border bg-background/60 p-4">
                  <p className="font-semibold">{row.season} · {row.competition_label}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                    <Stat label="Appearances" value={row.appearances} />
                    <Stat label="Starts" value={row.starts} />
                    <Stat label="Minutes" value={row.minutes} />
                    <Stat label="Goals" value={row.goals} />
                    <Stat label="Assists" value={row.assists} />
                    <Stat label="Clean sheets" value={row.clean_sheets} />
                    <Stat label="Shots" value={row.shots} />
                    <Stat label="Key passes" value={row.key_passes} />
                    <Stat label="Tackles" value={row.tackles} />
                    <Stat label="Interceptions" value={row.interceptions} />
                    <Stat label="Saves" value={row.saves} />
                    <Stat label="Goals conceded" value={row.goals_conceded} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-border bg-card p-6">
          <h2 className="text-xl font-bold">How this game value works</h2>
          <div className="mt-4 space-y-3 text-sm">
            <p className="rounded-xl border border-border bg-background/60 p-3">
              FootballIQ value is an internal strategy metric (not a real-world transfer value) generated using FootballIQ methodology versioning.
            </p>
            <p className="rounded-xl border border-border bg-background/60 p-3">
              Player identity and eligible match inputs come from a licensed football-data provider. FootballIQ creates the game price independently.
            </p>
            <p className="rounded-xl border border-border bg-background/60 p-3">
              Input validation: {player.provenance_status === 'verified' && player.owner_verified ? 'passed' : 'pending'}. A missing or ineligible rating freezes the price instead of guessing.
            </p>
            <p className="rounded-xl border border-border bg-background/60 p-3">
              Last value update: {formatMarketDateTime(player.value_updated_at)}
            </p>
          </div>
        </div>
      </section>
      {tradeIntent ? (
        <MarketTradeDialog
          action={tradeIntent.action}
          playerName={player.display_name}
          details={tradeIntent.action === 'buy'
            ? [
                { label: 'Current value', value: formatFiqCompact(player.current_value) },
                { label: 'Available cash', value: formatFiqCompact(availableCash) },
                { label: 'Cash after purchase', value: formatFiqCompact(availableCash - player.current_value) },
                { label: 'Position slot', value: player.position },
              ]
            : [
                { label: 'Purchase price', value: formatFiqCompact(holding?.acquisition_value ?? player.current_value) },
                { label: 'Current value', value: formatFiqCompact(player.current_value) },
                { label: 'Realised P/L', value: `${player.current_value - (holding?.acquisition_value ?? player.current_value) >= 0 ? '+' : '-'}${formatFiqCompact(Math.abs(player.current_value - (holding?.acquisition_value ?? player.current_value)))}` },
              ]}
          onCancel={() => setTradeIntent(null)}
          onConfirm={() => {
            const intent = tradeIntent
            setTradeIntent(null)
            if (intent.action === 'buy') void handleBuy(intent.requestKey)
            else void handleSell(intent.requestKey)
          }}
        />
      ) : null}
    </div>
  )
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'positive' | 'negative' }) {
  const color = tone === 'positive' ? 'text-primary' : tone === 'negative' ? 'text-destructive' : 'text-foreground'
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-semibold ${color}`}>{value}</p>
    </div>
  )
}

function Notice({ kind, message }: { kind: 'success' | 'error' | 'info'; message: string }) {
  const className = kind === 'success'
    ? 'border-primary/30 bg-primary/10 text-primary'
    : kind === 'error'
      ? 'border-destructive/30 bg-destructive/10 text-destructive'
      : 'border-border bg-background/70 text-muted-foreground'
  const icon: ReactNode = kind === 'success'
    ? <CheckCircle2 className="size-4" />
    : kind === 'error'
      ? <AlertCircle className="size-4" />
      : <Clock3 className="size-4" />

  return <p role={kind === 'error' ? 'alert' : 'status'} aria-live={kind === 'error' ? 'assertive' : 'polite'} className={`mt-4 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${className}`}>{icon}{message}</p>
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value ?? 'N/A'}</p>
    </div>
  )
}

function ValueHistoryChart({ points, currentValue }: { points: MarketValueHistoryPoint[]; currentValue: number }) {
  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">No history points yet.</p>
  }

  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(1, max - min)
  const start = points[0]?.value ?? currentValue
  const direction = currentValue > start ? 'rising' : currentValue < start ? 'falling' : 'unchanged'

  return (
    <div role="img" aria-label={`Value history: ${direction} from ${formatFiqCompact(start)} to ${formatFiqCompact(currentValue)} across ${points.length} recorded updates.`} className="flex h-full items-end gap-1">
      {points.slice(-24).map((point) => {
        const pct = ((point.value - min) / range) * 100
        return (
          <div key={point.id} tabIndex={0} aria-label={formatFiqCompact(point.value)} className="group relative flex-1 rounded-t bg-primary/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" style={{ height: `${Math.max(8, pct)}%` }}>
            <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-background px-2 py-1 text-[10px] group-hover:block group-focus:block">
              {formatFiqCompact(point.value)}
            </span>
          </div>
        )
      })}
      <div className="ml-2 flex items-center gap-1 text-xs text-primary"><Star className="size-3" />Now {formatFiqCompact(currentValue)}</div>
    </div>
  )
}
