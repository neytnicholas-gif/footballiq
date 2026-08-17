'use client'

import { Sparkles } from 'lucide-react'
import { getLevelInfo } from '@/lib/progression'
import { cn } from '@/lib/utils'

export function LevelBadge({ xp, compact = false, className }: { xp: number; compact?: boolean; className?: string }) {
  const level = getLevelInfo(xp)

  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center gap-1 rounded-full px-2.5 py-1 text-xs font-black shadow-sm', className)}
      style={{ background: level.palette.badge, color: level.palette.foreground, boxShadow: `0 0 0 2px ${level.palette.ring}33` }}
      aria-label={`Overall level ${level.level}`}
    >
      {!compact ? <span className="opacity-80">LV</span> : null}
      {level.level.toLocaleString()}
    </span>
  )
}

export function LevelProgress({ xp, className }: { xp: number; className?: string }) {
  const level = getLevelInfo(xp)

  return (
    <div className={cn('rounded-3xl border border-border/80 bg-card/90 p-5 shadow-sm', className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="grid size-14 shrink-0 place-items-center rounded-2xl text-lg font-black shadow-lg"
            style={{ background: level.palette.badge, color: level.palette.foreground, boxShadow: `0 12px 28px -14px ${level.palette.ring}` }}
          >
            {level.level.toLocaleString()}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground"><Sparkles className="size-3.5" /> Overall level</p>
            <p className="mt-1 truncate text-xl font-black text-foreground">Level {level.level.toLocaleString()}</p>
          </div>
        </div>
        <p className="text-right text-xs font-semibold text-muted-foreground">{level.xpToNextLevel.toLocaleString()} XP<br />to level {level.level + 1}</p>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-secondary" aria-label={`${level.progressPercentage}% of this level complete`}>
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${level.progressPercentage}%`, background: level.palette.badge }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{level.xpInLevel.toLocaleString()} XP earned here</span>
        <span>{level.xpNeeded.toLocaleString()} XP needed</span>
      </div>
    </div>
  )
}
