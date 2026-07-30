import { createClient } from '@/lib/supabase/server'
import { getPortfolioForUser } from '@/lib/market/demo-store'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PortfolioPanel } from '@/components/market/portfolio-panel'

export default async function MarketPortfolioPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-background">
        <SiteHeader />
        <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="mb-5">
            <h1 className="text-3xl font-bold">Portfolio</h1>
          </div>
          <PortfolioPanel initialPortfolio={null} authRequired />
        </section>
        <SiteFooter compact />
      </main>
    )
  }

  const portfolio = await getPortfolioForUser(user.id)

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Portfolio</h1>
        </div>
        <PortfolioPanel initialPortfolio={portfolio} authRequired={false} />
      </section>
      <SiteFooter compact />
    </main>
  )
}
