'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowUpDown, Search } from 'lucide-react'
import { MarketPlayerChip } from '@/components/market/market-player-chip'
import { formatFiqCompact } from '@/lib/market/format'
import type { MarketHolding, MarketPlayer } from '@/lib/market/types'

type SortKey = 'value-desc' | 'value-asc' | 'change-desc' | 'change-asc' | 'name-asc'

export function PlayerMarketBrowser({ players, holdings, watchlist }: { players: MarketPlayer[]; holdings: MarketHolding[]; watchlist: number[] }) {
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState<'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD'>('ALL')
  const [club, setClub] = useState('ALL')
  const [trend, setTrend] = useState<'all' | 'rising' | 'falling'>('all')
  const [priceRange, setPriceRange] = useState<'all' | 'low' | 'mid' | 'high'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('value-desc')

  const clubs = useMemo(() => ['ALL', ...new Set(players.map((player) => player.club_name))], [players])
  const holdingsSet = useMemo(() => new Set(holdings.map((item) => item.player_id)), [holdings])
  const watchSet = useMemo(() => new Set(watchlist), [watchlist])

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
        case 'name-asc':
          return a.display_name.localeCompare(b.display_name)
        case 'value-desc':
        default:
          return b.current_value - a.current_value
      }
    })

    return rows
  }, [players, search, position, club, trend, priceRange, sortKey])

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-border bg-card p-5 sm:p-7">
        <h1 className="text-3xl font-black sm:text-4xl">Player marketplace</h1>
        <p className="mt-2 text-sm text-muted-foreground">Search and filter by position, club text, value range and movement trend.</p>
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
              <option value="name-asc">Name A-Z</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-[2rem] border border-border bg-card p-4 sm:p-6">
        <div className="grid gap-3">
          {filtered.map((player) => {
            const delta = player.current_value - player.previous_value
            const pct = player.previous_value > 0 ? ((delta / player.previous_value) * 100).toFixed(2) : '0.00'
            const owned = holdingsSet.has(player.id)
            const watchlisted = watchSet.has(player.id)
            const lockActive = player.is_trade_locked && (!player.trade_lock_ends_at || new Date(player.trade_lock_ends_at).getTime() > Date.now())

            return (
              <Link key={player.id} href={`/market/player/${encodeURIComponent(player.slug)}`} className="grid grid-cols-[1fr_auto] gap-3 rounded-2xl border border-border bg-background/70 p-3 transition hover:border-primary/45 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <MarketPlayerChip player={player} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{player.display_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{player.club_name} · {player.position}</p>
                  </div>
                </div>
                <p className="text-right text-sm font-semibold text-primary">{formatFiqCompact(player.current_value)}</p>
                <p className={`text-right text-xs ${delta >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {delta >= 0 ? '+' : ''}{formatFiqCompact(Math.abs(delta))} ({delta >= 0 ? '+' : ''}{pct}%)
                </p>
                <p className="text-right text-xs text-muted-foreground">{lockActive ? 'Trade locked' : owned ? 'Owned' : watchlisted ? 'Watchlisted' : 'Open card'}</p>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
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
