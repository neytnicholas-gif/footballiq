'use client'

import Link from 'next/link'
import { ArrowRight, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { ClubColourDot } from '@/components/market/club-colour-dot'
import { formatFiqCompact } from '@/lib/market/format'
import type { MarketPlayer, MarketRevealSummary } from '@/lib/market/types'

export function PlayerMarketReveal({ latest, history, players }: { latest: MarketRevealSummary | null; history: MarketRevealSummary[]; players: MarketPlayer[] }) {
  if (!latest) {
    return (
      <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
        <h1 className="text-3xl font-black">The Reveal</h1>
        <p className="mt-3 text-sm text-muted-foreground">This page updates after the matches finish and we receive player ratings and minutes. Come back then to see which prices went up or down.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/market/players" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Browse players</Link>
          <Link href="/market" className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">Return to Market</Link>
        </div>
      </section>
    )
  }

  const playersById = new Map(players.map((player) => [player.id, player]))

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-emerald-800">Your gameweek results</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">The Reveal: {latest.week_label}</h1>
        <p className="mt-2 text-sm text-muted-foreground">The new player prices are ready. You can keep your players, sell one or buy someone new.</p>

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
            name={latest.biggest_winner.delta > 0 ? latest.biggest_winner.player_name ?? 'N/A' : 'No holding rose this week'}
            clubName={latest.biggest_winner.delta > 0 && latest.biggest_winner.player_id ? playersById.get(latest.biggest_winner.player_id)?.club_name : undefined}
            delta={latest.biggest_winner.delta > 0 ? latest.biggest_winner.delta : 0}
          />
          <MovementCard
            title="Biggest loser"
            name={latest.biggest_loser.delta < 0 ? latest.biggest_loser.player_name ?? 'N/A' : 'No holding fell this week'}
            clubName={latest.biggest_loser.delta < 0 && latest.biggest_loser.player_id ? playersById.get(latest.biggest_loser.player_id)?.club_name : undefined}
            delta={latest.biggest_loser.delta < 0 ? latest.biggest_loser.delta : 0}
          />
          <MovementCard
            title="Best held player"
            name={latest.best_held_player.delta !== 0 ? latest.best_held_player.player_name ?? 'N/A' : 'Your holdings stayed level'}
            clubName={latest.best_held_player.delta !== 0 && latest.best_held_player.player_id ? playersById.get(latest.best_held_player.player_id)?.club_name : undefined}
            delta={latest.best_held_player.delta}
          />
          <MovementCard
            title="Weakest held player"
            name={latest.weakest_held_player.delta !== 0 ? latest.weakest_held_player.player_name ?? 'N/A' : 'Your holdings stayed level'}
            clubName={latest.weakest_held_player.delta !== 0 && latest.weakest_held_player.player_id ? playersById.get(latest.weakest_held_player.player_id)?.club_name : undefined}
            delta={latest.weakest_held_player.delta}
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/market/roster" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Continue to Portfolio
            <ArrowRight className="size-4" />
          </Link>
          <Link href="/market" className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">Continue to Market</Link>
          <p className="self-center text-xs text-muted-foreground">New updates require a finished fixture and verified provider appearances.</p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-border bg-card p-6">
        <h2 className="text-xl font-bold">Your players’ price changes</h2>
        <div className="mt-4 space-y-2">
          {latest.holdings.map((holding) => (
            <article key={`${latest.week_number}-${holding.player_id}`} className="rounded-xl border border-border bg-background/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 font-semibold">{playersById.get(holding.player_id)?.club_name ? <ClubColourDot clubName={playersById.get(holding.player_id)!.club_name} /> : null}<span>{holding.player_name} · {holding.position}</span></p>
                <p className={holding.delta >= 0 ? 'text-sm font-semibold text-primary' : 'text-sm font-semibold text-destructive'}>
                  {holding.delta >= 0 ? '+' : '-'}{formatFiqCompact(Math.abs(holding.delta))}
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Purchase {formatFiqCompact(holding.purchase_price)} · Previous {formatFiqCompact(holding.previous_value)} · Current {formatFiqCompact(holding.current_value)} · Return {holding.return_pct >= 0 ? '+' : ''}{holding.return_pct.toFixed(2)}%</p>
              <p className="mt-1 text-xs text-muted-foreground">{holding.delta === 0 ? 'No full price step was reached this gameweek. If a small verified movement was calculated, it stays banked and carries into the next update.' : holding.explanation}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-border bg-card p-6">
        <h2 className="text-xl font-bold">Gameweek history</h2>
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

function MovementCard({ title, name, clubName, delta }: { title: string; name: string; clubName?: string; delta: number }) {
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral'
  const icon = direction === 'neutral' ? <Minus className="size-4" /> : direction === 'up' ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />
  const color = direction === 'neutral' ? 'text-muted-foreground' : direction === 'up' ? 'text-primary' : 'text-destructive'
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-1 flex items-center gap-2 font-semibold">{clubName ? <ClubColourDot clubName={clubName} /> : null}<span>{name}</span></p>
      <p className={`mt-1 inline-flex items-center gap-1 text-sm font-semibold ${color}`}>{icon}{delta === 0 ? formatFiqCompact(0) : `${delta > 0 ? '+' : '-'}${formatFiqCompact(Math.abs(delta))}`}</p>
    </div>
  )
}
