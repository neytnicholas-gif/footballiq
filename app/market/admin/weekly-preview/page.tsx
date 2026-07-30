import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { isMarketAdminUser } from '@/lib/market/admin-auth'
import { formatMinorToMoney } from '@/lib/market/decimal'
import { loadWeeklyValuationPreviewFromFile } from '@/lib/market/weekly-pipeline'

export default async function MarketAdminWeeklyPreviewPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isMarketAdminUser(user.id)) {
    return (
      <main className="min-h-screen bg-background">
        <SiteHeader />
        <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="rounded-3xl border border-border bg-card p-8">
            <h1 className="text-3xl font-bold">Market admin access required</h1>
            <p className="mt-2 text-sm text-muted-foreground">This page is restricted to configured market administrators.</p>
            <Link href="/market" className="mt-4 inline-flex text-sm font-semibold text-primary">
              Back to market
            </Link>
          </div>
        </section>
        <SiteFooter compact />
      </main>
    )
  }

  const preview = await loadWeeklyValuationPreviewFromFile()

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.22em] text-primary">Weekly preview</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Staged valuation preview</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Dry-run only. No production value changes are applied from this screen.
            </p>
          </div>
          <Link href="/market/admin" className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">
            Back to admin dashboard
          </Link>
        </div>

        {!preview ? (
          <div className="rounded-3xl border border-border bg-card p-8">
            <p className="font-semibold">No weekly preview found.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Run npm run market:import-weekly:dry to generate staged fixture/stat and valuation preview artifacts.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Fixtures processed" value={String(preview.fixturesProcessed)} />
              <Metric label="Player-stat rows" value={String(preview.playerStatRowsProcessed)} />
              <Metric label="Eligible updates" value={String(preview.eligibleUpdates)} />
              <Metric label="Blocked updates" value={String(preview.blockedUpdates)} />
              <Metric label="Low-confidence rows" value={String(preview.lowConfidenceData.length)} />
              <Metric label="Unresolved memberships" value={String(preview.unresolvedMemberships.excludedReviewCount)} />
              <Metric label="Approved reviews" value={String(preview.approvalStatus.approvedReviewDecisions)} />
              <Metric label="Pending unresolved" value={String(preview.approvalStatus.pendingUnresolvedMemberships)} />
            </div>

            <Panel title="Biggest projected risers" rows={preview.biggestProjectedRisers} />
            <Panel title="Biggest projected fallers" rows={preview.biggestProjectedFallers} />
            <Panel title="Skipped players" rows={preview.skippedPlayers} />
            <Panel title="Low-confidence data" rows={preview.lowConfidenceData} />
          </div>
        )}
      </section>
      <SiteFooter compact />
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  )
}

function Panel({
  title,
  rows,
}: {
  title: string
  rows: Array<{
    providerPlayerId: string
    fixtureId: string
    confidence: 'high' | 'medium' | 'low'
    eligibility: 'eligible' | 'blocked'
    reason: string
    proposedValueMovementMinor: number | null
    proposedNewValueMinor: number | null
  }>
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No rows in this section.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {rows.slice(0, 30).map((row) => (
            <li key={`${title}-${row.providerPlayerId}-${row.fixtureId}`} className="rounded-xl border border-border bg-background/60 px-3 py-2">
              <p className="font-semibold">
                {row.providerPlayerId} - fixture {row.fixtureId}
              </p>
              <p className="text-muted-foreground">
                {row.eligibility.toUpperCase()} / {row.confidence.toUpperCase()} - {row.reason}
              </p>
              <p className="text-muted-foreground">
                Movement: {typeof row.proposedValueMovementMinor === 'number' ? formatMinorToMoney(row.proposedValueMovementMinor) : 'n/a'} FIQ,
                Proposed value: {typeof row.proposedNewValueMinor === 'number' ? formatMinorToMoney(row.proposedNewValueMinor) : 'n/a'} FIQ
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
