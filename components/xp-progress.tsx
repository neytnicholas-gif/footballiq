'use client'

import { getLevelInfo } from '@/lib/progression'

interface XpProgressProps {
  totalXp: number
  showValues?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function XpProgress({ totalXp, showValues = true, size = 'md' }: XpProgressProps) {
  const info = getLevelInfo(totalXp)

  const heightClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-2 mb-1">
        {showValues && (
          <>
            <span className="text-xs text-muted-foreground">
              {info.xpInLevel.toLocaleString()} / {info.xpNeeded.toLocaleString()} XP
            </span>
            <span className="text-xs font-medium text-primary">{info.progressPercentage}%</span>
          </>
        )}
      </div>
      <div className={`${heightClasses[size]} w-full rounded-full bg-secondary/40 overflow-hidden`}>
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${info.progressPercentage}%`,
            backgroundColor: info.color,
          }}
        />
      </div>
    </div>
  )
}
