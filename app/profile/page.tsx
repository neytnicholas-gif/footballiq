'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { LevelBadge } from '@/components/level-badge'
import { XpProgress } from '@/components/xp-progress'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth-provider'
import { getLevelFromXp } from '@/lib/progression'

export default function ProfilePage() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
    if (!loading && user && !profile?.username) router.replace('/username')
  }, [loading, user, profile, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-24 px-4">
        <div className="mx-auto max-w-4xl">
          <div className="h-96 animate-pulse rounded-3xl bg-secondary/60" />
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  const level = getLevelFromXp(profile.xp)
  const createdAt = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown'

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <div className="pt-24 px-4 pb-12">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header Card */}
          <div className="rounded-3xl border border-border bg-card p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm uppercase tracking-widest text-primary">FootballIQ Profile</p>
                <div className="mt-4 flex items-center gap-4 flex-wrap">
                  <LevelBadge level={level} size="lg" showLabel={false} />
                  <h1 className="text-4xl font-bold">{profile.username}</h1>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{user.email}</p>
              </div>
              <Link
                href="/username"
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
              >
                Edit
              </Link>
            </div>

            {/* XP Progress */}
            <div className="mt-8">
              <p className="text-sm text-muted-foreground">Progress to Level {level + 1}</p>
              <div className="mt-3">
                <XpProgress totalXp={profile.xp} showValues={true} size="lg" />
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground">Total Level</p>
              <p className="mt-2 text-3xl font-bold text-primary">{level}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground">Total XP</p>
              <p className="mt-2 text-3xl font-bold">{profile.xp.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground">Rating</p>
              <p className="mt-2 text-3xl font-bold">{profile.rating.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground">Current Streak</p>
              <p className="mt-2 text-3xl font-bold">{profile.streak}</p>
              <p className="mt-1 text-xs text-muted-foreground">days</p>
            </div>
          </div>

          {/* Activity & Stats */}
          <div className="rounded-3xl border border-border bg-card p-8">
            <h2 className="text-2xl font-bold mb-6">Statistics</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/50 bg-secondary/30 p-4">
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="mt-2 font-semibold">{createdAt}</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-secondary/30 p-4">
                <p className="text-sm text-muted-foreground">Quizzes Completed</p>
                <p className="mt-2 font-semibold text-muted-foreground">Coming soon</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-secondary/30 p-4">
                <p className="text-sm text-muted-foreground">Accuracy</p>
                <p className="mt-2 font-semibold text-muted-foreground">Coming soon</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-secondary/30 p-4">
                <p className="text-sm text-muted-foreground">Badges Earned</p>
                <p className="mt-2 font-semibold text-muted-foreground">Coming soon</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button nativeButton={false} render={<Link href="/quizzes" />} className="rounded-xl glow-green">
              Play a Quiz
            </Button>
            <Button nativeButton={false} render={<Link href="/leaderboard" />} variant="outline" className="rounded-xl">
              View Leaderboard
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
