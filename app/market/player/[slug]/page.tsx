import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { CatalogueVerificationState } from '@/components/market/catalogue-verification-state'
import { AuthenticatedPlayerDetail } from '@/components/market/authenticated-player-detail'
import { loadPublicCatalogueState } from '@/lib/market/public-catalogue-loader'
import { buildApprovedPlayerProfile } from '@/lib/market/catalogue-market-view'

export default async function MarketPlayerDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const catalogueState = await loadPublicCatalogueState()
  const { slug } = await params
  const profile = catalogueState.available ? buildApprovedPlayerProfile(catalogueState.records, slug) : null
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {!catalogueState.available || !profile
          ? <CatalogueVerificationState state={catalogueState} />
          : <AuthenticatedPlayerDetail row={profile} />}
      </section>
      <SiteFooter compact />
    </main>
  )
}
