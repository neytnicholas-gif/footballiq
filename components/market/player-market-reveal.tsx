'use client'

import Link from 'next/link'
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react'
import { formatFiqCompact } from '@/lib/market/format'
import type { MarketRevealSummary } from '@/lib/market/types'

export function PlayerMarketReveal({ latest, history }: { latest: MarketRevealSummary | null; history: MarketRevealSummary[] }) {
  if (!latest) {
    return (
      <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
        <h1 className="text-3xl font-black">The Reveal</h1>
        <p className="mt-3 text-sm text-muted-foreground">No simulated matchweek has been completed yet.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/market/players" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Browse players</Link>
          <Link href="/market" className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">Return to Market</Link>
        </div>
      </section>
    )
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Matchweek completed</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">The Reveal: {latest.week_label}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your portfolio has been repriced using simulated football performance outcomes.</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Previous portfolio value" value={formatFiqCompact(latest.previous_portfolio_value)} />
          <Metric label="New portfolio value" value={formatFiqCompact(latest.new_portfolio_value)} />
          <Metric label="Weekly change" value={`${latest.weekly_change >= 0 ? '+' : '-'}${formatFiqCompact(Math.abs(latest.weekly_change))}`} tone={latest.weekly_change >= 0 ? 'up' : 'down'} />
          <Metric label="Weekly return" value={`${latest.weekly_return_pct >= 0 ? '+' : ''}${latest.weekly_return_pct.toFixed(2)}%`} tone={latest.weekly_return_pct >= 0 ? 'up' : 'down'} />
          <Metric label="Cash after repricing" value={formatFiqCompact(latest.cash_after)} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MovementCard
            title="Biggest winner"
            name={latest.biggest_winner.player_name ?? 'N/A'}
            delta={latest.biggest_winner.delta}
            positive
          />
          <MovementCard
            title="Biggest loser"
            name={latest.biggest_loser.player_name ?? 'N/A'}
            delta={latest.biggest_loser.delta}
            positive={false}
          />
          <MovementCard
            title="Best held player"
            name={latest.best_held_player.player_name ?? 'N/A'}
            delta={latest.best_held_player.delta}
            positive
          />
          <MovementCard
            title="Weakest held player"
            name={latest.weakest_held_player.player_name ?? 'N/A'}
            delta={latest.weakest_held_player.delta}
            positive={false}
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/market/portfolio" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Continue to Portfolio
            <ArrowRight className="size-4" />
          </Link>
          <Link href="/market" className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">Continue to Market</Link>
          <p className="self-center text-xs text-muted-foreground">Once your 11 holdings remain valid, you can simulate the next matchweek from Market.</p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-border bg-card p-6">
        <h2 className="text-xl font-bold">Held player movements</h2>
        <div className="mt-4 space-y-2">
          {latest.holdings.map((holding) => (
            <article key={`${latest.week_number}-${holding.player_id}`} className="rounded-xl border border-border bg-background/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{holding.player_name} · {holding.position}</p>
                <p className={holding.delta >= 0 ? 'text-sm font-semibold text-primary' : 'text-sm font-semibold text-destructive'}>
                  {holding.delta >= 0 ? '+' : '-'}{formatFiqCompact(Math.abs(holding.delta))}
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Purchase {formatFiqCompact(holding.purchase_price)} · Previous {formatFiqCompact(holding.previous_value)} · Current {formatFiqCompact(holding.current_value)} · Return {holding.return_pct >= 0 ? '+' : ''}{holding.return_pct.toFixed(2)}%</p>
              <p className="mt-1 text-xs text-muted-foreground">{holding.explanation}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-border bg-card p-6">
        <h2 className="text-xl font-bold">Matchweek history</h2>
        <div className="mt-4 space-y-2">
          {history.map((run) => (
            <div key={`${run.scope_key}-${run.week_number}`} className="rounded-xl border border-border bg-background/60 px-3 py-2 text-sm">
              <p className="font-semibold">{run.week_label}</p>
              <p className="text-xs text-muted-foreground">Change {run.weekly_change >= 0 ? '+' : '-'}{formatFiqCompact(Math.abs(run.weekly_change))} · Return {run.weekly_return_pct >= 0 ? '+' : ''}{run.weekly_return_pct.toFixed(2)}%</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'up' | 'down' }) {
  const color = tone === 'up' ? 'text-primary' : tone === 'down' ? 'text-destructive' : 'text-foreground'
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${color}`}>{value}</p>
    </div>
  )
}

function MovementCard({ title, name, delta, positive }: { title: string; name: string; delta: number; positive: boolean }) {
  const icon = positive ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />
  const color = positive ? 'text-primary' : 'text-destructive'
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-1 font-semibold">{name}</p>
      <p className={`mt-1 inline-flex items-center gap-1 text-sm font-semibold ${color}`}>{icon}{delta >= 0 ? '+' : '-'}{formatFiqCompact(Math.abs(delta))}</p>
    </div>
  )
}
