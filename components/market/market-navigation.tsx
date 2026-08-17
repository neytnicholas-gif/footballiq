'use client'

import Link from 'next/link'
import { Award, LayoutGrid, Search, ShoppingBag, Sparkles, Swords } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const items = [
  { label: 'Market', hint: 'Find and trade players', href: '/market/players', icon: ShoppingBag },
  { label: 'Roster', hint: 'See your full team', href: '/market/roster', icon: LayoutGrid },
  { label: 'Reveal', hint: 'See price changes', href: '/market/reveal', icon: Sparkles },
  { label: 'Arena', hint: 'Gameweek 1v1', href: '/market/arena', icon: Swords },
  { label: 'Tools', hint: 'Plan and compare', href: '/market/tools', icon: Search },
  { label: 'Rewards', hint: 'Challenges and badges', href: '/market/rewards', icon: Award },
]

export function MarketNavigation() {
  const pathname = usePathname()
  return (
    <nav aria-label="Player Market sections" className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-emerald-200/10 bg-[#073b35]/95 p-2 shadow-[0_18px_50px_-34px_rgba(2,44,34,.9)] backdrop-blur sm:grid-cols-3 lg:grid-cols-6">
      {items.map(({ label, hint, href, icon: Icon }) => {
        const active = pathname === href || (href === '/market/roster' && pathname === '/market/portfolio')
        return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={cn('flex min-h-14 items-center gap-3 rounded-xl px-3 py-2 outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-300', active ? 'bg-emerald-300 text-emerald-950 shadow-md' : 'text-emerald-50 hover:bg-white/10')}><Icon className="size-4 shrink-0" aria-hidden="true" /><span><span className="block text-sm font-black">{label}</span><span className={cn('hidden text-[10px] sm:block', active ? 'text-emerald-950' : 'text-emerald-100/70')}>{hint}</span></span></Link>
      })}
    </nav>
  )
}
