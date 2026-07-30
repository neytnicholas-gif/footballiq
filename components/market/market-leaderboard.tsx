import { formatBpsToPercent, formatMinorToMoney, formatSignedMinor } from '@/lib/market/decimal'
import { MARKET_RULES } from '@/lib/market/settings'
import type { MarketLeaderboardBundle } from '@/lib/market/types'

type MarketLeaderboardProps = {
  rows: MarketLeaderboardBundle
}

export function MarketLeaderboard({ rows }: MarketLeaderboardProps) {
  if (rows.byPortfolioValue.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <h2 className="text-2xl font-bold">Market leaderboard</h2>
        <p className="mt-2 text-sm text-muted-foreground">No portfolio entries yet. Create a portfolio to appear here.</p>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
      <h2 className="text-2xl font-bold">Market leaderboard</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Market standings are isolated from quiz XP and ranked by portfolio performance.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Highlight title="Top portfolio value" value={rows.byPortfolioValue[0]?.username ?? '-'} />
        <Highlight title="Best weekly gain" value={rows.byWeeklyGain[0]?.username ?? '-'} />
        <Highlight title="Best all-time gain" value={rows.byAllTimeGain[0]?.username ?? '-'} />
        <Highlight title="Most profitable trader" value={rows.mostProfitableTrader?.username ?? '-'} />
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2">Rank</th>
              <th className="px-3 py-2">Username</th>
              <th className="px-3 py-2">Portfolio value</th>
              <th className="px-3 py-2">Weekly gain</th>
              <th className="px-3 py-2">All-time gain</th>
              <th className="px-3 py-2">Return %</th>
            </tr>
          </thead>
          <tbody>
            {rows.byPortfolioValue.map((row) => (
              <tr key={`${row.username}-${row.rank}`} className="border-b border-border/60">
                <td className="px-3 py-2">#{row.rank}</td>
                <td className="px-3 py-2">{row.username}</td>
                <td className="px-3 py-2">
                  {formatMinorToMoney(row.totalPortfolioValueMinor)} {MARKET_RULES.fiqCurrencyLabel}
                </td>
                <td className={`px-3 py-2 ${row.weeklyGainMinor >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {formatSignedMinor(row.weeklyGainMinor)} {MARKET_RULES.fiqCurrencyLabel}
                </td>
                <td className={`px-3 py-2 ${row.allTimeGainMinor >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {formatSignedMinor(row.allTimeGainMinor)} {MARKET_RULES.fiqCurrencyLabel}
                </td>
                <td className="px-3 py-2">{formatBpsToPercent(row.percentageReturnBps)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Highlight({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  )
}
