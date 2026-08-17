import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { PlayerMarketHome } from '@/components/market/player-market-home'

export const metadata: Metadata = {
  title: 'Player Market',
  description: 'Build an 11-player team and follow fictional game-price changes driven by real match ratings.',
}

export default function PlayerMarketHomePage() {
  return (
    <main className="market-theme market-shell min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <PlayerMarketHome />
      </section>
    </main>
  )
}
