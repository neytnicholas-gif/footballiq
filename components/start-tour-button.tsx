'use client'

import { PlayCircle } from 'lucide-react'
import { START_SITE_TOUR_EVENT } from '@/lib/onboarding'
import { cn } from '@/lib/utils'

export function StartTourButton({ className }: { className?: string }) {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event(START_SITE_TOUR_EVENT))}
      className={cn('inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#087f68] px-5 font-black text-white shadow-sm transition hover:bg-[#066b59]', className)}
    >
      <PlayCircle className="size-5" /> Show me around
    </button>
  )
}
