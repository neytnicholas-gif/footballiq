import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { CatalogueVerificationState } from '@/components/market/catalogue-verification-state'

export default function MarketPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <CatalogueVerificationState />
      </section>
      <SiteFooter />
    </main>
  )
}
