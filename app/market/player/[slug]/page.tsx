import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getPlayerProfileBySlug, getPortfolioForUser } from '@/lib/market/demo-store'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PlayerDetailPanel } from '@/components/market/player-detail-panel'

export default async function MarketPlayerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const resolved = await params
  const row = getPlayerProfileBySlug(resolved.slug)

  if (!row) {
    return (
      <main className="min-h-screen bg-background">
        <SiteHeader />
        <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="rounded-3xl border border-border bg-card p-8">
            <h1 className="text-3xl font-bold">Player not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">The selected player record is unavailable.</p>
            <Link href="/market" className="mt-4 inline-flex text-sm font-semibold text-primary">
              Back to market →
            </Link>
          </div>
        </section>
        <SiteFooter compact />
      </main>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let owned = false
  if (user) {
    const portfolio = await getPortfolioForUser(user.id)
    owned = Boolean(portfolio?.holdings.find((holding) => holding.player.id === row.player.id))
  }

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-4">
          <Link href="/market" className="text-sm font-semibold text-primary">← Back to market</Link>
        </div>
        <PlayerDetailPanel row={row} authRequired={!user} owned={owned} />
      </section>
      <SiteFooter compact />
    </main>
  )
}
