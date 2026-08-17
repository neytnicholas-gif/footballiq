import Link from 'next/link'
import { cn } from '@/lib/utils'
import { BRAND } from '@/lib/brand'

export function BallIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 6.5l3.3 2.4-1.26 3.88h-4.08L8.7 8.9 12 6.5z" fill="currentColor" />
      <path d="M12 6.5V3.2M15.3 8.9l2.9-1.5M14.04 12.78l2 2.7M9.96 12.78l-2 2.7M8.7 8.9L5.8 7.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('group flex min-h-11 items-center gap-2.5 text-foreground', className)} aria-label={`${BRAND.name} home`}>
      <span className="relative flex size-9 items-center justify-center overflow-hidden rounded-[0.8rem] border border-emerald-200/50 bg-[linear-gradient(145deg,#34d399,#38bdf8)] text-[11px] font-black tracking-[-0.08em] text-slate-950 shadow-[0_10px_28px_-14px_rgba(52,211,153,.9)] transition-transform group-hover:-rotate-3 group-hover:scale-105">
        <span aria-hidden="true" className="absolute -right-1 top-1/2 size-5 -translate-y-1/2 rounded-full border border-slate-950/20" />
        <span aria-hidden="true" className="absolute -right-2 top-1/2 size-8 -translate-y-1/2 rounded-full border border-slate-950/10" />
        <span className="relative">{BRAND.initials}</span>
      </span>
      <span className="brand-wordmark text-lg font-black uppercase leading-none tracking-[-0.055em]">
        Early <span className="brand-accent-text">Shout</span>
      </span>
    </Link>
  )
}
