import Link from 'next/link'
import { cn } from '@/lib/utils'

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
    <Link href="/" className={cn('group flex items-center gap-2', className)}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:rotate-12">
        <BallIcon className="size-5" />
      </span>
      <span className="text-lg font-semibold tracking-tight">Football<span className="text-primary">IQ</span></span>
    </Link>
  )
}
