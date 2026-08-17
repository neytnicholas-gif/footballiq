import { SiteHeader } from '@/components/site-header'
import { MarketProgressionHub } from '@/components/market/market-progression-hub'
import { MarketNavigation } from '@/components/market/market-navigation'

export default function MarketRewardsPage() {
  return <main className="market-theme market-shell min-h-screen">
    <SiteHeader />
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14"><MarketNavigation /><MarketProgressionHub /></section>
  </main>
}
