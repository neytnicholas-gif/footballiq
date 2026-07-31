import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { CatalogueVerificationState } from '@/components/market/catalogue-verification-state'
import { loadPublicCatalogueState } from '@/lib/market/public-catalogue-loader'

export default async function MarketPage() {
  const catalogueState = await loadPublicCatalogueState()
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <CatalogueVerificationState state={catalogueState} />
      </section>
      <SiteFooter />
    </main>
  )
}
