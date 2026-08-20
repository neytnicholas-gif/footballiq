import type { CSSProperties } from 'react'
import { getClubHomeColour } from '@/components/market/club-colour-dot'
import type { MarketPlayer } from '@/lib/market/types'

const PLAYER_SHIRT_MASK = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Cpath d='M17 5 12 8 3 12l4 11 6-3v23h22V20l6 3 4-11-9-4-5-3c-2 3-5 5-7 5s-5-2-7-5Z' fill='black'/%3E%3C/svg%3E")`

export function MarketPlayerChip({ player }: { player: MarketPlayer }) {
  const positionStyle = {
    GK: 'border-amber-200/35 bg-amber-300/10 text-amber-100 shadow-amber-300/20',
    DEF: 'border-sky-200/35 bg-sky-300/10 text-sky-100 shadow-sky-300/20',
    MID: 'border-emerald-200/35 bg-emerald-300/10 text-emerald-100 shadow-emerald-300/20',
    FWD: 'border-rose-200/35 bg-rose-300/10 text-rose-100 shadow-rose-300/20',
  }[player.position]
  const shirtStyle: CSSProperties = {
    background: getClubHomeColour(player.club_name),
    maskImage: PLAYER_SHIRT_MASK,
    WebkitMaskImage: PLAYER_SHIRT_MASK,
    maskPosition: 'center',
    WebkitMaskPosition: 'center',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    maskSize: 'contain',
    WebkitMaskSize: 'contain',
  }

  return (
    <div
      role="img"
      aria-label={`${player.display_name}, ${player.position}, ${player.club_name} colours`}
      title={`${player.display_name} · ${player.position}`}
      className={`relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl border shadow-lg ${positionStyle}`}
    >
      <span aria-hidden="true" className="absolute inset-0 opacity-25 [background:linear-gradient(90deg,transparent_49%,currentColor_50%,transparent_51%),linear-gradient(transparent_49%,currentColor_50%,transparent_51%)] [background-size:15px_15px]" />
      <span aria-hidden="true" className="absolute size-11 drop-shadow-[0_7px_6px_rgba(0,0,0,.45)]" style={shirtStyle} />
      <span aria-hidden="true" className="relative mt-1 rounded-md border border-white/25 bg-slate-950/75 px-1.5 py-0.5 text-[8px] font-black tracking-[.08em] text-white shadow-sm backdrop-blur-sm">
        {player.position}
      </span>
    </div>
  )
}
