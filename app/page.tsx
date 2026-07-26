'use client'

import Link from 'next/link'
import { ArrowRight, BookOpen, Flag, Globe2, Radar, ShieldCheck, Sparkles, Trophy } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { useAuth } from '@/components/auth-provider'
import { getRankProgress } from '@/lib/progression'
import { CallToAction, ModeCard, ProgressCard, SectionHeader, StatCard, SurfaceCard, StatusBadge } from '@/components/platform/primitives'

const coreModes = [
  {
    title: 'Scout Vision',
    description: 'Read a dossier, separate evidence from projection, and justify a recruitment recommendation.',
    href: '/quizzes/would-you-scout-him',
    icon: <Radar className="size-5" />,
    accent: 'scout' as const,
    meta: ['6 dossiers', 'judgement flow', 'evidence-led'],
  },
  {
    title: 'Referee Arena',
    description: 'Commit to laws, restarts and sanctions under pressure with structured post-decision feedback.',
    href: '/quizzes/referee-decisions',
    icon: <ShieldCheck className="size-5" />,
    accent: 'referee' as const,
    meta: ['10 scenarios', 'decision control', 'law 12'],
  },
  {
    title: 'Football Duels',
    description: 'Fast stat battles with instant reveal, combos and replayable packs across football topics.',
    href: '/quizzes/football-duels',
    icon: <Trophy className="size-5" />,
    accent: 'duels' as const,
    meta: ['8 packs', 'replayable', 'timed or relaxed'],
  },
  {
    title: 'Daily Challenge',
    description: 'One Brussels-based key each day to keep the habit alive and build a genuine streak.',
    href: '/daily',
    icon: <Sparkles className="size-5" />,
    accent: 'daily' as const,
    meta: ['5 questions', 'daily key', 'streaks'],
  },
]

const principles = [
  {
    title: 'Scouting judgment',
    copy: 'Spot the signal, explain the risk, and decide whether the evidence is worth following.',
    icon: <Radar className="size-5" />,
  },
  {
    title: 'Refereeing decisions',
    copy: 'Judge the incident, the restart, and the discipline with clarity instead of guesswork.',
    icon: <Flag className="size-5" />,
  },
  {
    title: 'Evidence-based thinking',
    copy: 'Every mode asks for a reasoned choice and then shows why it held up or failed.',
    icon: <BookOpen className="size-5" />,
  },
  {
    title: 'Progress you can feel',
    copy: 'XP, rating, levels, streaks and leaderboards make improvement visible over time.',
    icon: <Globe2 className="size-5" />,
  },
]

export default function HomePage() {
  const { user, profile, loading, membership } = useAuth()
  const rank = getRankProgress(profile?.xp ?? 0)
  const accuracy = profile && profile.total_answers > 0 ? Math.round((profile.correct_answers / profile.total_answers) * 100) : null
  const streakLabel = profile ? `${profile.current_streak} day${profile.current_streak === 1 ? '' : 's'}` : 'Sign in to track'

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-4 pb-6 pt-8 sm:px-6 sm:pt-10">
        <SurfaceCard className="overflow-hidden border-primary/15">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.08fr_.92fr] lg:items-center">
            <div>
              <StatusBadge label="FootballIQ Product Experience" tone="good" />
              <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                Train football judgement with evidence, pressure and progression.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                FootballIQ turns scouting, refereeing and football memory into a polished product with clear decisions, quick feedback and real progression signals.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/quizzes" className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_16px_30px_-20px_rgba(34,197,94,.35)]">
                  Start with modes
                  <ArrowRight className="size-4" />
                </Link>
                <Link href="/leaderboard" className="inline-flex h-11 items-center rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground transition hover:border-primary/35 hover:bg-secondary/40">
                  See leaderboards
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-2">
                <StatusBadge label="Scout Vision" tone="good" />
                <StatusBadge label="Referee Arena" tone="warn" />
                <StatusBadge label="Football Duels" tone="info" />
                <StatusBadge label="Daily Challenge" tone="neutral" />
              </div>
            </div>

            <SurfaceCard className="relative overflow-hidden border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,.98),rgba(248,250,252,.96))] p-5">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(54,206,163,.12),transparent_34%),radial-gradient(circle_at_80%_18%,rgba(56,123,255,.12),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(255,186,67,.12),transparent_30%)]" />
              <div className="relative grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-white/90 p-4 shadow-sm sm:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Analysis board</p>
                      <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">Read the game before you answer.</h2>
                    </div>
                    <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Bright mode</div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <MiniTile title="Zones" copy="Pitch and dossier cues" accent="bg-emerald-100 text-emerald-800" />
                    <MiniTile title="Evidence" copy="Scouting details and laws" accent="bg-sky-100 text-sky-800" />
                    <MiniTile title="Decision" copy="Commit, then debrief" accent="bg-amber-100 text-amber-800" />
                  </div>
                </div>
                <AnalysisChip label="Confidence" value="High" />
                <AnalysisChip label="Streak" value={streakLabel} />
                <AnalysisChip label="Rank" value={rank.current.title} />
                <AnalysisChip label="XP" value={profile?.xp.toLocaleString() ?? 'Track it'} />
              </div>
            </SurfaceCard>
          </div>
        </SurfaceCard>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <SectionHeader
          eyebrow="Core experiences"
          title="A clear product selector, not a cluttered quiz list"
          copy="Every mode is clickable, playable and clearly framed around the skill it trains."
        />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {coreModes.map((mode) => <ModeCard key={mode.title} {...mode} playable />)}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <SectionHeader
          eyebrow="Why it feels different"
          title="Football-native, not generic SaaS"
          copy="The product language comes from football analysis: zones, dossiers, confidence, decisions and performance movement."
        />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {principles.map((item) => (
            <SurfaceCard key={item.title} className="p-5">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">{item.icon}</div>
              <h3 className="mt-4 text-xl font-black tracking-tight text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.copy}</p>
            </SurfaceCard>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <SectionHeader
          eyebrow="Progression preview"
          title="Real signals already in the product"
          copy="No fake testimonials or invented user counts. These are the actual progression signals FootballIQ tracks."
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Current rank" value={`${rank.current.emoji} ${rank.current.title}`} hint={rank.next ? `${rank.remaining} XP to ${rank.next.title}` : 'Maximum rank reached'} />
          <StatCard label="XP" value={profile ? profile.xp.toLocaleString() : 'Sign in'} hint="Profile progression" />
          <StatCard label="Accuracy" value={accuracy === null ? '—' : `${accuracy}%`} hint={profile ? 'Based on answered questions' : 'Track your answer quality'} />
          <StatCard label="Streak" value={streakLabel} hint={profile ? 'Daily consistency signal' : 'Anonymous players can still play'} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <SectionHeader
          eyebrow="Product proof"
          title="A serious product that still feels approachable"
          copy="The site should encourage immediate play while showing that FootballIQ is about analysis, reasoning and improvement."
        />
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <SurfaceCard className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">What you can do now</p>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>• Play Scout Vision, Referee Arena, Football Duels and Daily Challenge</li>
              <li>• Track XP, levels, ratings, streaks and leaderboard position</li>
              <li>• Resume unfinished sessions after signing in</li>
              <li>• Compare your result with structured feedback</li>
            </ul>
          </SurfaceCard>
          <SurfaceCard className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Your next step</p>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-foreground">Start anonymously or sign in to save progress.</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Anonymous visitors can still play the core experiences. Signed-in users get a persistent profile, streak tracking and the leaderboard view.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {!loading && !user ? <Link href="/login" className="inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Sign in</Link> : <Link href="/profile" className="inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Open profile</Link>}
              <Link href="/daily" className="inline-flex rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground">Play Daily</Link>
            </div>
          </SurfaceCard>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <CallToAction
          title="Choose a mode and get straight into football decisions."
          copy={membership.plan === 'pro' ? 'You already have access to the current core modes and progression tools.' : 'Free play is live across the core modes, with more structured progress tracking once you create an account.'}
          primary={<Link href="/quizzes" className="inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Open modes</Link>}
          secondary={<Link href="/leaderboard" className="inline-flex rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground">View leaderboard</Link>}
        />
      </section>
    </main>
  )
}

function MiniTile({ title, copy, accent }: { title: string; copy: string; accent: string }) {
  return <div className={`rounded-2xl border border-border px-4 py-3 ${accent}`}><p className="text-xs font-semibold uppercase tracking-[0.18em]">{title}</p><p className="mt-1 text-sm leading-relaxed text-current/80">{copy}</p></div>
}

function AnalysisChip({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-border bg-background/80 p-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className="mt-2 text-lg font-black tracking-tight text-foreground">{value}</p></div>
}
