'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { ArrowUpRight, Wallet } from 'lucide-react'
import { MarketPlayerChip } from '@/components/market/market-player-chip'
import { formatFiqCompact, MARKET_MAX_PORTFOLIO_SIZE } from '@/lib/market/format'
import type { MarketHolding, MarketPlayer, MarketPortfolio, MarketTransaction } from '@/lib/market/types'

export function PlayerMarketPortfolio({
  portfolio,
  players,
  holdings,
  transactions,
  buysRemaining,
  salesRemaining,
}: {
  portfolio: MarketPortfolio | null
  players: MarketPlayer[]
  holdings: MarketHolding[]
  transactions: MarketTransaction[]
  buysRemaining: number
  salesRemaining: number
}) {
  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players])

  if (!portfolio) {
    return (
      <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
        <h1 className="text-3xl font-black">Portfolio</h1>
        <p className="mt-3 text-sm text-muted-foreground">Create an account to unlock portfolio management and market history.</p>
        <Link href="/signup" className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Create account</Link>
      </section>
    )
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
        <h1 className="text-3xl font-black">Portfolio</h1>
        <p className="mt-2 text-sm text-muted-foreground">Eight available slots. Balance and valuation tracked from authoritative market prices.</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Total account value" value={formatFiqCompact(portfolio.total_account_value)} />
          <Metric label="Available balance" value={formatFiqCompact(portfolio.available_balance)} />
          <Metric label="Portfolio value" value={formatFiqCompact(portfolio.portfolio_value)} />
          <Metric label="Realised profit/loss" value={`${portfolio.realized_profit_loss >= 0 ? '+' : ''}${formatFiqCompact(Math.abs(portfolio.realized_profit_loss))}`} tone={portfolio.realized_profit_loss >= 0 ? 'positive' : 'negative'} />
        </div>

        <div className="mt-4 rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
          Daily limits: {buysRemaining} buys remaining · {salesRemaining} sales remaining
        </div>
      </section>

      <section className="rounded-[2rem] border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Current holdings ({holdings.length}/{MARKET_MAX_PORTFOLIO_SIZE})</h2>
          <Link href="/market/players" className="text-sm font-semibold text-primary">Back more</Link>
        </div>
        {holdings.length === 0 ? <p className="text-sm text-muted-foreground">No active holdings yet.</p> : (
          <div className="grid gap-3">
            {holdings.map((holding) => {
              const player = playersById.get(holding.player_id)
              if (!player) return null
              return (
                <Link key={holding.id} href={`/market/player/${encodeURIComponent(player.slug)}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-2xl border border-border bg-background/70 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <MarketPlayerChip player={player} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{player.display_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{player.club_name} · {player.position}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-muted-foreground">Backed</p>
                    <p>{formatFiqCompact(holding.acquisition_value)}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-muted-foreground">Now</p>
                    <p>{formatFiqCompact(holding.current_value_snapshot)}</p>
                    <p className={holding.unrealized_profit_loss >= 0 ? 'text-primary' : 'text-destructive'}>
                      {holding.unrealized_profit_loss >= 0 ? '+' : ''}{formatFiqCompact(Math.abs(holding.unrealized_profit_loss))}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-border bg-card p-6">
          <h2 className="text-xl font-bold">Recent transaction history</h2>
          <div className="mt-4 space-y-2">
            {transactions.length === 0 ? <p className="text-sm text-muted-foreground">No transactions yet.</p> : transactions.map((tx) => {
              const player = playersById.get(tx.player_id)
              return (
                <div key={tx.id} className="rounded-xl border border-border bg-background/60 p-3 text-sm">
                  <p className="font-semibold">{tx.transaction_type.toUpperCase()} · {player?.display_name ?? 'Player'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()} · {formatFiqCompact(tx.execution_value)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Balance {formatFiqCompact(tx.balance_before)} → {formatFiqCompact(tx.balance_after)}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-card p-6">
          <h2 className="text-xl font-bold">Portfolio growth guidance</h2>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p className="rounded-xl border border-border bg-background/60 p-3">Holdings are valued at current FootballIQ market values, not real transfer fees.</p>
            <p className="rounded-xl border border-border bg-background/60 p-3">Daily limits reduce spam trades and protect fair progression.</p>
            <p className="rounded-xl border border-border bg-background/60 p-3">Atomic server-side execution protects against duplicate clicks and multi-tab race conditions.</p>
            <Link href="/market/leaderboard" className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 font-semibold text-primary">
              Compare performance on leaderboard
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'positive' | 'negative' }) {
  const icon = label === 'Available balance' ? <Wallet className="size-4" /> : null
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${tone === 'positive' ? 'text-primary' : tone === 'negative' ? 'text-destructive' : 'text-foreground'}`}>{value}</p>
      {icon ? <div className="mt-1 text-muted-foreground">{icon as ReactNode}</div> : null}
    </div>
  )
}
