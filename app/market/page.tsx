import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { CatalogueVerificationState } from '@/components/market/catalogue-verification-state'
import { MarketBrowser } from '@/components/market/market-browser'
import { loadPublicCatalogueState } from '@/lib/market/public-catalogue-loader'
import { buildApprovedCatalogueViews } from '@/lib/market/catalogue-market-view'

export default async function MarketPage() {
  const catalogueState = await loadPublicCatalogueState()
  const rows = catalogueState.available ? buildApprovedCatalogueViews(catalogueState.records) : []
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {catalogueState.available ? (
          <div className="space-y-6">
            <CatalogueVerificationState state={catalogueState} />
            <MarketBrowser rows={rows} ownedPlayerIds={[]} />
          </div>
        ) : <CatalogueVerificationState state={catalogueState} />}
      </section>
      <SiteFooter />
    </main>
  )
}
