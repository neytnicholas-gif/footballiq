'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { buyMarketPlayerAction, sellMarketPlayerAction } from '@/app/market/actions'
import { formatMinorToMoney, formatSignedMinor } from '@/lib/market/decimal'
import { MARKET_COPY, MARKET_RULES } from '@/lib/market/settings'
import type { MarketPlayerProfileView } from '@/lib/market/types'
import { ClubShirtIcon } from '@/components/market/club-shirt-icon'

const ACTION_TIMEOUT_MS = 12000

function withActionTimeout<T>(action: Promise<T>, timeoutMs: number = ACTION_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('REQUEST_TIMEOUT'))
    }, timeoutMs)

    action
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((error: unknown) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

type PlayerDetailPanelProps = {
  row: MarketPlayerProfileView
  authRequired: boolean
  owned: boolean
}

export function PlayerDetailPanel({ row, authRequired, owned }: PlayerDetailPanelProps) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [confirmMode, setConfirmMode] = useState<'buy' | 'sell' | null>(null)
  const [localOwned, setLocalOwned] = useState(owned)
  const [isPending, startTransition] = useTransition()
  const buyRequestIdRef = useRef<string | null>(null)
  const sellRequestIdRef = useRef<string | null>(null)

  const movement = row.player.currentPriceMinor - row.player.initialPriceMinor

  const bankView = useMemo(() => {
    const bank = row.player.performanceBankMilli / 1000
    const direction = bank >= 0 ? 'increase' : 'decrease'
    const gapToStep = bank >= 0 ? 1 - bank : 1 - Math.abs(bank)
    return {
      bank,
      direction,
      gapToStep,
    }
  }, [row.player.performanceBankMilli])

  async function executeBuy() {
    setMessage('')
    setLocalOwned(true)
    startTransition(async () => {
      if (!buyRequestIdRef.current) {
        buyRequestIdRef.current = `buy:${row.player.id}:${crypto.randomUUID()}`
      }
      try {
        const result = await withActionTimeout(
          buyMarketPlayerAction(row.player.id, buyRequestIdRef.current),
        )
        if (!result.ok) {
          setLocalOwned(false)
          setMessage(result.message)
          buyRequestIdRef.current = null
          return
        }
        setMessage('Purchase completed. Open portfolio to review the update.')
        buyRequestIdRef.current = null
        router.refresh()
      } catch {
        setLocalOwned(false)
        setMessage('Transaction timed out. Retry will safely reuse the same request.')
      }
    })
  }

  async function executeSell() {
    setMessage('')
    setLocalOwned(false)
    startTransition(async () => {
      if (!sellRequestIdRef.current) {
        sellRequestIdRef.current = `sell:${row.player.id}:${crypto.randomUUID()}`
      }
      try {
        const result = await withActionTimeout(
          sellMarketPlayerAction(row.player.id, sellRequestIdRef.current),
        )
        if (!result.ok) {
          setLocalOwned(true)
          setMessage(result.message)
          sellRequestIdRef.current = null
          return
        }
        setMessage('Sale completed. Open portfolio to review the update.')
        sellRequestIdRef.current = null
        router.refresh()
      } catch {
        setLocalOwned(true)
        setMessage('Transaction timed out. Retry will safely reuse the same request.')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <ClubShirtIcon
              primaryColour={row.club.primaryColour}
              secondaryColour={row.club.secondaryColour}
              label={row.club.shortName}
            />
            <div>
              <p className="text-xs uppercase tracking-[.22em] text-primary">Player profile</p>
              <h1 className="mt-1 text-3xl font-bold">{row.player.fullName}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {row.club.name} - {row.player.positionGroup} - {row.player.detailedPosition}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Current value</p>
            <p className="mt-1 text-2xl font-bold">
              {formatMinorToMoney(row.player.currentPriceMinor)} {MARKET_RULES.fiqCurrencyLabel}
            </p>
            <p className={movement >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
              Weekly change {formatSignedMinor(row.weeklyChangeMinor)}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Current value" value={`${formatMinorToMoney(row.player.currentPriceMinor)} FIQ`} />
          <Metric label="Total movement" value={formatSignedMinor(movement)} />
          <Metric
            label="Performance bank"
            value={`${bankView.bank >= 0 ? '+' : ''}${bankView.bank.toFixed(1)}`}
          />
          <Metric label="Last updated" value={new Date(row.lastUpdatedAt).toLocaleString()} />
          <Metric label="Ownership" value={localOwned ? 'Owned in portfolio' : 'Not owned'} />
          <Metric label="Ownership %" value={`${row.ownershipPercentage.toFixed(1)}% (${row.ownershipCount})`} />
          <Metric label="Availability" value={row.player.isAvailable ? 'Tradable' : row.player.availabilityStatus} />
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Valuation explanation</p>
          <p className="mt-2">
            Values move in deterministic 0.1 FIQ steps from a 7.0 baseline, with performance-bank carryover and
            weekly caps to reduce unstable swings.
          </p>
          <p className="mt-2">
            Current Bank: {bankView.bank >= 0 ? '+' : ''}{bankView.bank.toFixed(1)}
          </p>
          <p className="mt-1">
            Next {bankView.direction}: {bankView.direction === 'increase' ? '+' : '-'}{bankView.gapToStep.toFixed(1)} required
          </p>
          <p className="mt-2">{MARKET_COPY.noCashValue}</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {authRequired ? (
            <p className="text-sm text-muted-foreground">Sign in to buy or sell this player.</p>
          ) : localOwned ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => setConfirmMode('sell')}
              className="rounded-xl border border-border px-5 py-3 font-semibold hover:bg-background disabled:opacity-60"
            >
              Sell player
            </button>
          ) : (
            <button
              type="button"
              disabled={isPending || !row.player.isAvailable}
              onClick={() => setConfirmMode('buy')}
              className="rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-60"
            >
              Buy player
            </button>
          )}
        </div>

        {message && <p role="status" aria-live="polite" className="mt-4 text-sm text-muted-foreground">{message}</p>}
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Price graph</h2>
        <PriceGraph
          points={buildHistorySeries(row.priceHistory, row.player.currentPriceMinor, row.weeklyChangeMinor)}
        />
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Season stats</h2>
        {!row.seasonStats.hasCompetitiveStats ? (
          <p className="mt-2 text-sm text-muted-foreground">No competitive statistics recorded yet.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <p>Matches: {row.seasonStats.matchesPlayed}</p>
            <p>Starts: {row.seasonStats.starts}</p>
            <p>Minutes: {row.seasonStats.minutesPlayed}</p>
            <p>Goals: {row.seasonStats.goals}</p>
            <p>Assists: {row.seasonStats.assists}</p>
            <p>Clean sheets: {row.seasonStats.cleanSheets}</p>
            <p>Yellow cards: {row.seasonStats.yellowCards}</p>
            <p>Red cards: {row.seasonStats.redCards}</p>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Recent matches</h2>
        {row.recentMatches.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No competitive statistics recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {row.recentMatches.map((match) => (
              <li key={match.id} className="rounded-xl border border-border bg-background/60 px-3 py-2">
                {new Date(match.fixtureDate).toLocaleDateString()} - Minutes {match.minutesPlayed} - Rating{' '}
                {typeof match.providerRatingMilli === 'number'
                  ? (match.providerRatingMilli / 1000).toFixed(1)
                  : 'n/a'}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Valuation history</h2>
        {row.valuationHistory.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No valuation events recorded yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Old value</th>
                  <th className="px-2 py-2">New value</th>
                  <th className="px-2 py-2">Rating</th>
                  <th className="px-2 py-2">Bank before</th>
                  <th className="px-2 py-2">Bank after</th>
                  <th className="px-2 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {row.valuationHistory.map((event) => (
                  <tr key={event.id} className="border-b border-border/60">
                    <td className="px-2 py-2">{new Date(event.effectiveAt).toLocaleDateString()}</td>
                    <td className="px-2 py-2">{formatMinorToMoney(event.previousPriceMinor)} FIQ</td>
                    <td className="px-2 py-2">{formatMinorToMoney(event.newPriceMinor)} FIQ</td>
                    <td className="px-2 py-2">
                      {typeof event.ratingMilli === 'number' ? (event.ratingMilli / 1000).toFixed(1) : 'n/a'}
                    </td>
                    <td className="px-2 py-2">{(event.previousBankMilli / 1000).toFixed(1)}</td>
                    <td className="px-2 py-2">{(event.bankAfterEventMilli / 1000).toFixed(1)}</td>
                    <td className="px-2 py-2">{event.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Transaction history</h2>
        {row.transactionHistory.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No transactions recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {row.transactionHistory.map((item) => (
              <li key={item.id} className="rounded-xl border border-border bg-background/60 px-3 py-2">
                {new Date(item.createdAt).toLocaleString()} - {item.username} - {item.transactionType.toUpperCase()} -{' '}
                {formatMinorToMoney(item.executedPriceMinor)} FIQ
              </li>
            ))}
          </ul>
        )}
      </div>

      {confirmMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5">
            <h3 className="text-lg font-semibold">Confirm {confirmMode}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Transaction executes at server-authoritative price and checks daily limits and ownership rules.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmMode(null)}
                className="flex-1 rounded-xl border border-border px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={async () => {
                  const mode = confirmMode
                  setConfirmMode(null)
                  if (mode === 'buy') await executeBuy()
                  if (mode === 'sell') await executeSell()
                }}
                className="flex-1 rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-60"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 px-3 py-2">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  )
}

function PriceGraph({ points }: { points: Array<{ date: string; valueMinor: number; reason: string }> }) {
  if (points.length === 0) {
    return <p className="mt-2 text-sm text-muted-foreground">No valuation events recorded yet.</p>
  }

  const width = 760
  const height = 220
  const padding = 28
  const values = points.map((point) => point.valueMinor)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const span = Math.max(maxValue - minValue, 1)

  const coords = points.map((point, index) => {
    const x = padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2)
    const normalized = (point.valueMinor - minValue) / span
    const y = height - padding - normalized * (height - padding * 2)
    return { x, y, point }
  })

  const path = coords.map((coord, index) => `${index === 0 ? 'M' : 'L'} ${coord.x} ${coord.y}`).join(' ')

  return (
    <div className="mt-3 overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[640px]">
        <rect x="0" y="0" width={width} height={height} rx="18" className="fill-background/70" />
        <path d={path} fill="none" stroke="currentColor" strokeWidth="3" className="text-primary" />
        {coords.map((coord) => (
          <g key={`${coord.point.date}-${coord.point.valueMinor}`}>
            <circle cx={coord.x} cy={coord.y} r="4" className="fill-primary" />
            <title>{`${coord.point.date.slice(0, 10)} - ${formatMinorToMoney(coord.point.valueMinor)} FIQ - ${coord.point.reason}`}</title>
          </g>
        ))}
      </svg>
    </div>
  )
}

function buildHistorySeries(
  points: Array<{ date: string; valueMinor: number; reason: string }>,
  currentValueMinor: number,
  weeklyChangeMinor: number,
): Array<{ date: string; valueMinor: number; reason: string }> {
  if (points.length >= 2) {
    return points
  }

  const now = new Date()
  const generated = Array.from({ length: 6 }).map((_, index) => {
    const reversed = 5 - index
    const date = new Date(now)
    date.setDate(now.getDate() - reversed * 7)

    const trendOffset = Math.trunc((weeklyChangeMinor / 5) * reversed)
    const valueMinor = Math.max(0, currentValueMinor - trendOffset)

    return {
      date: date.toISOString(),
      valueMinor,
      reason: 'Development trend placeholder',
    }
  })

  return generated
}
