'use client'

import { Download } from 'lucide-react'
import { OPEN_INSTALL_EXPERIENCE_EVENT } from '@/components/mobile-experience'
import { cn } from '@/lib/utils'

export function InstallEarlyShoutButton({ className }: { className?: string }) {
  return (
    <button onClick={() => window.dispatchEvent(new Event(OPEN_INSTALL_EXPERIENCE_EVENT))} className={cn('inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-5 font-black text-slate-950 transition hover:bg-emerald-200', className)}>
      <Download className="size-4" aria-hidden="true" />
      Add to home screen
    </button>
  )
}
