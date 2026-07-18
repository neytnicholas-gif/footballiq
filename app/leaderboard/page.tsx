'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { SiteHeader } from '@/components/site-header'
import { LevelBadge } from '@/components/level-badge'
import { getLevelFromXp } from '@/lib/progression'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface LeaderboardEntry {
  id: string
  username: string
  xp: number
  rating: number
  streak: number
}

export default function LeaderboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
      return
    }

    if (authLoading) return

    const fetchLeaderboard = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, xp, rating, streak')
          .order('xp', { ascending: false })
          .limit(100)

        if (error) throw error
        setEntries((data as LeaderboardEntry[]) || [])
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [user, authLoading, router, supabase])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background pt-24 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-secondary/60" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <div className="pt-24 px-4 pb-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold">Leaderboard</h1>
            <p className="mt-2 text-muted-foreground">Top FootballIQ players by XP</p>
          </div>

          <div className="space-y-2">
            {entries.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-6 text-center">
                <p className="text-muted-foreground">No players yet. Be the first!</p>
              </div>
            ) : (
              entries.map((entry, index) => {
                const level = getLevelFromXp(entry.xp)
                const isCurrentUser = user?.id === entry.id

                return (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-4 rounded-2xl border p-4 transition-colors ${
                      isCurrentUser
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:bg-card/80'
                    }`}
                  >
                    <div className="text-xl font-bold text-muted-foreground w-8">#{index + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <LevelBadge level={level} size="sm" showLabel={false} />
                        <p className="font-semibold truncate">{entry.username}</p>
                        {isCurrentUser && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {entry.xp.toLocaleString()} XP • Rating: {entry.rating.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p className="font-semibold">{entry.streak}</p>
                      <p className="text-xs">day streak</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
