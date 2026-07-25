import type { MarketPlayer } from '@/lib/market/types'

export function MarketPlayerChip({ player }: { player: MarketPlayer }) {
  const initials = player.display_name
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-sm font-bold text-primary">
      {initials}
    </div>
  )
}
