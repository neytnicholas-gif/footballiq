import { SiteHeader } from '@/components/site-header'
import { PlayerMarketHome } from '@/components/market/player-market-home'

export default function PlayerMarketHomePage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <PlayerMarketHome />
      </section>
    </main>
  )
}
