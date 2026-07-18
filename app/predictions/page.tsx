'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { SiteHeader } from '@/components/site-header'
import Link from 'next/link'

export default function PredictionsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-24 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="h-40 animate-pulse rounded-3xl bg-secondary/60" />
        </div>
      </div>
    )
  }

  if (!user) {
    router.replace('/login')
    return null
  }

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <div className="pt-24 px-4 pb-12">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-dashed border-border/50 bg-secondary/20 p-12 text-center">
            <div className="mx-auto mb-6 text-6xl">🔮</div>
            <h1 className="text-4xl font-bold">Predictions</h1>
            <p className="mt-4 text-muted-foreground">
              Predict match outcomes and league standings. Compete with other players for the top spot.
            </p>
            <p className="mt-6 text-sm text-muted-foreground">Coming soon</p>

            <div className="mt-8">
              <Link
                href="/quizzes"
                className="inline-block rounded-xl bg-primary px-6 py-3 font-medium text-background hover:bg-primary/90 transition-colors"
              >
                Try Quizzes Instead
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
