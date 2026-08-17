'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Activity, AlertCircle, ArrowLeft, BarChart3, CheckCircle2, Clock3, Sparkles, Star, Users } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { MarketPlayerChip } from '@/components/market/market-player-chip'
import { ClubColourDot, getClubHomeColour } from '@/components/market/club-colour-dot'
import { MarketTradeDialog } from '@/components/market/market-trade-dialog'
import { useMarketFormation } from '@/components/market/use-market-formation'
import { buyMarketPlayer, sellMarketPlayer, toggleMarketWatchlist } from '@/lib/market/client'
import { canBuyPosition, countFormation } from '@/lib/market/formation'
import { createMarketRequestKey, formatFiqCompact, formatMarketDateTime, formatMarketInteger, MARKET_MAX_PORTFOLIO_SIZE } from '@/lib/market/format'
import type { MarketHolding, MarketOpeningPriceExplanation, MarketPlayer, MarketSeasonStats, MarketValueHistoryPoint } from '@/lib/market/types'

export function PlayerMarketDetail({
  players,
  player,
  stats,
  openingExplanation,
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
  openingExplanation: MarketOpeningPriceExplanation | null
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
  const clubColour = getClubHomeColour(player.club_name)

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
      <section className="relative overflow-hidden rounded-[2rem] border border-emerald-200/10 bg-[radial-gradient(circle_at_85%_5%,rgba(45,212,191,.16),transparent_30%),linear-gradient(145deg,#062f2b,#0a4940_60%,#062f2b)] p-6 text-emerald-50 shadow-[0_28px_75px_-48px_rgba(2,44,34,.95)] sm:p-8">
        <span aria-hidden="true" className="absolute -right-20 -top-28 size-80 rounded-full opacity-[.12] blur-3xl" style={{ background: clubColour }} />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <MarketPlayerChip player={player} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Player card</p>
              <h1 className="mt-2 flex items-center gap-3 text-3xl font-black sm:text-4xl"><ClubColourDot clubName={player.club_name} className="size-4 sm:size-5" /><span>{player.display_name}</span></h1>
              <p className="mt-1 text-sm text-emerald-50/65">{player.club_name} · {player.position}{player.nationality ? ` · ${player.nationality}` : ''}</p>
              {player.availability_status ? <p className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${player.availability_status === 'available' ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200' : player.availability_status === 'limited' ? 'border-amber-300/25 bg-amber-300/10 text-amber-200' : 'border-rose-300/25 bg-rose-300/10 text-rose-200'}`}>{player.availability_status === 'available' ? 'Available' : player.availability_status === 'limited' ? 'Limited availability' : 'Unavailable'}</p> : null}
            </div>
          </div>
          <Link href="/market/roster" className="inline-flex items-center gap-2 rounded-xl border border-emerald-800 bg-emerald-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"><ArrowLeft className="size-4" />Back to full roster</Link>
        </div>

        <div className="relative mt-6 grid overflow-hidden rounded-2xl bg-[#082f2a] text-white shadow-lg sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Current value" value={formatFiqCompact(player.current_value)} icon={<Sparkles className="size-4" />} featured />
          <Metric label="Picked by" value={`${(player.ownership_percentage ?? 0).toFixed(1)}% of teams`} icon={<Users className="size-4" />} />
          <Metric label="Previous value" value={formatFiqCompact(player.previous_value)} icon={<Clock3 className="size-4" />} />
          <Metric label="Opening value" value={formatFiqCompact(player.opening_season_value)} icon={<BarChart3 className="size-4" />} />
          <Metric label="Movement" value={trend === 0 ? 'No change' : `${trend > 0 ? '+' : '-'}${formatFiqCompact(Math.abs(trend))}`} tone={trend > 0 ? 'positive' : trend < 0 ? 'negative' : 'default'} icon={<Activity className="size-4" />} />
        </div>

        <div className="relative mt-5 grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
          <div className="rounded-2xl border border-white/10 bg-black/15 p-5 shadow-inner">
            <div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-emerald-300">Value journey</p><h2 className="mt-1 text-lg font-black text-white">Game-price history</h2></div><span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-200">{history.length} updates</span></div>
            <div className="mt-4">
              <ValueHistoryChart points={history} currentValue={player.current_value} />
            </div>
          </div>

          <div className="rounded-2xl bg-emerald-950 p-5 text-white shadow-lg">
            <p className="text-[11px] font-black uppercase tracking-[.2em] text-emerald-300">Make your move</p>
            <h2 className="mt-1 text-lg font-black">Trade controls</h2>
            <div className="mt-3 space-y-2">
              <button
                onClick={() => setTradeIntent({ action: 'buy', requestKey: createMarketRequestKey(`buy-${player.slug}`) })}
                disabled={!canBuy}
                className="min-h-11 w-full rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-black text-emerald-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
              >
                {busy === 'buy' ? 'Buying…' : lockActive ? 'Temporarily locked' : owned ? 'Already held' : !hasPositionSlot ? `${player.position} slot full` : availableCash < player.current_value ? 'Not enough cash' : holdings.length >= MARKET_MAX_PORTFOLIO_SIZE ? 'Portfolio full (11/11)' : 'Buy'}
              </button>
              <button
                onClick={() => setTradeIntent({ action: 'sell', requestKey: createMarketRequestKey(`sell-${player.slug}`) })}
                disabled={!owned || busy !== null || lockActive}
                className="min-h-11 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
              >
                {busy === 'sell' ? 'Selling…' : lockActive ? 'Temporarily locked' : 'Sell'}
              </button>
              <button
                onClick={() => void handleWatchlist()}
                disabled={busy !== null}
                className="min-h-11 w-full rounded-xl border border-white/20 bg-transparent px-4 py-2.5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
              >
                {busy === 'watch' ? 'Updating…' : watchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
              </button>
            </div>
            <p className="mt-3 text-xs leading-5 text-emerald-50/70">
              You can buy {buysRemaining} more players this gameweek. Selling opens a place in your team and does not use a signing. Your team can have {MARKET_MAX_PORTFOLIO_SIZE} players.
            </p>
            <p className="mt-2 text-xs text-emerald-50/70">Your team: GK {formation.GK}/1 · DEF {formation.DEF}/4 · MID {formation.MID}/3 · FWD {formation.FWD}/3</p>
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
        <div className="rounded-[2rem] border border-emerald-200/10 bg-[#082f2a] p-6 text-emerald-50 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[.18em] text-emerald-300">On the pitch</p>
          <h2 className="mt-1 text-xl font-black text-white">Season statistics</h2>
          <p className="mt-1 text-xs text-emerald-50/60">We only show stats received from our data provider. Missing stats are labelled “Not available”.</p>
          {stats.length === 0 ? <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/15 p-4"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-300/10 text-emerald-200"><BarChart3 className="size-5" /></span><div><p className="text-sm font-bold text-white">Match stats are on their way</p><p className="mt-0.5 text-xs leading-5 text-emerald-50/60">We will show verified season numbers here after they arrive.</p></div></div> : (
            <div className="mt-4 space-y-4">
              {stats.slice(0, 2).map((row) => (
                <div key={row.id} className="rounded-2xl border border-white/10 bg-black/15 p-4">
                  <p className="font-semibold">{row.season} · {row.competition_label}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                    <Stat label="Appearances" value={row.appearances} />
                    <Stat label="Starts" value={row.starts} />
                    <Stat label="Minutes" value={row.minutes} />
                    <Stat label="Average rating" value={row.average_rating === null ? null : row.average_rating.toFixed(2)} />
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

        <div className="rounded-[2rem] border border-cyan-200/10 bg-[#0a3b3b] p-6 text-emerald-50 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[.18em] text-cyan-300">Clear and simple</p>
          <h2 className="mt-1 text-xl font-black text-white">How this game value works</h2>
          <ol className="mt-5 space-y-4 text-sm">
            <ValueStep number="1" title="A real match finishes">Licensed Sportmonks data gives us the player’s rating and minutes.</ValueStep>
            <ValueStep number="2" title="Early Shout makes the game price">The rating can push the fictional value up, down or leave it where it is.</ValueStep>
            <ValueStep number="3" title="Missing data means no movement">If the verified rating or minutes are missing, we do not guess.</ValueStep>
          </ol>
          <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-emerald-50/60">
            <Clock3 className="size-4" /><span>Last value update: <strong className="text-white">{formatMarketDateTime(player.value_updated_at)}</strong></span>
          </div>
        </div>

        <OpeningPriceBreakdown explanation={openingExplanation} openingValue={player.opening_season_value} />
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
                { label: 'Game profit/loss', value: `${player.current_value - (holding?.acquisition_value ?? player.current_value) >= 0 ? '+' : '-'}${formatFiqCompact(Math.abs(player.current_value - (holding?.acquisition_value ?? player.current_value)))}` },
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

function Metric({ label, value, tone = 'default', icon, featured = false }: { label: string; value: string; tone?: 'default' | 'positive' | 'negative'; icon: ReactNode; featured?: boolean }) {
  const color = tone === 'positive' ? 'text-emerald-300' : tone === 'negative' ? 'text-rose-300' : 'text-white'
  return (
    <div className={`border-b border-white/10 p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 ${featured ? 'bg-emerald-300/[.08]' : ''}`}>
      <p className="flex items-center gap-2 text-[11px] font-bold text-emerald-50/60">{icon}{label}</p>
      <p className={`mt-2 ${featured ? 'text-2xl' : 'text-lg'} font-black ${color}`}>{value}</p>
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

function Stat({ label, value }: { label: string; value: number | string | null }) {
  return (
    <div className="border-l-2 border-emerald-300/20 px-3 py-2">
      <p className="text-xs text-emerald-50/55">{label}</p>
      <p className="mt-1 font-semibold text-white">{value ?? 'N/A'}</p>
    </div>
  )
}

function ValueHistoryChart({ points, currentValue }: { points: MarketValueHistoryPoint[]; currentValue: number }) {
  if (points.length === 0) {
    return <div className="flex min-h-24 items-center gap-4 rounded-2xl border border-white/10 bg-white/[.055] p-4"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-300/10 text-emerald-200"><Activity className="size-5" /></span><div><p className="text-sm font-black text-white">Waiting for the first price update</p><p className="mt-1 text-xs leading-5 text-emerald-50/60">After a verified league match is processed, the first movement appears here.</p></div></div>
  }

  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(1, max - min)
  const start = points[0]?.value ?? currentValue
  const direction = currentValue > start ? 'rising' : currentValue < start ? 'falling' : 'unchanged'

  return (
    <div role="img" aria-label={`Value history: ${direction} from ${formatFiqCompact(start)} to ${formatFiqCompact(currentValue)} across ${points.length} recorded updates.`} className="flex h-40 items-end gap-1 rounded-2xl border border-white/10 bg-black/15 p-3">
      {points.slice(-24).map((point) => {
        const pct = ((point.value - min) / range) * 100
        return (
          <div key={point.id} tabIndex={0} aria-label={formatFiqCompact(point.value)} className="group relative flex-1 rounded-t bg-primary/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" style={{ height: `${Math.max(8, pct)}%` }}>
            <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-950 px-2 py-1 text-[10px] text-white group-hover:block group-focus:block">
              {formatFiqCompact(point.value)}
            </span>
          </div>
        )
      })}
      <div className="ml-2 flex items-center gap-1 text-xs text-primary"><Star className="size-3" />Now {formatFiqCompact(currentValue)}</div>
    </div>
  )
}

const OPENING_FACTORS = [
  { key: 'rating', label: 'Match rating', weight: '46%', help: 'How well the player performed.' },
  { key: 'minutes', label: 'Minutes played', weight: '17%', help: 'How much trusted playing time we have.' },
  { key: 'role', label: 'Team role', weight: '13%', help: 'How often the player starts and appears.' },
  { key: 'output', label: 'Position output', weight: '12%', help: 'Goals, assists or clean sheets for their role.' },
  { key: 'team_context', label: 'Club and league', weight: '8%', help: 'The level around the player.' },
  { key: 'age', label: 'Age profile', weight: '4%', help: 'A small age and potential adjustment.' },
] as const

function OpeningPriceBreakdown({ explanation, openingValue }: { explanation: MarketOpeningPriceExplanation | null; openingValue: number }) {
  if (!explanation) {
    return (
      <div className="rounded-[2rem] border border-amber-300/15 bg-[#3a3016] p-6 text-amber-50 lg:col-span-2">
        <p className="text-sm font-black text-amber-100">Opening-price breakdown is being checked</p>
        <p className="mt-1 text-xs leading-5 text-amber-50/65">The player card still works, but we will not show an explanation unless it matches the frozen opening value exactly.</p>
      </div>
    )
  }

  const confidence = explanation.confidence === 'high' ? 'Strong evidence'
    : explanation.confidence === 'established' ? 'Good evidence'
      : explanation.confidence === 'limited' ? 'Limited evidence' : 'Safe fallback price'

  return (
    <div className="overflow-hidden rounded-[2rem] border border-cyan-200/10 bg-[radial-gradient(circle_at_90%_0%,rgba(34,211,238,.14),transparent_28%),linear-gradient(145deg,#072f36,#083f38)] p-6 text-emerald-50 shadow-sm lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[.18em] text-cyan-300">The starting-price receipt</p>
          <h2 className="mt-1 text-xl font-black text-white">Why this player started at {formatFiqCompact(openingValue)}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-50/65">These frozen numbers set the opening game price once. New matches move the current value; they never rewrite this receipt.</p>
        </div>
        <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-black text-emerald-200">{confidence}</span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[.72fr_1.28fr]">
        <div className="rounded-2xl bg-emerald-950 p-5 text-white">
          <p className="text-[11px] font-black uppercase tracking-[.16em] text-emerald-300">Evidence used</p>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <EvidenceStat label="Average rating" value={explanation.source_inputs.average_rating === null ? 'Not available' : explanation.source_inputs.average_rating.toFixed(2)} />
            <EvidenceStat label="Stable rating" value={explanation.scores.stabilized_rating === null ? 'Not available' : explanation.scores.stabilized_rating.toFixed(2)} />
            <EvidenceStat label="Appearances" value={String(explanation.source_inputs.appearances)} />
            <EvidenceStat label="Starts" value={String(explanation.source_inputs.starts)} />
            <EvidenceStat label="Minutes" value={formatMarketInteger(explanation.source_inputs.minutes)} />
            <EvidenceStat label="Goals + assists" value={String(explanation.source_inputs.goals + explanation.source_inputs.assists)} />
          </dl>
          {explanation.guardrail ? <p className="mt-4 rounded-xl border border-amber-200/20 bg-amber-100/10 px-3 py-2 text-xs leading-5 text-amber-100">Safety rule: {explanation.guardrail}</p> : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {OPENING_FACTORS.map((factor) => (
            <PriceFactor key={factor.key} label={factor.label} weight={factor.weight} help={factor.help} score={explanation.scores[factor.key]} />
          ))}
        </div>
      </div>
    </div>
  )
}

function EvidenceStat({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-emerald-50/60">{label}</dt><dd className="mt-0.5 font-black">{value}</dd></div>
}

function PriceFactor({ label, weight, help, score }: { label: string; weight: string; help: string; score: number }) {
  const bounded = Math.max(0, Math.min(100, score))
  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
      <div className="flex items-baseline justify-between gap-3"><p className="text-sm font-black text-white">{label}</p><span className="text-xs font-bold text-emerald-300">{weight}</span></div>
      <p className="mt-1 text-xs leading-5 text-emerald-50/55">{help}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/25"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-300" style={{ width: `${bounded}%` }} /></div>
      <p className="mt-1.5 text-right text-xs font-black text-emerald-200">{Math.round(bounded)} / 100</p>
    </div>
  )
}

function ValueStep({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return <li className="flex gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-cyan-300/15 text-xs font-black text-cyan-200">{number}</span><div><p className="font-black text-white">{title}</p><p className="mt-1 text-xs leading-5 text-emerald-50/60">{children}</p></div></li>
}
