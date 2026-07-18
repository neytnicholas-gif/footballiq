'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface ModeCardProps {
  title: string
  description: string
  icon?: React.ReactNode
  href: string
  isClickable?: boolean
}

export function ModeCard({ title, description, icon, href, isClickable = true }: ModeCardProps) {
  if (!isClickable) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 opacity-60">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          {icon && <div className="text-2xl">{icon}</div>}
        </div>
      </div>
    )
  }

  return (
    <Link href={href}>
      <div className="rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:bg-card/80 hover:shadow-lg cursor-pointer">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          {icon && <div className="text-2xl">{icon}</div>}
        </div>
      </div>
    </Link>
  )
}
