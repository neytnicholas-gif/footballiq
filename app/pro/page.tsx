'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { useAuth } from '@/components/auth-provider'
import { ProBadge, SurfaceCard } from '@/components/platform/primitives'
import { isLocalDevHost, setDevLocalProOverride } from '@/lib/membership'

const freeFeatures = [
  'Core FootballIQ gameplay',
  'Football Duels',
  'Standard Scout Vision scenarios',
  'Standard Referee Arena scenarios',
  'XP and progression',
  'Ratings and leaderboards',
  'Daily challenges',
  'Basic explanations',
]

const proFeaturesAvailableNow = [
  'In-depth scouting analysis experience',
  'In-depth refereeing analysis experience',
  'Advanced scenario breakdowns',
  'Confidence analysis after decisions',
]

const proFeaturesComingNext = [
  'Progress insights dashboard',
  'Scout video lab modules',
]

const proFeaturesPlanned = [
  'Future expert modules',
  'Future video laboratories',
  'Future AI coaching',
]

export default function ProPage() {
  const { membership, user } = useAuth()

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <SurfaceCard className="overflow-hidden">
          <div className="bg-[linear-gradient(135deg,rgba(34,197,94,.22),rgba(59,130,246,.12),rgba(255,255,255,.85))] p-7 sm:p-10">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="size-3.5" />
              FootballIQ Pro
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">Train like a scout. Think like a referee. Develop football intelligence.</h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">FootballIQ Pro is built for deeper judgement practice with structured learning, not just more quiz volume.</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {membership.plan === 'pro' ? <ProBadge /> : <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Free plan</span>}
              <span className="rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-semibold">Early access phase · Pricing coming soon</span>
            </div>
          </div>
        </SurfaceCard>

        <section className="mt-7 grid gap-5 lg:grid-cols-2">
          <SurfaceCard className="p-6">
            <h2 className="text-2xl font-black tracking-tight">Free includes</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {freeFeatures.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </SurfaceCard>

          <SurfaceCard className="p-6">
            <h2 className="text-2xl font-black tracking-tight">Pro includes</h2>
            <Block title="Available now" items={proFeaturesAvailableNow} tone="good" />
            <Block title="Coming next" items={proFeaturesComingNext} tone="next" />
            <Block title="Planned later" items={proFeaturesPlanned} tone="planned" />
          </SurfaceCard>
        </section>

        <section className="mt-7 grid gap-4 md:grid-cols-2">
          <Link href="/academy/scout/scout-room-player-evaluation" className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/45">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Available now</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight">Scout Room: Player Evaluation</h3>
            <p className="mt-2 text-sm text-muted-foreground">Complete end-to-end pro scouting report with expert debrief structure.</p>
          </Link>
          <Link href="/academy/referee/referee-debrief-penalty-area" className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/45">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Available now</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight">Referee Debrief: Penalty-Area Decision</h3>
            <p className="mt-2 text-sm text-muted-foreground">Work a staged incident with law, VAR and match-control analysis reveal.</p>
          </Link>
        </section>

        {process.env.NODE_ENV !== 'production' && isLocalDevHost() && user ? (
          <section className="mt-7 rounded-2xl border border-amber-300 bg-amber-50 p-5">
            <p className="text-sm font-semibold text-amber-900">Local development Pro testing</p>
            <p className="mt-1 text-sm text-amber-900/85">This override only works on localhost in non-production builds and does not expose a public production switch.</p>
            <div className="mt-3 flex gap-3">
              <button onClick={() => { setDevLocalProOverride(true); window.location.reload() }} className="rounded-lg border border-amber-400 bg-white px-3 py-2 text-sm font-semibold text-amber-900">Enable local Pro override</button>
              <button onClick={() => { setDevLocalProOverride(false); window.location.reload() }} className="rounded-lg border border-amber-400 bg-white px-3 py-2 text-sm font-semibold text-amber-900">Disable local Pro override</button>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  )
}

function Block({ title, items, tone }: { title: string; items: string[]; tone: 'good' | 'next' | 'planned' }) {
  const toneClass = tone === 'good'
    ? 'border-emerald-300/70 bg-emerald-50'
    : tone === 'next'
      ? 'border-sky-300/70 bg-sky-50'
      : 'border-border bg-muted/50'

  return (
    <div className={`mt-3 rounded-xl border p-3 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em]">{title}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {items.map((item) => <li key={item}>• {item}</li>)}
      </ul>
    </div>
  )
}
