import { formatMinorToMoney } from '@/lib/market/decimal'
import { MARKET_RULES } from '@/lib/market/settings'
import type { MarketPlayerView } from '@/lib/market/types'

type MarketStatisticsProps = {
  rows: MarketPlayerView[]
  mostOwnedCount: number
}

export function MarketStatistics({ rows, mostOwnedCount }: MarketStatisticsProps) {
  const totalPlayers = rows.length
  const availablePlayers = rows.filter((row) => row.player.isAvailable).length
  const averageValueMinor =
    totalPlayers === 0
      ? 0
      : Math.round(rows.reduce((sum, row) => sum + row.player.currentPriceMinor, 0) / totalPlayers)
  const marketCapMinor = rows.reduce((sum, row) => sum + row.player.currentPriceMinor, 0)

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card label="Tracked players" value={String(totalPlayers)} />
      <Card label="Available players" value={String(availablePlayers)} />
      <Card
        label="Average value"
        value={`${formatMinorToMoney(averageValueMinor)} ${MARKET_RULES.fiqCurrencyLabel}`}
      />
      <Card
        label="Market cap"
        value={`${formatMinorToMoney(marketCapMinor)} ${MARKET_RULES.fiqCurrencyLabel}`}
      />
      <Card label="Most-owned tracked" value={String(mostOwnedCount)} />
    </section>
  )
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </article>
  )
}
