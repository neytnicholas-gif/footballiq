import Link from 'next/link'
import { Clock3, ShieldCheck } from 'lucide-react'
import { PUBLIC_MARKET_CATALOGUE_STATUS } from '@/lib/market/catalogue'
import { MARKET_RULES } from '@/lib/market/settings'
import type { PublicCatalogueRuntimeState } from '@/lib/market/public-catalogue-loader'

export function CatalogueVerificationState({
  state = { ...PUBLIC_MARKET_CATALOGUE_STATUS, records: [] },
}: {
  state?: PublicCatalogueRuntimeState
}) {
  return (
    <div className="rounded-[2rem] border border-primary/20 bg-[radial-gradient(circle_at_top_right,rgba(55,220,130,.12),transparent_42%),var(--card)] p-6 shadow-[0_24px_70px_-45px_rgba(55,220,130,.45)] sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[.24em] text-primary">Catalogue status</p>
          <h1 className="mt-3 text-balance text-3xl font-black tracking-tight sm:text-5xl">
            {state.message}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            FootballIQ will not display generated, stale-season or unverified player records.{' '}
            {state.available
              ? `${state.records.length} records passed local validation and explicit approval. Public trading remains closed pending release approval.`
              : 'The public market will open when the 2026/27 catalogue has a licensed source, stable player IDs and recorded verification dates.'}
          </p>
        </div>
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
          <Clock3 className="size-5" />
        </span>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        <Rule label="Portfolio" value={`${MARKET_RULES.maximumHoldings} players maximum`} />
        <Rule label="Daily activity" value={`${MARKET_RULES.maximumDailyPurchases} buys · ${MARKET_RULES.maximumDailySales} sales`} />
        <Rule label="Currency" value="Virtual FIQ only" />
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border bg-background/55 p-4 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>No player names, club memberships, positions, prices or provider IDs are being guessed.</p>
      </div>

      <Link href="/" className="mt-6 inline-flex text-sm font-semibold text-primary">
        Back to FootballIQ
      </Link>
    </div>
  )
}
function Rule({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/45 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-semibold text-foreground">{value}</p>
    </div>
  )
}
