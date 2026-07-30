'use client'

import { useState, useTransition } from 'react'
import {
  runMarketImportAction,
  runMarketWeeklyAction,
} from '@/app/market/actions'
import type { MarketAdminDashboardView } from '@/lib/market/types'

type ImportDashboardProps = {
  initial: MarketAdminDashboardView
}

export function ImportDashboard({ initial }: ImportDashboardProps) {
  const [dashboard, setDashboard] = useState(initial)
  const [competitionKey, setCompetitionKey] = useState('league-39')
  const [seasonKey, setSeasonKey] = useState('season-2026')
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  async function runImport(dryRun: boolean) {
    setMessage('')
    startTransition(async () => {
      try {
        const result = await runMarketImportAction({
          competitionKey,
          seasonKey,
          dryRun,
        })
        setDashboard(result.dashboard)
        setMessage(
          `${dryRun ? 'Dry-run' : 'Manual import'} completed. ` +
            `Imported fixtures: ${result.report.imported.fixtures}. ` +
            `Issues: ${result.report.issues.length}.`,
        )
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Import failed.')
      }
    })
  }

  async function runWeekly(dryRun: boolean) {
    setMessage('')
    startTransition(async () => {
      try {
        const result = await runMarketWeeklyAction({
          seasonKey,
          dryRun,
        })
        setDashboard(result.dashboard)
        if (!result.ok) {
          setMessage(result.message)
          return
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Weekly run failed.')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <h1 className="text-3xl font-bold">Market import dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Administrator-only controls for data import and valuation processing.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Metric label="Provider" value={dashboard.provider} />
          <Metric label="Last import" value={dashboard.lastImportAt ? new Date(dashboard.lastImportAt).toLocaleString() : 'Not run'} />
          <Metric label="Last valuation" value={dashboard.lastValuationAt ? new Date(dashboard.lastValuationAt).toLocaleString() : 'Not run'} />
          <Metric label="Last fixture processed" value={dashboard.lastFixtureProcessedAt ? new Date(dashboard.lastFixtureProcessedAt).toLocaleString() : 'Not run'} />
          <Metric label="Queued fixtures" value={String(dashboard.queuedFixtures)} />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Competition key</span>
            <input
              value={competitionKey}
              onChange={(event) => setCompetitionKey(event.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Season key</span>
            <input
              value={seasonKey}
              onChange={(event) => setSeasonKey(event.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => void runImport(true)}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-background disabled:opacity-60"
          >
            Dry-run import
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => void runImport(false)}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            Manual import
          </button>
          <button
            type="button"
            disabled
            onClick={() => void runWeekly(true)}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold opacity-60"
          >
            Dry-run valuation (Sprint 7C)
          </button>
          <button
            type="button"
            disabled
            onClick={() => void runWeekly(false)}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold opacity-60"
          >
            Manual valuation (Sprint 7C)
          </button>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Weekly fixture/stat dry-run import and valuation preview are available through the
          offline validation commands. Persistent valuation processing remains disabled pending
          Sprint 7C production approval.
        </p>

        {message && <p role="status" aria-live="polite" className="mt-4 text-sm text-muted-foreground">{message}</p>}
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Processing log</h2>
        {dashboard.processingLog.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No logs recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {dashboard.processingLog.map((entry) => (
              <li key={entry.id} className="rounded-xl border border-border bg-background/60 px-3 py-2">
                {new Date(entry.createdAt).toLocaleString()} - {entry.type.toUpperCase()} - {entry.source} - {entry.dryRun ? 'DRY-RUN' : 'LIVE MODE'} - {entry.message}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 px-3 py-2">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  )
}
