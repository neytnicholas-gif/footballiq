'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { SiteHeader } from '@/components/site-header'
import { GoalscorerQuiz } from '@/components/goalscorer-quiz'

export default function FootballDuelsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-4 pt-28">
          <div className="h-40 animate-pulse rounded-3xl bg-secondary/60" />
        </div>
      </main>
    )
  }

  if (!user) {
    return null
  }

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />

      <div className="pt-16">
        <GoalscorerQuiz />
      </div>
    </main>
  )
}