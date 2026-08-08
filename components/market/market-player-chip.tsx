import type { MarketPlayer } from '@/lib/market/types'

export function MarketPlayerChip({ player }: { player: MarketPlayer }) {
  const initials = player.display_name
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const positionStyle = {
    GK: 'border-amber-300/70 from-amber-100 to-orange-50 text-amber-900 shadow-amber-200/45',
    DEF: 'border-sky-300/70 from-sky-100 to-cyan-50 text-sky-900 shadow-sky-200/45',
    MID: 'border-emerald-300/70 from-emerald-100 to-teal-50 text-emerald-900 shadow-emerald-200/45',
    FWD: 'border-rose-300/70 from-rose-100 to-pink-50 text-rose-900 shadow-rose-200/45',
  }[player.position]

  return (
    <div className={`relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-gradient-to-br text-sm font-black shadow-lg ${positionStyle}`}>
      <span className="absolute inset-x-2 bottom-1 h-px bg-current opacity-15" />
      {initials}
    </div>
  )
}
