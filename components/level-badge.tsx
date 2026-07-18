'use client'

import { getLevelColor } from '@/lib/progression'

interface LevelBadgeProps {
  level: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function LevelBadge({ level, size = 'md', showLabel = true }: LevelBadgeProps) {
  const color = getLevelColor(level)
  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizeClasses[size]} flex items-center justify-center rounded-full font-bold text-foreground shadow-lg`}
        style={{ backgroundColor: color }}
      >
        {level}
      </div>
      {showLabel && <span className="text-xs uppercase tracking-wider text-muted-foreground">LVL</span>}
    </div>
  )
}
