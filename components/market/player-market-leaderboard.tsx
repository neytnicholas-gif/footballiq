'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Crown, TrendingUp } from 'lucide-react'
import type { MarketLeaderboardRow } from '@/lib/market/types'
import { formatFiqCompact } from '@/lib/market/format'

type Board = 'daily_gain' | 'weekly_gain' | 'monthly_gain' | 'season_gain' | 'all_time_gain' | 'total_account_value'

const options: Array<{ id: Board; label: string; returnKey: keyof MarketLeaderboardRow }> = [
  { id: 'daily_gain', label: 'Daily gain', returnKey: 'daily_return_pct' },
  { id: 'weekly_gain', label: 'Weekly gain', returnKey: 'weekly_return_pct' },
  { id: 'monthly_gain', label: 'Monthly gain', returnKey: 'monthly_return_pct' },
  { id: 'season_gain', label: 'Season gain', returnKey: 'season_return_pct' },
  { id: 'all_time_gain', label: 'All-time gain', returnKey: 'all_time_return_pct' },
  { id: 'total_account_value', label: 'Total account value', returnKey: 'all_time_return_pct' },
]

export function PlayerMarketLeaderboard({ rows }: { rows: MarketLeaderboardRow[] }) {
  const [board, setBoard] = useState<Board>('daily_gain')
  const currentMeta = options.find((item) => item.id === board) ?? options[0]

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => (Number(b[board]) || 0) - (Number(a[board]) || 0)).slice(0, 100)
  }, [rows, board])

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[.25em] text-primary">Player Market rankings</p>
        <h1 className="mt-3 text-4xl font-black">Market leaderboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">Ranked by growth and return percentage so early users do not lock permanent dominance.</p>
        <p className="mt-2 text-xs text-muted-foreground">Want private competition? Use friends leagues beta for invite-only tables.</p>
        <Link href="/market/leagues" className="mt-3 inline-flex rounded-xl border border-border bg-background/60 px-3 py-2 text-xs font-semibold text-primary">
          Open friends leagues beta
        </Link>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {options.map((option) => (
            <button key={option.id} onClick={() => setBoard(option.id)} className={`rounded-xl border px-4 py-3 text-left text-sm ${board === option.id ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-background/60 text-muted-foreground'}`}>
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-border bg-card p-4 sm:p-6">
        {sortedRows.length === 0 ? <p className="text-sm text-muted-foreground">No Player Market rankings yet.</p> : (
          <div className="space-y-2">
            {sortedRows.map((row, index) => {
              const value = Number(row[board]) || 0
              const returnPct = Number(row[currentMeta.returnKey]) || 0
              return (
                <Link key={`${row.user_id}-${index}`} href={`/player/${encodeURIComponent(row.username)}`} className="grid grid-cols-[46px_1fr_auto] items-center gap-3 rounded-xl border border-border bg-background/60 p-3">
                  <div className="text-center text-sm font-semibold text-muted-foreground">
                    {index === 0 ? <Crown className="mx-auto size-5 text-primary" /> : `#${index + 1}`}
                  </div>
                  <div>
                    <p className="font-semibold">{row.username}</p>
                    <p className="text-xs text-muted-foreground">Total {formatFiqCompact(row.total_account_value)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${value >= 0 ? 'text-primary' : 'text-destructive'}`}>{value >= 0 ? '+' : ''}{formatFiqCompact(Math.abs(value))}</p>
                    <p className="inline-flex items-center gap-1 text-xs text-muted-foreground"><TrendingUp className="size-3" />{returnPct.toFixed(2)}%</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
