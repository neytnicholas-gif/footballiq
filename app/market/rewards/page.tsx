import { SiteHeader } from '@/components/site-header'
import { MarketProgressionHub } from '@/components/market/market-progression-hub'

export default function MarketRewardsPage() {
  return <main className="market-theme min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,.10),transparent_34%),linear-gradient(180deg,#f7fbf9_0%,#eef6f2_48%,#f8faf9_100%)]">
    <SiteHeader />
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14"><MarketProgressionHub /></section>
  </main>
}
