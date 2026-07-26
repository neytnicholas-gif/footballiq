'use client'

import Link from 'next/link'
import { Lock, Sparkles } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { hasProAccess } from '@/lib/membership'
import { cn } from '@/lib/utils'

type GateVariant = 'card' | 'inline' | 'preview'

export function ProAccessGate({
  children,
  title,
  copy,
  variant = 'card',
  preview,
  className,
}: {
  children: React.ReactNode
  title: string
  copy: string
  variant?: GateVariant
  preview?: React.ReactNode
  className?: string
}) {
  const { membership } = useAuth()
  const unlocked = hasProAccess(membership)

  if (unlocked) {
    return <>{children}</>
  }

  if (variant === 'inline') {
    return (
      <div className={cn('rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4', className)}>
        <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-800">
          <Lock className="size-3.5" />
          Pro section
        </p>
        <h3 className="mt-1 text-lg font-bold text-indigo-950">{title}</h3>
        <p className="mt-1 text-sm text-indigo-900/80">{copy}</p>
        <Link href="/pro" className="mt-3 inline-flex rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-sm font-semibold text-indigo-800 hover:bg-indigo-100">
          Upgrade path
        </Link>
      </div>
    )
  }

  if (variant === 'preview') {
    return (
      <div className={cn('rounded-2xl border border-border bg-card p-4', className)}>
        {preview}
        <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/90 p-4">
          <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-800">
            <Sparkles className="size-3.5" />
            Pro preview
          </p>
          <p className="mt-2 text-sm text-indigo-900">{copy}</p>
          <Link href="/pro" className="mt-3 inline-flex rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-sm font-semibold text-indigo-800 hover:bg-indigo-100">
            See Pro plan
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('overflow-hidden rounded-[1.6rem] border border-indigo-200 bg-card', className)}>
      {preview ? <div className="border-b border-border p-4">{preview}</div> : null}
      <div className="bg-[linear-gradient(135deg,rgba(99,102,241,.18),rgba(255,255,255,.4))] p-5">
        <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-800">
          <Lock className="size-3.5" />
          Pro required
        </p>
        <h3 className="mt-1 text-xl font-black tracking-tight text-indigo-950">{title}</h3>
        <p className="mt-2 text-sm text-indigo-900/85">{copy}</p>
        <Link href="/pro" className="mt-4 inline-flex rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-sm font-semibold text-indigo-800 hover:bg-indigo-100">
          Unlock in Pro
        </Link>
      </div>
    </div>
  )
}
