import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { isMarketAdminUser } from '@/lib/market/admin-auth'
import { getUnresolvedMembershipReviewItems } from '@/lib/market/import-review'
import { saveMarketImportReviewDecisionAction } from './actions'

export default async function MarketAdminReviewPage() {
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

  const items = await getUnresolvedMembershipReviewItems()

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.22em] text-primary">Admin review</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Unresolved player-club memberships</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Review decisions are required before unresolved memberships can be considered for future staged imports.
            </p>
          </div>
          <Link href="/market/admin" className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">
            Back to admin dashboard
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card p-8">
            <p className="font-semibold">No unresolved memberships found.</p>
            <p className="mt-2 text-sm text-muted-foreground">The latest dry-run report does not include review-required membership conflicts.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <article key={item.providerPlayerId} className="rounded-3xl border border-border bg-card p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Provider player id</p>
                    <h2 className="text-xl font-bold">{item.providerPlayerId}</h2>
                  </div>
                  <p className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
                    {item.classification}
                  </p>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">{item.reason}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {item.clubs.map((club) => (
                    <span key={`${item.providerPlayerId}-${club.providerClubId}`} className="rounded-full border border-border px-3 py-1 text-xs">
                      {club.clubName} (id={club.providerClubId})
                    </span>
                  ))}
                </div>

                {item.evidence.length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-border bg-background/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Provider evidence</p>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {item.evidence.map((record, index) => (
                        <li key={`${item.providerPlayerId}-evidence-${record.clubProviderId}-${index}`}>
                          Club {record.clubProviderId} | {record.displayName} | {record.detailedPosition || 'position n/a'} | updated {record.providerUpdatedAt || 'unknown'}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {item.reviewedDecision ? (
                  <p className="mt-4 rounded-xl border border-emerald-700/40 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200">
                    Reviewed: active club {item.reviewedDecision.activeClubProviderId} by {item.reviewedDecision.reviewerId} at {new Date(item.reviewedDecision.decidedAt).toLocaleString()}
                  </p>
                ) : null}

                <form action={saveMarketImportReviewDecisionAction} className="mt-4 grid gap-3 md:grid-cols-[1fr_2fr_auto]">
                  <input type="hidden" name="providerPlayerId" value={item.providerPlayerId} />
                  <select
                    name="activeClubProviderId"
                    required
                    defaultValue={item.reviewedDecision?.activeClubProviderId ?? ''}
                    className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
                  >
                    <option value="" disabled>
                      Select active club
                    </option>
                    {item.clubs.map((club) => (
                      <option key={`${item.providerPlayerId}-option-${club.providerClubId}`} value={club.providerClubId}>
                        {club.clubName} ({club.providerClubId})
                      </option>
                    ))}
                  </select>
                  <input
                    name="reviewerNote"
                    placeholder="Optional reviewer note"
                    defaultValue={item.reviewedDecision?.reviewerNote ?? ''}
                    className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
                  />
                  <button type="submit" className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
                    Save decision
                  </button>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>
      <SiteFooter compact />
    </main>
  )
}
