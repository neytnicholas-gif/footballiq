'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowUpDown, Clock3, Search, Shield, Star } from 'lucide-react'
import { MarketPlayerChip } from '@/components/market/market-player-chip'
import { buyMarketPlayer, sellMarketPlayer, toggleMarketWatchlist } from '@/lib/market/client'
import { simulateMarketCards } from '@/lib/market/engine'
import { canBuyPosition, countFormation } from '@/lib/market/formation'
import { formatFiqCompact, MARKET_MAX_PORTFOLIO_SIZE } from '@/lib/market/format'
import type { MarketHolding, MarketPlayer, MarketSeasonStats } from '@/lib/market/types'

type SortKey = 'value-desc' | 'value-asc' | 'change-desc' | 'change-asc' | 'form-desc' | 'name-asc'

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
  const [club, setClub] = useState('ALL')
  const [trend, setTrend] = useState<'all' | 'rising' | 'falling'>('all')
  const [priceRange, setPriceRange] = useState<'all' | 'low' | 'mid' | 'high'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('value-desc')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [notice, setNotice] = useState<{ kind: 'success' | 'error' | 'info'; message: string } | null>(null)

  const clubs = useMemo(() => ['ALL', ...new Set(players.map((player) => player.club_name))], [players])
  const holdingsSet = useMemo(() => new Set(holdings.map((item) => item.player_id)), [holdings])
  const watchSet = useMemo(() => new Set(watchlist), [watchlist])
  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players])
  const formation = useMemo(() => countFormation(holdings, playersById), [holdings, playersById])
  const statsMap = useMemo(
    () => new Map<number, MarketSeasonStats | undefined>(Object.entries(statsByPlayerId).map(([id, row]) => [Number(id), row])),
    [statsByPlayerId],
  )
  const simByPlayer = useMemo(() => simulateMarketCards(players, statsMap), [players, statsMap])

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
  }, [players, search, position, club, trend, priceRange, sortKey])

  async function handleBuy(player: MarketPlayer) {
    setBusyId(player.id)
    setNotice(null)
    const { data, error } = await buyMarketPlayer(player.slug)
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
    const { data, error } = await sellMarketPlayer(player.slug)
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
    const { data, error } = await toggleMarketWatchlist(player.slug)
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
      <section className="rounded-[2rem] border border-border bg-card p-5 sm:p-7">
        <h1 className="text-3xl font-black sm:text-4xl">Player market</h1>
        <p className="mt-2 text-sm text-muted-foreground">Build your 11-player investment portfolio. Every card shows value movement, form context and role security.</p>

        <div className="mt-4 grid gap-3 rounded-2xl border border-border bg-background/60 p-3 text-sm sm:grid-cols-2 lg:grid-cols-6">
          <FormationPill label="GK" value={`${formation.GK}/1`} />
          <FormationPill label="DEF" value={`${formation.DEF}/4`} />
          <FormationPill label="MID" value={`${formation.MID}/3`} />
          <FormationPill label="FWD" value={`${formation.FWD}/3`} />
          <FormationPill label="Buys today" value={String(buysRemaining)} subtle="remaining" />
          <FormationPill label="Sales today" value={String(salesRemaining)} subtle="remaining" />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-6">
          <label className="lg:col-span-2">
            <span className="mb-1 block text-xs text-muted-foreground">Search</span>
            <div className="flex items-center rounded-xl border border-border bg-background px-3">
              <Search className="size-4 text-muted-foreground" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Player or club" className="w-full bg-transparent px-2 py-2 text-sm outline-none" />
            </div>
          </label>

          <FilterSelect label="Position" value={position} onChange={setPosition} options={['ALL', 'GK', 'DEF', 'MID', 'FWD']} />
          <FilterSelect label="Club" value={club} onChange={setClub} options={clubs} />
          <FilterSelect label="Trend" value={trend} onChange={setTrend} options={['all', 'rising', 'falling']} />
          <FilterSelect label="Price" value={priceRange} onChange={setPriceRange} options={['all', 'low', 'mid', 'high']} />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{filtered.length} players shown</p>
          <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm">
            <ArrowUpDown className="size-4 text-muted-foreground" />
            <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)} className="bg-transparent outline-none">
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
              setClub('ALL')
              setTrend('all')
              setPriceRange('all')
              setSortKey('value-desc')
            }}
            className="rounded-xl border border-border px-3 py-2 text-sm font-semibold"
          >
            Clear filters
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Portfolio occupancy: {holdings.length}/{MARKET_MAX_PORTFOLIO_SIZE} holdings.</p>
        {notice ? <Notice kind={notice.kind} message={notice.message} /> : null}
      </section>

      <section className="rounded-[2rem] border border-border bg-card p-4 sm:p-6">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-background/60 p-5 text-sm text-muted-foreground">
            No players match these filters. Clear filters or adjust your search to find new investment options.
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((player) => {
            const delta = player.current_value - player.previous_value
            const pct = player.previous_value > 0 ? ((delta / player.previous_value) * 100).toFixed(2) : '0.00'
            const owned = holdingsSet.has(player.id)
            const watchlisted = watchSet.has(player.id)
            const lockActive = player.is_trade_locked && (!player.trade_lock_ends_at || new Date(player.trade_lock_ends_at).getTime() > Date.now())
            const canBuy = !owned
              && !lockActive
              && buysRemaining > 0
              && holdings.length < MARKET_MAX_PORTFOLIO_SIZE
              && availableCash >= player.current_value
              && canBuyPosition(player.position, formation)
            const stat = statsByPlayerId[player.id]
            const sim = simByPlayer.get(player.id)
            const trendDelta = sim?.trendDelta ?? delta
            const trendPct = sim?.trendPct ?? Number(pct)

            return (
              <article key={player.id} className="group rounded-2xl border border-border bg-background/70 p-4 transition hover:border-primary/45 hover:shadow-[0_18px_50px_-38px_rgba(83,240,166,.95)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <MarketPlayerChip player={player} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{player.display_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{player.club_name} · {player.position}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{player.position}</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <InfoCell label="Current value" value={formatFiqCompact(player.current_value)} strong />
                  <InfoCell label="Value move" value={`${trendDelta >= 0 ? '+' : ''}${formatFiqCompact(Math.abs(trendDelta))} (${trendPct >= 0 ? '+' : ''}${trendPct.toFixed(2)}%)`} tone={trendDelta >= 0 ? 'up' : 'down'} />
                  <InfoCell label="Age" value={player.age ? String(player.age) : 'N/A'} />
                  <InfoCell label="Minutes" value={String(stat?.minutes ?? 'N/A')} />
                  <InfoCell label="Recent rating" value={stat?.average_rating ? stat.average_rating.toFixed(2) : 'N/A'} />
                  <InfoCell label="Role security" value={player.role_security_indicator ?? (stat?.starts && stat.starts >= 24 ? 'Secure' : 'Rotation')} />
                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                  {player.decision_support_note ?? 'Use recent movement and minutes profile to assess whether this player is undervalued.'}
                </p>

                <div className="mt-3 rounded-xl border border-border bg-card/50 px-3 py-2">
                  <p className="mb-2 text-[10px] uppercase tracking-[.18em] text-muted-foreground">Momentum sparkline</p>
                  <Sparkline points={sim?.sparkline.map((point) => point.value) ?? [player.previous_value, player.current_value]} positive={trendDelta >= 0} />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const after = availableCash - player.current_value
                      const confirmed = window.confirm(
                        `Buy ${player.display_name}?\n\nCurrent value: ${formatFiqCompact(player.current_value)}\nAvailable cash before purchase: ${formatFiqCompact(availableCash)}\nExpected cash after purchase: ${formatFiqCompact(after)}\nPosition slot: ${player.position}`,
                      )
                      if (confirmed) void handleBuy(player)
                    }}
                    disabled={!canBuy || busyId !== null}
                    className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-45"
                  >
                    {busyId === player.id ? 'Processing…' : owned ? 'Held' : !canBuyPosition(player.position, formation) ? `${player.position} slot full` : availableCash < player.current_value ? 'Not enough cash' : buysRemaining <= 0 ? 'Buy limit reached' : 'Buy'}
                  </button>
                  <button
                    onClick={() => {
                      const confirmed = window.confirm(
                        `Sell ${player.display_name}?\n\nPurchase price: ${owned ? formatFiqCompact(holdings.find((row) => row.player_id === player.id)?.acquisition_value ?? player.current_value) : 'N/A'}\nCurrent value: ${formatFiqCompact(player.current_value)}\nThis action will return cash immediately and reopen the ${player.position} slot.`,
                      )
                      if (confirmed) void handleSell(player)
                    }}
                    disabled={!owned || salesRemaining <= 0 || lockActive || busyId !== null}
                    className="rounded-xl border border-border px-3 py-2 text-xs font-semibold disabled:opacity-45"
                  >
                    {busyId === player.id ? 'Processing…' : 'Sell'}
                  </button>
                  <button
                    onClick={() => void handleWatchlist(player)}
                    disabled={busyId !== null}
                    className="rounded-xl border border-border px-3 py-2 text-xs font-semibold disabled:opacity-45"
                  >
                    {watchlisted ? 'Unwatch' : 'Watch'}
                  </button>
                  <Link href={`/market/player/${encodeURIComponent(player.slug)}`} className="rounded-xl border border-border px-3 py-2 text-xs font-semibold">Open card</Link>
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
      </section>
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
    <div className="rounded-lg border border-border bg-card/35 p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 ${strong ? 'font-semibold' : ''} ${color}`}>{value}</p>
    </div>
  )
}

function FormationPill({ label, value, subtle }: { label: string; value: string; subtle?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/55 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[.15em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-primary">{value}{subtle ? <span className="ml-1 text-[10px] font-medium text-muted-foreground">{subtle}</span> : null}</p>
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

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: any) => void; options: string[] }) {
  return (
    <label>
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}
