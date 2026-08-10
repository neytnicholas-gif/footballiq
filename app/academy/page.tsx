'use client'

import Link from 'next/link'
import { BookOpen, Flag, Search } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { academyExperiences, computeAcademyProgress, loadAcademyCompletions } from '@/lib/academy'
import { useEffect, useState } from 'react'
import type { AcademyCompletion } from '@/lib/academy'
import { LoadingState, SurfaceCard } from '@/components/platform/primitives'

export default function AcademyPage() {
  const [completions, setCompletions] = useState<AcademyCompletion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void (async () => {
      const result = await loadAcademyCompletions()
      if (!active) return
      setCompletions(result.data)
      setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [])

  const progress = computeAcademyProgress(completions)

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <SurfaceCard className="overflow-hidden">
          <div className="bg-[linear-gradient(130deg,rgba(40,197,130,.18),rgba(35,134,255,.12),rgba(7,14,26,.96))] p-7 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">FootballIQ Academy</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">Learn to think like a scout or referee</h1>
            <p className="mt-3 max-w-3xl text-muted-foreground">Choose a lesson. Make football decisions. We explain the answer after each one.</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-emerald-300/40 bg-emerald-300/14 px-3 py-1 text-xs font-semibold text-emerald-200">All current modules are free</span>
              <Link href="/pro" className="rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary/40">Access &amp; roadmap</Link>
            </div>
          </div>
        </SurfaceCard>

        {loading ? <div className="mt-6"><LoadingState label="Loading Academy progress…" /></div> : null}

        <section className="mt-6 grid gap-5 md:grid-cols-2">
          <TrackCard
            icon={<Search className="size-5" />}
            title="Scout Academy"
            copy="Look at a player’s good and bad points. Then decide what your club should do."
            href="/academy/scout"
            completed={progress.scout.completed}
            total={progress.scout.total}
          />
          <TrackCard
            icon={<Flag className="size-5" />}
            title="Referee Academy"
            copy="Learn the rules, make the call and see how a referee controls the match."
            href="/academy/referee"
            completed={progress.referee.completed}
            total={progress.referee.total}
          />
        </section>

        <section className="mt-7 rounded-2xl border border-border bg-card p-5">
          <h2 className="inline-flex items-center gap-2 text-xl font-black tracking-tight"><BookOpen className="size-5 text-primary" /> Your lessons</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {academyExperiences.map((item) => (
              <div key={item.key} className="rounded-xl border border-border bg-background/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{item.title}</p>
                  <span className="rounded-full border border-emerald-300/40 bg-emerald-300/14 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">FREE</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.status === 'available' ? 'Available now' : item.status === 'coming-next' ? 'Coming next' : 'Planned later'}
                </p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}

function TrackCard({
  icon,
  title,
  copy,
  href,
  completed,
  total,
}: {
  icon: React.ReactNode
  title: string
  copy: string
  href: string
  completed: number
  total: number
}) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100)

  return (
    <Link href={href} className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/45 hover:-translate-y-0.5">
      <p className="inline-flex items-center gap-2 text-primary">{icon}<span className="text-xs font-semibold uppercase tracking-[0.16em]">Learning path</span></p>
      <h3 className="mt-2 text-2xl font-black tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
      <div className="mt-4 h-2 rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{completed} of {total} lessons finished</p>
    </Link>
  )
}
