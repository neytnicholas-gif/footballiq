'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowUpDown, Clock3, Search, Shield, Sparkles, Star, WalletCards } from 'lucide-react'
import { MarketPlayerChip } from '@/components/market/market-player-chip'
import { MarketTradeDialog } from '@/components/market/market-trade-dialog'
import { buyMarketPlayer, sellMarketPlayer, toggleMarketWatchlist } from '@/lib/market/client'
import { canBuyPosition, countFormation } from '@/lib/market/formation'
import { formatFiqCompact, MARKET_MAX_PORTFOLIO_SIZE } from '@/lib/market/format'
import type { MarketHolding, MarketPlayer, MarketSeasonStats } from '@/lib/market/types'

type SortKey = 'value-desc' | 'value-asc' | 'change-desc' | 'change-asc' | 'form-desc' | 'name-asc'

const PLAYER_PAGE_SIZE = 36

export function PlayerMarketBrowser({
  players,
  holdings,
  watchlist,
  statsByPlayerId,
  userSignedIn,
  buysRemaining,
  salesRemaining,
  availableCash,
  onTradeAction,
}: {
  players: MarketPlayer[]
  holdings: MarketHolding[]
  watchlist: number[]
  statsByPlayerId: Record<number, MarketSeasonStats | undefined>
  userSignedIn: boolean
  buysRemaining: number
  salesRemaining: number
  availableCash: number
  onTradeAction: () => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState<'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD'>('ALL')
  const [competition, setCompetition] = useState('ALL')
  const [club, setClub] = useState('ALL')
  const [trend, setTrend] = useState<'all' | 'rising' | 'falling'>('all')
  const [priceRange, setPriceRange] = useState<'all' | 'low' | 'mid' | 'high'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('value-desc')
  const [visibleCount, setVisibleCount] = useState(PLAYER_PAGE_SIZE)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [notice, setNotice] = useState<{ kind: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [tradeIntent, setTradeIntent] = useState<{ action: 'buy' | 'sell'; player: MarketPlayer } | null>(null)
  const [renderedAt] = useState(() => Date.now())

  const clubs = useMemo(() => ['ALL', ...new Set(players
    .filter((player) => competition === 'ALL' || player.competition_name === competition)
    .map((player) => player.club_name))], [players, competition])
  const competitions = useMemo(() => ['ALL', ...new Set(players.map((player) => player.competition_name).filter((name): name is string => Boolean(name)))], [players])
  const liveCompetitionLabel = competitions.filter((name) => name !== 'ALL').join(' + ')
  const holdingsSet = useMemo(() => new Set(holdings.map((item) => item.player_id)), [holdings])
  const watchSet = useMemo(() => new Set(watchlist), [watchlist])
  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players])
  const formation = useMemo(() => countFormation(holdings, playersById), [holdings, playersById])
  const marketHasMoved = useMemo(() => players.some((player) => player.current_value !== player.opening_season_value), [players])
  const filtered = useMemo(() => {
    let rows = [...players]

    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter((player) =>
        player.display_name.toLowerCase().includes(q)
        || player.short_name?.toLowerCase().includes(q)
        || player.club_name.toLowerCase().includes(q),
      )
    }

    if (position !== 'ALL') {
      rows = rows.filter((player) => player.position === position)
    }

    if (competition !== 'ALL') {
      rows = rows.filter((player) => player.competition_name === competition)
    }

    if (club !== 'ALL') {
      rows = rows.filter((player) => player.club_name === club)
    }

    if (trend === 'rising') rows = rows.filter((player) => player.current_value > player.previous_value)
    if (trend === 'falling') rows = rows.filter((player) => player.current_value < player.previous_value)

    if (priceRange === 'low') rows = rows.filter((player) => player.current_value < 7_000_000)
    if (priceRange === 'mid') rows = rows.filter((player) => player.current_value >= 7_000_000 && player.current_value < 10_000_000)
    if (priceRange === 'high') rows = rows.filter((player) => player.current_value >= 10_000_000)

    rows.sort((a, b) => {
      switch (sortKey) {
        case 'value-asc':
          return a.current_value - b.current_value
        case 'change-desc':
          return (b.current_value - b.previous_value) - (a.current_value - a.previous_value)
        case 'change-asc':
          return (a.current_value - a.previous_value) - (b.current_value - b.previous_value)
        case 'form-desc': {
          const aForm = a.recent_form_indicator === 'hot' ? 2 : a.recent_form_indicator === 'steady' ? 1 : 0
          const bForm = b.recent_form_indicator === 'hot' ? 2 : b.recent_form_indicator === 'steady' ? 1 : 0
          return bForm - aForm
        }
        case 'name-asc':
          return a.display_name.localeCompare(b.display_name)
        case 'value-desc':
        default:
          return b.current_value - a.current_value
      }
    })

    return rows
  }, [players, search, position, competition, club, trend, priceRange, sortKey])
  const visiblePlayers = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])

  function resetCatalogueWindow() {
    setVisibleCount(PLAYER_PAGE_SIZE)
  }

  async function handleBuy(player: MarketPlayer) {
    setBusyId(player.id)
    setNotice(null)
    const { data, error } = await buyMarketPlayer(player.slug, player.id)
    if (error) {
      setNotice({ kind: 'error', message: error.message })
      setBusyId(null)
      return
    }
    setNotice({ kind: 'success', message: String(data?.message ?? `${player.display_name} purchased`) })
    await onTradeAction()
    setBusyId(null)
  }

  async function handleSell(player: MarketPlayer) {
    setBusyId(player.id)
    setNotice(null)
    const { data, error } = await sellMarketPlayer(player.slug, player.id)
    if (error) {
      setNotice({ kind: 'error', message: error.message })
      setBusyId(null)
      return
    }
    setNotice({ kind: 'success', message: String(data?.message ?? `${player.display_name} sold`) })
    await onTradeAction()
    setBusyId(null)
  }

  async function handleWatchlist(player: MarketPlayer) {
    setBusyId(player.id)
    const { data, error } = await toggleMarketWatchlist(player.slug, player.id)
    if (error) {
      setNotice({ kind: 'error', message: error.message })
      setBusyId(null)
      return
    }
    setNotice({ kind: 'success', message: data?.watchlisted ? 'Added to watchlist' : 'Removed from watchlist' })
    await onTradeAction()
    setBusyId(null)
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[2rem] border border-emerald-900/10 bg-gradient-to-br from-white via-emerald-50/80 to-slate-100/90 p-5 shadow-[0_24px_70px_-55px_rgba(6,78,59,.65)] sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full border-[38px] border-emerald-500/[.06]" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-700/15 bg-emerald-900/[.06] px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-emerald-900"><Sparkles className="size-3" /> FootballIQ Exchange</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Player market</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Build your 11-player investment portfolio. Buy players before verified performances move their FootballIQ game price.</p>
          </div>
          <div className="rounded-2xl border border-emerald-900/10 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-slate-500"><WalletCards className="size-3.5 text-emerald-700" /> Available cash</p>
            <p className="mt-1 text-xl font-black text-slate-950">{formatFiqCompact(availableCash)}</p>
            <p className="text-[10px] text-slate-500">{userSignedIn ? 'Account portfolio' : 'Saved on this device'}</p>
          </div>
        </div>
        {players[0]?.data_source_label.includes('Sportmonks') ? (
          <div className="relative mt-4 rounded-2xl border border-emerald-700/20 bg-emerald-950/[.055] px-4 py-3 text-sm">
            <p className="font-bold text-emerald-900">Verified {liveCompetitionLabel} market · {players.length} players live</p>
            <p className="mt-1 text-xs text-slate-600">Player identities and current squads come from Sportmonks. These are FootballIQ game prices—not real transfer values. {marketHasMoved ? 'Price movement is calculated from verified completed-fixture ratings and minutes.' : 'Opening prices stay fixed until verified ratings and minutes trigger transparent movement.'}</p>
          </div>
        ) : null}

        <div className="relative mt-3 grid gap-2 sm:grid-cols-3">
          <MarketStatus label="Market phase" value={marketHasMoved ? 'Verified movement' : 'Opening prices'} note={marketHasMoved ? 'Latest completed fixtures are priced in' : 'Trade before the first verified movement'} />
          <MarketStatus label="Movement signal" value="Rating + minutes" note="Real completed-fixture evidence only" />
          <MarketStatus label="Price protection" value="Freeze if missing" note="Never estimate or invent performance" />
        </div>

        <div className="relative mt-4 grid gap-3 rounded-2xl border border-emerald-900/10 bg-white/65 p-3 text-sm backdrop-blur sm:grid-cols-2 lg:grid-cols-6">
          <FormationPill label="GK" value={`${formation.GK}/1`} />
          <FormationPill label="DEF" value={`${formation.DEF}/4`} />
          <FormationPill label="MID" value={`${formation.MID}/3`} />
          <FormationPill label="FWD" value={`${formation.FWD}/3`} />
          <FormationPill label="Buys today" value={String(buysRemaining)} subtle="remaining" />
          <FormationPill label="Sales today" value={String(salesRemaining)} subtle="remaining" />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-7">
          <label className="lg:col-span-2">
            <span className="mb-1 block text-xs text-muted-foreground">Search</span>
            <div className="flex items-center rounded-xl border border-border bg-background px-3">
              <Search className="size-4 text-muted-foreground" />
              <input value={search} onChange={(event) => { setSearch(event.target.value); resetCatalogueWindow() }} placeholder="Player or club" className="w-full bg-transparent px-2 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2" />
            </div>
          </label>

          <FilterSelect label="Position" value={position} onChange={(value) => { setPosition(value as typeof position); resetCatalogueWindow() }} options={['ALL', 'GK', 'DEF', 'MID', 'FWD']} />
          <FilterSelect label="League" value={competition} onChange={(value) => { setCompetition(value); setClub('ALL'); resetCatalogueWindow() }} options={competitions} />
          <FilterSelect label="Club" value={club} onChange={(value) => { setClub(value); resetCatalogueWindow() }} options={clubs} />
          <FilterSelect label="Trend" value={trend} onChange={(value) => { setTrend(value as typeof trend); resetCatalogueWindow() }} options={['all', 'rising', 'falling']} />
          <FilterSelect label="Price" value={priceRange} onChange={(value) => { setPriceRange(value as typeof priceRange); resetCatalogueWindow() }} options={['all', 'low', 'mid', 'high']} />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} players</p>
          <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm">
            <ArrowUpDown className="size-4 text-muted-foreground" />
            <select value={sortKey} onChange={(event) => { setSortKey(event.target.value as SortKey); resetCatalogueWindow() }} className="bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
              <option value="value-desc">Highest value</option>
              <option value="value-asc">Lowest value</option>
              <option value="change-desc">Biggest risers</option>
              <option value="change-asc">Biggest fallers</option>
              <option value="form-desc">Strongest form</option>
              <option value="name-asc">Name A-Z</option>
            </select>
          </label>
          <button
            onClick={() => {
              setSearch('')
              setPosition('ALL')
              setCompetition('ALL')
              setClub('ALL')
              setTrend('all')
              setPriceRange('all')
              setSortKey('value-desc')
              resetCatalogueWindow()
            }}
            className="rounded-xl border border-border px-3 py-2 text-sm font-semibold"
          >
            Clear filters
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Portfolio occupancy: {holdings.length}/{MARKET_MAX_PORTFOLIO_SIZE} holdings.</p>
        {notice ? <Notice kind={notice.kind} message={notice.message} /> : null}
      </section>

      <section className="rounded-[2rem] border border-emerald-900/10 bg-emerald-950/[.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.85)] sm:p-6">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-background/60 p-5 text-sm text-muted-foreground">
            No players match these filters. Clear filters or adjust your search to find new investment options.
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visiblePlayers.map((player) => {
            const delta = player.current_value - player.previous_value
            const pct = player.previous_value > 0 ? ((delta / player.previous_value) * 100).toFixed(2) : '0.00'
            const owned = holdingsSet.has(player.id)
            const watchlisted = watchSet.has(player.id)
            const lockActive = player.is_trade_locked && (!player.trade_lock_ends_at || new Date(player.trade_lock_ends_at).getTime() > renderedAt)
            const canBuy = !owned
              && !lockActive
              && buysRemaining > 0
              && holdings.length < MARKET_MAX_PORTFOLIO_SIZE
              && availableCash >= player.current_value
              && canBuyPosition(player.position, formation)
            const stat = statsByPlayerId[player.id]
            const latestPerformance = player.matchweek_performance_history?.at(-1)
            const trendDelta = delta
            const trendPct = Number(pct)

            return (
              <article key={player.id} className="group relative overflow-hidden rounded-2xl border border-emerald-950/10 bg-gradient-to-br from-white via-white to-emerald-50/70 p-4 [contain-intrinsic-size:0_420px] [content-visibility:auto] shadow-[0_12px_35px_-30px_rgba(6,78,59,.65)] transition duration-200 hover:-translate-y-0.5 hover:border-emerald-600/35 hover:shadow-[0_22px_55px_-34px_rgba(6,78,59,.6)]">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400/80 via-teal-300/55 to-transparent" />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <MarketPlayerChip player={player} />
                    <div className="min-w-0">
                      <p className="truncate text-base font-black tracking-tight text-slate-950">{player.display_name}</p>
                      <p className="truncate text-xs font-medium text-slate-500">{player.club_name} · {player.competition_name ?? 'FootballIQ'} · {player.position}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-emerald-900/10 bg-emerald-950/[.055] px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-900">{player.position}</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <InfoCell label="Current value" value={formatFiqCompact(player.current_value)} strong />
                  <InfoCell label="Value move" value={`${trendDelta >= 0 ? '+' : ''}${formatFiqCompact(Math.abs(trendDelta))} (${trendPct >= 0 ? '+' : ''}${trendPct.toFixed(2)}%)`} tone={trendDelta >= 0 ? 'up' : 'down'} />
                  <InfoCell label="Age" value={player.age ? String(player.age) : 'N/A'} />
                  <InfoCell label="Latest minutes" value={String(latestPerformance?.minutes ?? stat?.minutes ?? 'N/A')} />
                  <InfoCell label="Rolling rating" value={latestPerformance?.rating ? latestPerformance.rating.toFixed(2) : stat?.average_rating ? stat.average_rating.toFixed(2) : 'N/A'} />
                  <InfoCell label="Role security" value={player.role_security_indicator ?? (stat?.starts && stat.starts >= 24 ? 'Secure' : 'Rotation')} />
                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                  {player.decision_support_note ?? 'Use recent movement and minutes profile to assess whether this player is undervalued.'}
                </p>

                <div className="mt-3 rounded-xl border border-emerald-900/10 bg-emerald-950/[.04] px-3 py-2">
                  <p className="mb-2 text-[10px] uppercase tracking-[.18em] text-muted-foreground">Recorded value movement</p>
                  <Sparkline points={[player.previous_value, player.current_value]} positive={trendDelta >= 0} />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => setTradeIntent({ action: 'buy', player })}
                    disabled={!canBuy || busyId !== null}
                    className="min-h-11 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-45"
                  >
                    {busyId === player.id ? 'Processing…' : owned ? 'Held' : !canBuyPosition(player.position, formation) ? `${player.position} slot full` : availableCash < player.current_value ? 'Not enough cash' : buysRemaining <= 0 ? 'Buy limit reached' : 'Buy'}
                  </button>
                  <button
                    onClick={() => setTradeIntent({ action: 'sell', player })}
                    disabled={!owned || salesRemaining <= 0 || lockActive || busyId !== null}
                    className="min-h-11 rounded-xl border border-border px-3 py-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-45"
                  >
                    {busyId === player.id ? 'Processing…' : 'Sell'}
                  </button>
                  <button
                    onClick={() => void handleWatchlist(player)}
                    disabled={busyId !== null}
                    className="min-h-11 rounded-xl border border-border px-3 py-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-45"
                  >
                    {watchlisted ? 'Unwatch' : 'Watch'}
                  </button>
                  <Link aria-label={`Open ${player.display_name}'s player card`} href={`/market/player/${encodeURIComponent(player.slug)}`} className="inline-flex min-h-11 items-center rounded-xl border border-border px-3 py-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">Open card</Link>
                </div>

                {!canBuy && !owned ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {lockActive
                      ? 'Trading is temporarily locked for this player.'
                      : holdings.length >= MARKET_MAX_PORTFOLIO_SIZE
                        ? 'Your 11-player portfolio is full. Sell before buying.'
                        : !canBuyPosition(player.position, formation)
                          ? `Formation slot limit reached for ${player.position}.`
                          : availableCash < player.current_value
                            ? 'Insufficient cash for this purchase.'
                          : buysRemaining <= 0
                            ? 'Daily buy limit reached.'
                            : 'Not available for buy right now.'}
                  </p>
                ) : null}
              </article>
            )
          })}
        </div>
        {visibleCount < filtered.length ? (
          <div className="mt-6 flex flex-col items-center gap-2 border-t border-emerald-950/10 pt-5">
            <button
              type="button"
              onClick={() => setVisibleCount((count) => Math.min(count + PLAYER_PAGE_SIZE, filtered.length))}
              className="rounded-xl bg-emerald-900 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            >
              Show 36 more players
            </button>
            <p className="text-xs text-slate-500">{filtered.length - visibleCount} more available in this result</p>
          </div>
        ) : null}
      </section>
      {tradeIntent ? (
        <MarketTradeDialog
          action={tradeIntent.action}
          playerName={tradeIntent.player.display_name}
          details={tradeIntent.action === 'buy'
            ? [
                { label: 'Current value', value: formatFiqCompact(tradeIntent.player.current_value) },
                { label: 'Available cash', value: formatFiqCompact(availableCash) },
                { label: 'Cash after purchase', value: formatFiqCompact(availableCash - tradeIntent.player.current_value) },
                { label: 'Position slot', value: tradeIntent.player.position },
              ]
            : [
                { label: 'Purchase price', value: formatFiqCompact(holdings.find((row) => row.player_id === tradeIntent.player.id)?.acquisition_value ?? tradeIntent.player.current_value) },
                { label: 'Current value', value: formatFiqCompact(tradeIntent.player.current_value) },
                { label: 'Position reopened', value: tradeIntent.player.position },
              ]}
          onCancel={() => setTradeIntent(null)}
          onConfirm={() => {
            const intent = tradeIntent
            setTradeIntent(null)
            if (intent.action === 'buy') void handleBuy(intent.player)
            else void handleSell(intent.player)
          }}
        />
      ) : null}
    </div>
  )
}

function Sparkline({ points, positive }: { points: number[]; positive: boolean }) {
  const min = Math.min(...points)
  const max = Math.max(...points)
  const spread = Math.max(1, max - min)

  return (
    <div className="flex h-10 items-end gap-1">
      {points.slice(-12).map((point, index) => {
        const height = Math.max(5, ((point - min) / spread) * 100)
        return <span key={`${point}-${index}`} className={`block w-full rounded-t ${positive ? 'bg-primary/75' : 'bg-destructive/65'}`} style={{ height: `${height}%` }} />
      })}
    </div>
  )
}

function InfoCell({ label, value, strong = false, tone = 'default' }: { label: string; value: string; strong?: boolean; tone?: 'default' | 'up' | 'down' }) {
  const color = tone === 'up' ? 'text-primary' : tone === 'down' ? 'text-destructive' : 'text-foreground'
  return (
    <div className="rounded-lg border border-emerald-950/[.08] bg-white/75 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,.8)]">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 ${strong ? 'font-semibold' : ''} ${color}`}>{value}</p>
    </div>
  )
}

function FormationPill({ label, value, subtle }: { label: string; value: string; subtle?: string }) {
  return (
    <div className="rounded-xl border border-emerald-950/10 bg-white/75 px-3 py-2 shadow-sm">
      <p className="text-[10px] uppercase tracking-[.15em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-primary">{value}{subtle ? <span className="ml-1 text-[10px] font-medium text-muted-foreground">{subtle}</span> : null}</p>
    </div>
  )
}

function MarketStatus({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-emerald-950/[.08] bg-white/55 px-3 py-2.5 backdrop-blur">
      <p className="text-[9px] font-bold uppercase tracking-[.16em] text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-black text-slate-900">{value}</p>
      <p className="mt-0.5 text-[10px] leading-snug text-slate-500">{note}</p>
    </div>
  )
}

function Notice({ kind, message }: { kind: 'success' | 'error' | 'info'; message: string }) {
  const className = kind === 'success'
    ? 'border-primary/35 bg-primary/10 text-primary'
    : kind === 'error'
      ? 'border-destructive/35 bg-destructive/10 text-destructive'
      : 'border-border bg-background/60 text-muted-foreground'
  const icon: ReactNode = kind === 'success'
    ? <Star className="size-3.5" />
    : kind === 'error'
      ? <Shield className="size-3.5" />
      : <Clock3 className="size-3.5" />
  return <p className={`mt-3 inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${className}`}>{icon}{message}</p>
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label>
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}
