import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { MarketBrowser } from '@/components/market/market-browser'
import { MarketIntelligence } from '@/components/market/market-intelligence'
import { MarketLeaderboard } from '@/components/market/market-leaderboard'
import { MarketStatistics } from '@/components/market/market-statistics'
import { createClient } from '@/lib/supabase/server'
import {
  getMarketFilterOptions,
  getMarketIntelligenceView,
  getMarketLeaderboardBundle,
  getMarketViews,
  getOwnedPlayerIdsForUser,
} from '@/lib/market/demo-store'
import { isMarketAdminUser } from '@/lib/market/admin-auth'
import { MARKET_COPY } from '@/lib/market/settings'

export default async function MarketPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const ownedPlayerIds = user ? getOwnedPlayerIdsForUser(user.id) : []

  const clubs = getMarketFilterOptions().clubs
  const rows = getMarketViews({
    search: '',
    club: 'ALL',
    position: 'ALL',
    sort: 'alphabetical',
    availability: 'ALL',
    ownership: 'ALL',
    ownedPlayerIds: new Set(ownedPlayerIds),
  })
  const leaderboard = getMarketLeaderboardBundle()
  const intelligence = getMarketIntelligenceView()

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[.22em] text-primary">Player Market</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Build your 11-player portfolio</h1>
            <p className="mt-3 text-base text-muted-foreground sm:text-lg">
              Browse player prices, manage virtual FIQ balance, and track portfolio value through deterministic valuation rules.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/market/portfolio" className="rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">
              Open portfolio
            </Link>
            {isMarketAdminUser(user?.id) && (
              <Link href="/market/admin" className="rounded-xl border border-border px-5 py-3 font-semibold">
                Admin dashboard
              </Link>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">{MARKET_COPY.demoLabel}</p>
          <p className="mt-1">This market is locally playable from development-season import data and excludes unresolved membership conflicts.</p>
        </div>

        <div className="mt-7">
          <MarketBrowser rows={rows} clubs={clubs} ownedPlayerIds={ownedPlayerIds} />
        </div>

        <div className="mt-7">
          <MarketStatistics rows={rows} mostOwnedCount={intelligence.mostOwned.length} />
        </div>

        <div className="mt-7">
          <MarketIntelligence rows={rows} mostOwned={intelligence.mostOwned} />
        </div>

        <div className="mt-7">
          <MarketLeaderboard rows={leaderboard} />
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
