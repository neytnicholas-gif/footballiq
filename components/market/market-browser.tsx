'use client'

import Link from 'next/link'
import { useDeferredValue, useMemo, useState } from 'react'
import { ArrowUpDown, FilterX, Search } from 'lucide-react'
import { formatMinorToMoney, formatSignedMinor } from '@/lib/market/decimal'
import { filterAndSortPlayers, type MarketFilters } from '@/lib/market/filters'
import { MARKET_RULES } from '@/lib/market/settings'
import type { AvailabilityFilter, MarketPlayerView, OwnershipFilter, PositionGroup } from '@/lib/market/types'
import { ClubShirtIcon } from '@/components/market/club-shirt-icon'

type MarketBrowserProps = {
  rows: MarketPlayerView[]
  clubs: Array<{ slug: string; name: string }>
  ownedPlayerIds: string[]
}

const sortOptions: Array<{ value: MarketFilters['sort']; label: string }> = [
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'club-asc', label: 'Club (A-Z)' },
  { value: 'price-desc', label: 'Highest value' },
  { value: 'price-asc', label: 'Lowest value' },
  { value: 'movement-desc', label: 'Biggest risers' },
  { value: 'movement-asc', label: 'Biggest fallers' },
]

const PAGE_SIZE = 24

export function MarketBrowser({ rows, clubs, ownedPlayerIds }: MarketBrowserProps) {
  const [search, setSearch] = useState('')
  const [club, setClub] = useState<string>('ALL')
  const [position, setPosition] = useState<PositionGroup | 'ALL'>('ALL')
  const [sort, setSort] = useState<MarketFilters['sort']>('alphabetical')
  const [availability, setAvailability] = useState<AvailabilityFilter>('ALL')
  const [ownership, setOwnership] = useState<OwnershipFilter>('ALL')
  const [page, setPage] = useState(1)

  const ownedSet = useMemo(() => new Set(ownedPlayerIds), [ownedPlayerIds])
  const deferredSearch = useDeferredValue(search)

  const filtered = useMemo(
    () =>
      filterAndSortPlayers(rows, {
        search: deferredSearch,
        club,
        position,
        sort,
        availability,
        ownership,
        ownedPlayerIds: ownedSet,
      }),
    [rows, deferredSearch, club, position, sort, availability, ownership, ownedSet],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const activePage = Math.min(page, totalPages)
  const startIndex = (activePage - 1) * PAGE_SIZE
  const pageRows = filtered.slice(startIndex, startIndex + PAGE_SIZE)

  const hasFilters =
    search.length > 0 ||
    club !== 'ALL' ||
    position !== 'ALL' ||
    sort !== 'alphabetical' ||
    availability !== 'ALL' ||
    ownership !== 'ALL'

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Approved catalogue</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Player identities come from the validated active catalogue. Values are original FootballIQ calculations.
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-4 sm:p-6">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
          <label className="lg:col-span-2">
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Player name</span>
            <div className="flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-3">
              <Search className="size-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Search player"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </label>

          <label>
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Club</span>
            <select
              value={club}
              onChange={(event) => {
                setClub(event.target.value)
                setPage(1)
              }}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
            >
              <option value="ALL">All clubs</option>
              {clubs.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Position</span>
            <select
              value={position}
              onChange={(event) => {
                setPosition(event.target.value as PositionGroup | 'ALL')
                setPage(1)
              }}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
            >
              <option value="ALL">All positions</option>
              <option value="GK">Goalkeeper</option>
              <option value="DEF">Defender</option>
              <option value="MID">Midfielder</option>
              <option value="FWD">Forward</option>
            </select>
          </label>

          <label>
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Sort</span>
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as MarketFilters['sort'])
                setPage(1)
              }}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Visibility</span>
            <select
              value={availability}
              onChange={(event) => {
                setAvailability(event.target.value as AvailabilityFilter)
                setPage(1)
              }}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
            >
              <option value="ALL">All players</option>
              <option value="AVAILABLE_ONLY">Available only</option>
            </select>
          </label>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label>
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Ownership</span>
            <select
              value={ownership}
              onChange={(event) => {
                setOwnership(event.target.value as OwnershipFilter)
                setPage(1)
              }}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
            >
              <option value="ALL">All ownership states</option>
              <option value="OWNED_ONLY">Owned only</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
            <ArrowUpDown className="size-3.5" />
            {filtered.length} players
          </span>
          {search !== deferredSearch && (
            <span role="status" aria-live="polite" className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
              Filtering...
            </span>
          )}
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setClub('ALL')
                setPosition('ALL')
                setSort('alphabetical')
                setAvailability('ALL')
                setOwnership('ALL')
                setPage(1)
              }}
              className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-background"
            >
              <FilterX className="size-3.5" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-8 text-center">
          <p className="font-semibold">Market data unavailable</p>
          <p className="mt-2 text-sm text-muted-foreground">
            No player records are available right now. Try again after importing season data.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-8 text-center">
          <p className="font-semibold">No players match your filters</p>
          <p className="mt-2 text-sm text-muted-foreground">Adjust your filter selections.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {pageRows.map((row) => {
            const isOwned = ownedSet.has(row.player.id)
            return (
              <article
                key={row.player.id}
                className="min-w-0 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/45"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <ClubShirtIcon
                      primaryColour={row.club.primaryColour}
                      secondaryColour={row.club.secondaryColour}
                      label={row.club.shortName}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{row.player.displayName}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {row.club.shortName} - {row.player.positionGroup} - {row.player.detailedPosition}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold">
                      {formatMinorToMoney(row.player.currentPriceMinor)} {MARKET_RULES.fiqCurrencyLabel}
                    </p>
                    <p
                      className={`text-sm ${
                        row.latestMovementMinor > 0
                          ? 'text-emerald-300'
                          : row.latestMovementMinor < 0
                            ? 'text-rose-300'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {formatSignedMinor(row.latestMovementMinor)}
                    </p>
                    <div className="mt-1 flex justify-end gap-2 text-xs">
                      <span className={row.player.isAvailable ? 'text-emerald-300' : 'text-amber-300'}>
                        {row.player.isAvailable ? 'Available' : row.player.availabilityStatus}
                      </span>
                      {isOwned && <span className="text-primary">Owned</span>}
                    </div>
                    <div className="mt-2 flex justify-end">
                      <Link
                        href={`/market/player/${row.player.slug}`}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          isOwned
                            ? 'border border-border text-muted-foreground'
                            : row.player.isAvailable
                              ? 'bg-primary text-primary-foreground'
                              : 'border border-border text-muted-foreground'
                        }`}
                      >
                        View player
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}

            <div className="mt-2 min-w-0 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
              <p className="text-muted-foreground">
                Showing {pageRows.length === 0 ? 0 : startIndex + 1}-{startIndex + pageRows.length} of {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={activePage <= 1}
                  onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs text-muted-foreground">
                  Page {activePage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={activePage >= totalPages}
                  onClick={() => setPage((previous) => Math.min(totalPages, previous + 1))}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
        </div>
      )}
    </div>
  )
}
