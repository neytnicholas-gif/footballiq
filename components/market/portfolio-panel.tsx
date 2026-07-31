'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  buyMarketPlayerAction,
  ensureMarketPortfolioAction,
  sellMarketPlayerAction,
} from '@/app/market/actions'
import { formatBpsToPercent, formatMinorToMoney, formatSignedMinor, percentageReturnBps } from '@/lib/market/decimal'
import { MARKET_COPY, MARKET_RULES } from '@/lib/market/settings'
import type { PortfolioView } from '@/lib/market/types'

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

type PortfolioPanelProps = {
  initialPortfolio: PortfolioView | null
  authRequired: boolean
}

export function PortfolioPanel({ initialPortfolio, authRequired }: PortfolioPanelProps) {
  const router = useRouter()
  const [portfolio, setPortfolio] = useState<PortfolioView | null>(initialPortfolio)
  const [message, setMessage] = useState<string>('')
  const [pendingAction, setPendingAction] = useState<{ type: 'buy' | 'sell'; playerId: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const requestIdRef = useRef<string | null>(null)

  const holdingsMap = useMemo(() => {
    const map = new Set<string>()
    for (const item of portfolio?.holdings ?? []) map.add(item.player.id)
    return map
  }, [portfolio])

  const totalReturnBps = useMemo(() => {
    if (!portfolio) return 0
    return percentageReturnBps(
      portfolio.portfolio.totalPortfolioValueMinor,
      portfolio.portfolio.startingBalanceMinor,
    )
  }, [portfolio])

  async function runBuy(playerId: string) {
    setMessage('')
    startTransition(async () => {
      if (!requestIdRef.current) {
        requestIdRef.current = `buy:${playerId}:${crypto.randomUUID()}`
      }
      try {
        const result = await withActionTimeout(
          buyMarketPlayerAction(playerId, requestIdRef.current),
        )
        if (!result.ok) {
          setMessage(result.message)
          requestIdRef.current = null
          return
        }
        setPortfolio(result.portfolio)
        setMessage('Purchase completed.')
        requestIdRef.current = null
        router.refresh()
      } catch {
        setMessage('Transaction timed out. Retry will safely reuse the same request.')
      }
    })
  }

  async function runSell(playerId: string) {
    if (!portfolio) return
    setMessage('')
    const snapshot = portfolio
    const target = snapshot.holdings.find((holding) => holding.player.id === playerId)

    if (target) {
      const optimisticCash = snapshot.portfolio.cashBalanceMinor + target.player.currentPriceMinor
      const optimisticHoldings = snapshot.holdings.filter((holding) => holding.player.id !== playerId)
      const optimisticPortfolioValue = optimisticCash + optimisticHoldings.reduce((sum, item) => sum + item.currentValueMinor, 0)

      setPortfolio({
        ...snapshot,
        holdings: optimisticHoldings,
        portfolio: {
          ...snapshot.portfolio,
          cashBalanceMinor: optimisticCash,
          totalPortfolioValueMinor: optimisticPortfolioValue,
        },
      })
    }

    startTransition(async () => {
      if (!requestIdRef.current) {
        requestIdRef.current = `sell:${playerId}:${crypto.randomUUID()}`
      }
      try {
        const result = await withActionTimeout(
          sellMarketPlayerAction(playerId, requestIdRef.current),
        )
        if (!result.ok) {
          setPortfolio(snapshot)
          setMessage(result.message)
          requestIdRef.current = null
          return
        }
        setPortfolio(result.portfolio)
        setMessage('Sale completed.')
        requestIdRef.current = null
        router.refresh()
      } catch {
        setPortfolio(snapshot)
        setMessage('Transaction timed out. Retry will safely reuse the same request.')
      }
    })
  }

  async function runCreatePortfolio() {
    setMessage('')
    startTransition(async () => {
      try {
        const result = await withActionTimeout(ensureMarketPortfolioAction())
        if (!result.ok) {
          setMessage(result.message)
          return
        }
        setPortfolio(result.portfolio)
        setMessage('Portfolio created.')
        router.refresh()
      } catch {
        setMessage('Portfolio request timed out. Please retry.')
      }
    })
  }

  if (authRequired) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <h2 className="text-2xl font-bold">Portfolio access</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to create and manage your Player Market portfolio. Anonymous visitors can browse prices.
        </p>
      </div>
    )
  }

  if (!portfolio) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <h2 className="text-2xl font-bold">Create your portfolio</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Initialize your market portfolio to start buying and selling players.
        </p>
        <button
          type="button"
          disabled={isPending}
          onClick={() => void runCreatePortfolio()}
          className="mt-4 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-60"
        >
          Create portfolio
        </button>
        {message && <p role="status" aria-live="polite" className="mt-3 text-sm text-muted-foreground">{message}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[.2em] text-primary">Portfolio</p>
            <h2 className="mt-2 text-2xl font-bold">Market portfolio</h2>
            <p className="mt-2 text-sm text-muted-foreground">{MARKET_COPY.noCashValue}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm transition-all duration-300">
            Holdings {portfolio.holdings.length}/{MARKET_RULES.maximumHoldings}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Cash remaining" value={`${formatMinorToMoney(portfolio.portfolio.cashBalanceMinor)} ${MARKET_RULES.fiqCurrencyLabel}`} />
          <Metric label="Total value" value={`${formatMinorToMoney(portfolio.portfolio.totalPortfolioValueMinor)} ${MARKET_RULES.fiqCurrencyLabel}`} />
          <Metric label="Weekly change" value={`${formatSignedMinor(portfolio.weeklyChangeMinor)} ${MARKET_RULES.fiqCurrencyLabel}`} valueTone={portfolio.weeklyChangeMinor >= 0 ? 'positive' : 'negative'} />
          <Metric label="All-time profit" value={`${formatSignedMinor(portfolio.allTimeProfitMinor)} ${MARKET_RULES.fiqCurrencyLabel}`} valueTone={portfolio.allTimeProfitMinor >= 0 ? 'positive' : 'negative'} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Metric
            label="Realised P/L"
            value={`${formatSignedMinor(portfolio.portfolio.realisedProfitMinor)} ${MARKET_RULES.fiqCurrencyLabel}`}
            valueTone={portfolio.portfolio.realisedProfitMinor >= 0 ? 'positive' : 'negative'}
          />
          <Metric
            label="Unrealised P/L"
            value={`${formatSignedMinor(portfolio.portfolio.unrealisedProfitMinor)} ${MARKET_RULES.fiqCurrencyLabel}`}
            valueTone={portfolio.portfolio.unrealisedProfitMinor >= 0 ? 'positive' : 'negative'}
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Metric label="Portfolio return" value={formatBpsToPercent(totalReturnBps)} />
          <Metric label="Remaining buys today" value={portfolio.purchasesRemaining.toString()} />
          <Metric label="Remaining sales today" value={portfolio.salesRemaining.toString()} />
        </div>

        {message && (
          <p role="status" aria-live="polite" className="mt-4 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground">{message}</p>
        )}
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <h3 className="text-xl font-semibold">Holdings</h3>
        {portfolio.holdings.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No holdings yet. Buy up to 5 players to start your portfolio.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {portfolio.holdings.map((holding) => {
              const gainMinor = holding.unrealisedProfitMinor
              const denominator = Math.max(holding.purchasePriceMinor, 1)
              const returnBps = Math.trunc((gainMinor * 10000) / denominator)
              return (
                <li key={holding.id} className="rounded-2xl border border-border bg-background/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{holding.player.displayName}</p>
                      <p className="text-sm text-muted-foreground">
                        {holding.club.shortName} - {holding.player.positionGroup}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setPendingAction({ type: 'sell', playerId: holding.player.id })}
                      className="rounded-xl border border-border px-3 py-2 text-sm transition-all hover:bg-card disabled:opacity-60"
                    >
                      Sell
                    </button>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
                    <p>Avg purchase: {formatMinorToMoney(holding.purchasePriceMinor)} FIQ</p>
                    <p>Current value: {formatMinorToMoney(holding.player.currentPriceMinor)} FIQ</p>
                    <p className={gainMinor >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                      P/L: {formatSignedMinor(gainMinor)} FIQ
                    </p>
                    <p>{formatBpsToPercent(returnBps)}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <h3 className="text-xl font-semibold">Transaction history</h3>
        {portfolio.transactions.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {portfolio.transactions.slice(0, 20).map((tx) => (
              <li key={tx.id} className="rounded-xl border border-border bg-background/70 px-3 py-2">
                <span className="font-semibold uppercase">{tx.transactionType}</span>{' '}
                <span>{tx.player.displayName}</span>{' '}
                <span className="text-muted-foreground">at {formatMinorToMoney(tx.executedPriceMinor)} FIQ</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5">
            <h4 className="text-lg font-semibold">Confirm {pendingAction.type}</h4>
            <p className="mt-2 text-sm text-muted-foreground">
              Confirm this action. Execution price is set by the server at submission time.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="flex-1 rounded-xl border border-border px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={async () => {
                  const current = pendingAction
                  setPendingAction(null)
                  if (current.type === 'buy') await runBuy(current.playerId)
                  if (current.type === 'sell') await runSell(current.playerId)
                }}
                className="flex-1 rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-60"
              >
                {isPending ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <h3 className="text-xl font-semibold">Quick actions</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Use player detail pages to execute buy or sell actions with server-authoritative pricing.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {portfolio.holdings.map((holding) => (
            <button
              key={holding.player.id}
              type="button"
              disabled={isPending}
              onClick={() => setPendingAction({ type: 'sell', playerId: holding.player.id })}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-background"
            >
              Sell {holding.player.displayName}
            </button>
          ))}

          {[...holdingsMap].length === 0 && (
            <p className="text-sm text-muted-foreground">No quick actions available yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  valueTone = 'default',
}: {
  label: string
  value: string
  valueTone?: 'default' | 'positive' | 'negative'
}) {
  const toneClass =
    valueTone === 'positive' ? 'text-emerald-300' : valueTone === 'negative' ? 'text-rose-300' : 'text-foreground'

  return (
    <div className="rounded-xl border border-border bg-background/60 px-3 py-2">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 font-semibold ${toneClass}`}>{value}</p>
    </div>
  )
}
