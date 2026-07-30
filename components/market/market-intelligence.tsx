import Link from 'next/link'
import { formatSignedMinor } from '@/lib/market/decimal'
import type { MarketPlayerView } from '@/lib/market/types'

type MarketIntelligenceProps = {
  rows: MarketPlayerView[]
  mostOwned: Array<{
    playerId: string
    ownershipCount: number
    displayName: string
    slug: string
    clubShortName: string
  }>
}

export function MarketIntelligence({ rows, mostOwned }: MarketIntelligenceProps) {
  const biggestRisers = [...rows]
    .sort((left, right) => right.latestMovementMinor - left.latestMovementMinor)
    .slice(0, 5)

  const biggestFallers = [...rows]
    .sort((left, right) => left.latestMovementMinor - right.latestMovementMinor)
    .slice(0, 5)

  const recentlyUpdated = [...rows]
    .sort(
      (left, right) =>
        new Date(right.player.dataUpdatedAt).getTime() -
        new Date(left.player.dataUpdatedAt).getTime(),
    )
    .slice(0, 5)

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <Panel title="Biggest Risers" description="Top positive valuation movement in the current local dataset.">
        <ul className="space-y-2 text-sm">
          {biggestRisers.map((row) => (
            <li key={`riser-${row.player.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/60 px-3 py-2">
              <Link href={`/market/player/${row.player.slug}`} className="font-semibold hover:underline">
                {row.player.displayName}
              </Link>
              <span className="text-emerald-300">{formatSignedMinor(row.latestMovementMinor)} FIQ</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Biggest Fallers" description="Top negative valuation movement in the current local dataset.">
        <ul className="space-y-2 text-sm">
          {biggestFallers.map((row) => (
            <li key={`faller-${row.player.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/60 px-3 py-2">
              <Link href={`/market/player/${row.player.slug}`} className="font-semibold hover:underline">
                {row.player.displayName}
              </Link>
              <span className="text-rose-300">{formatSignedMinor(row.latestMovementMinor)} FIQ</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Most Owned" description="Current local portfolio ownership counts.">
        {mostOwned.length === 0 ? (
          <p className="text-sm text-muted-foreground">No owned players yet. Ownership data appears here after users trade.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {mostOwned.map((item) => (
              <li key={`owned-${item.playerId}`} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/60 px-3 py-2">
                <Link href={`/market/player/${item.slug}`} className="font-semibold hover:underline">
                  {item.displayName}
                </Link>
                <span className="text-muted-foreground">Owned by {item.ownershipCount}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Recently Updated" description="Players sorted by latest local market data update timestamp.">
        <ul className="space-y-2 text-sm">
          {recentlyUpdated.map((row) => (
            <li key={`updated-${row.player.id}`} className="rounded-xl border border-border bg-background/60 px-3 py-2">
              <p className="font-semibold">{row.player.displayName}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(row.player.dataUpdatedAt).toLocaleString()} - {row.club.shortName}
              </p>
            </li>
          ))}
        </ul>
      </Panel>
    </section>
  )
}

function Panel({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <article className="rounded-3xl border border-border bg-card p-5 sm:p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
    </article>
  )
}
