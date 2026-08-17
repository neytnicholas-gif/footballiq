import { SiteHeader } from '@/components/site-header'
import { MarketNavigation } from '@/components/market/market-navigation'
import { MarketToolbox } from '@/components/market/market-toolbox'

export default function MarketToolsPage(){return <main className="market-theme market-shell min-h-screen"><SiteHeader/><section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14"><MarketNavigation/><MarketToolbox/></section></main>}
