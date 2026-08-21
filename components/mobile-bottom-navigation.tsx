'use client'

import Link from 'next/link'
import { Brain, CalendarDays, Gamepad2, Home, LineChart, UserRound } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { primaryNavigationLinkIsActive } from '@/lib/play-navigation'

const mobileLinks = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Games', href: '/games', icon: Gamepad2 },
  { label: 'Quizzes', href: '/quizzes', icon: Brain },
  { label: 'Market', href: '/market', icon: LineChart },
  { label: 'Daily', href: '/daily', icon: CalendarDays },
  { label: 'Profile', href: '/profile', icon: UserRound },
]

const hiddenPrefixes = ['/login', '/signup', '/forgot-password', '/reset-password', '/auth/', '/contact', '/terms', '/privacy', '/game-rules', '/access-denied']

export function MobileBottomNavigation() {
  const pathname = usePathname()
  if (hiddenPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) return null

  return (
    <nav aria-label="Mobile quick navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#06131b]/95 px-[max(.5rem,env(safe-area-inset-left))] pb-[env(safe-area-inset-bottom)] shadow-[0_-18px_45px_rgba(0,0,0,.35)] backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-6">
        {mobileLinks.map(({ label, href, icon: Icon }) => {
          const active = primaryNavigationLinkIsActive(pathname, href)
          return (
            <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={cn('relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-300', active ? 'text-emerald-200' : 'text-slate-400 active:bg-white/5')}>
              {active ? <span aria-hidden="true" className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,.8)]" /> : null}
              <Icon className={cn('size-5', active && 'drop-shadow-[0_0_8px_rgba(110,231,183,.5)]')} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
