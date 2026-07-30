import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { ImportDashboard } from '@/components/market/import-dashboard'
import { isMarketAdminUser } from '@/lib/market/admin-auth'
import { getMarketAdminDashboardView } from '@/lib/market/demo-store'
import { getUnresolvedMembershipReviewItems } from '@/lib/market/import-review'

export default async function MarketAdminPage() {
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
            <p className="mt-2 text-sm text-muted-foreground">
              This page is restricted to configured market administrators.
            </p>
            <Link href="/market" className="mt-4 inline-flex text-sm font-semibold text-primary">
              Back to market
            </Link>
          </div>
        </section>
        <SiteFooter compact />
      </main>
    )
  }

  const dashboard = getMarketAdminDashboardView()
  const unresolved = await getUnresolvedMembershipReviewItems()

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-4 flex justify-end">
          <div className="flex gap-2">
            <Link href="/market/admin/weekly-preview" className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">
              Weekly valuation preview
            </Link>
            <Link href="/market/admin/review" className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">
              Review unresolved memberships ({unresolved.length})
            </Link>
          </div>
        </div>
        <ImportDashboard initial={dashboard} />
      </section>
      <SiteFooter compact />
    </main>
  )
}
