'use client'

import Link from 'next/link'
import { ArrowRight, CalendarDays, Flag, Gamepad2, Play, Radar, ShieldCheck, Smartphone, Sparkles, Trophy, UserPlus, Workflow, Zap } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SponsorPlacement } from '@/components/sponsor-placement'
import { useAuth } from '@/components/auth-provider'
import { getLevelInfo, getRankProgress } from '@/lib/progression'
import { HomePlayJourney } from '@/components/home-play-journey'

const featuredModes = [
  {
    title: 'Tactical Lab',
    description: 'Look at what is happening in the match. Pick what your team should do next.',
    href: '/quizzes/tactical-lab',
    icon: Workflow,
    tag: 'Tactical decisions',
  },
  {
    title: 'Referee Arena',
    description: 'Read what happened. Make the referee’s call. Then see the right answer.',
    href: '/quizzes/referee-decisions',
    icon: ShieldCheck,
    tag: 'Referee choices',
  },
  {
    title: 'Scout Vision',
    description: 'Read about a player. Decide if your club should keep watching or walk away.',
    href: '/quizzes/would-you-scout-him',
    icon: Radar,
    tag: 'Find talent',
  },
  {
    title: 'Football Duels',
    description: 'Pick the winner in quick football stat battles.',
    href: '/quizzes/football-duels',
    icon: Trophy,
    tag: 'Quick rounds',
  },
  {
    title: 'Predictions',
    description: 'Pick the home team, a draw or the away team before the match starts.',
    href: '/predictions',
    icon: Flag,
    tag: 'Pick match results',
  },
]

export default function HomePage() {
  const { user, profile } = useAuth()
  const rank = getRankProgress(profile?.xp ?? 0)
  const level = getLevelInfo(profile?.xp ?? 0)
  const accuracy = formatAccuracy(profile?.correct_answers ?? 0, profile?.total_answers ?? 0)
  const streakLabel = user ? formatDayCount(profile?.current_streak ?? 0) : 'Sign in to track'

  return (
    <main className="relative min-h-screen bg-[#060b13] text-slate-100">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_4%,rgba(45,212,191,.12),transparent_32%),radial-gradient(circle_at_84%_10%,rgba(59,130,246,.14),transparent_28%),linear-gradient(180deg,rgba(4,8,16,0),rgba(4,8,16,.75)_58%,rgba(4,8,16,1))]" />
      <SiteHeader />
      <div className="relative">
        <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
          <Link href="/beta" className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm transition hover:border-emerald-300/55 hover:bg-emerald-400/15">
            <span><strong className="text-emerald-200">Founder beta is open.</strong> <span className="text-slate-300">Play free, shape the game and secure 12 months of future Player Market access on us.</span></span>
            <span className="font-semibold text-emerald-300">Join beta →</span>
          </Link>
        </section>
        <section className="mx-auto max-w-5xl px-4 pt-8 text-center sm:px-6 sm:pt-10" aria-labelledby="home-primary-play-title">
          <p className="text-xs font-black uppercase tracking-[.28em] text-emerald-300">Your first move</p>
          <h2 id="home-primary-play-title" className="mt-2 text-3xl font-black tracking-tight text-white sm:text-5xl">Build the XI you believe in.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Start with 100m free game credits. Choose players from England, Spain and France, then watch their game values move.</p>
          <Link href="/market" aria-label="Play the Player Market now" className="group mx-auto mt-6 flex min-h-24 w-full max-w-2xl items-center justify-center gap-4 rounded-[2rem] border border-emerald-100/30 bg-[linear-gradient(135deg,#6ee7b7,#34d399)] px-5 py-4 text-slate-950 shadow-[0_24px_80px_-28px_rgba(52,211,153,.95)] outline-none transition hover:-translate-y-1 hover:shadow-[0_30px_90px_-24px_rgba(52,211,153,1)] focus-visible:ring-4 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#060b13] sm:min-h-28">
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-slate-950 text-emerald-200 shadow-lg transition group-hover:scale-105 sm:size-16"><Play className="ml-1 size-6 fill-current sm:size-7" aria-hidden="true" /></span>
            <span className="text-left"><span className="block text-2xl font-black tracking-tight sm:text-3xl">PLAY PLAYER MARKET</span><span className="mt-1 block text-xs font-bold text-slate-800/75 sm:text-sm">Free beta · no payment · first signing in minutes</span></span>
            <ArrowRight className="hidden size-6 shrink-0 transition group-hover:translate-x-1 sm:block" aria-hidden="true" />
          </Link>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px] font-bold text-slate-300"><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">100m budget</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Build 1-4-3-3</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Real match ratings</span></div>
        </section>
        <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-8 pt-8 sm:px-6 sm:pt-10 lg:grid-cols-[1.18fr_.82fr] lg:items-stretch">
          <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-[linear-gradient(155deg,rgba(10,17,30,.96),rgba(7,13,23,.88))] p-6 shadow-[0_30px_90px_-52px_rgba(16,185,129,.4)] sm:p-8">
            <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(16,185,129,.18),transparent_32%),radial-gradient(circle_at_90%_8%,rgba(56,189,248,.12),transparent_28%)]" />
            <div aria-hidden="true" className="absolute -right-10 top-8 hidden h-64 w-64 rounded-full border border-white/10 bg-[radial-gradient(circle,rgba(255,255,255,.2),rgba(255,255,255,0)_64%)] opacity-40 lg:block" />
            <div aria-hidden="true" className="absolute inset-y-14 right-[-20%] hidden w-[56%] rounded-[2.3rem] border border-emerald-300/10 bg-[repeating-linear-gradient(90deg,transparent_0_13%,rgba(255,255,255,.03)_13%_26%),linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.01))] [transform:perspective(820px)_rotateX(60deg)_rotateZ(-10deg)] lg:block" />

            <div className="relative max-w-xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.23em] text-emerald-200">
                <Sparkles className="size-3.5" />
                Early Shout
              </p>
              <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-50 sm:text-5xl lg:text-6xl">
                <span className="brand-display block">EARLY</span>
                <span className="brand-display brand-display-gradient block">SHOUT.</span>
              </h1>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-300 sm:text-lg">
                See it early. Make the call. Build your football eye through quick decisions, challenges and the Player Market.
              </p>

              <div className="mt-7 overflow-hidden rounded-[1.6rem] border border-emerald-300/30 bg-[linear-gradient(135deg,rgba(16,185,129,.16),rgba(14,116,144,.1),rgba(255,255,255,.03))] p-4 shadow-[0_24px_70px_-38px_rgba(52,211,153,.8)] sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="relative mt-0.5 grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-300 text-slate-950 shadow-[0_10px_32px_-12px_rgba(110,231,183,.95)]">
                    <span aria-hidden="true" className="absolute inset-0 rounded-2xl ring-4 ring-emerald-300/15 motion-safe:animate-pulse" />
                    <Gamepad2 className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-200">Quick warm-up</p>
                    <h2 className="mt-1 text-xl font-black tracking-tight text-white">One stat. Two players. Your shout.</h2>
                    <p className="mt-1 text-sm leading-5 text-slate-300">Ten quick Football Duels with the answer shown straight away.</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-emerald-100/85">
                  <span className="rounded-full border border-white/10 bg-black/15 px-2.5 py-1">No sign-up</span>
                  <span className="rounded-full border border-white/10 bg-black/15 px-2.5 py-1">Instant answers</span>
                  <span className="rounded-full border border-white/10 bg-black/15 px-2.5 py-1">About 2 minutes</span>
                </div>
                <Link href="/quizzes/football-duels" aria-label="Play Football Duels now" className="group mt-4 flex min-h-16 w-full items-center justify-between gap-4 rounded-2xl bg-emerald-300 px-4 py-3 text-left text-slate-950 shadow-[0_18px_42px_-20px_rgba(110,231,183,.95)] outline-none transition hover:-translate-y-0.5 hover:bg-emerald-200 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a111e] sm:px-5">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-950 text-emerald-200 transition group-hover:scale-105">
                      <Play className="ml-0.5 size-4 fill-current" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-lg font-black tracking-tight">PLAY A QUICK DUEL</span>
                      <span className="block text-xs font-semibold text-slate-800/75">Your first duel is ready</span>
                    </span>
                  </span>
                  <ArrowRight className="size-5 shrink-0 transition group-hover:translate-x-1" aria-hidden="true" />
                </Link>
                <Link href="/quizzes" className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-200 outline-none transition hover:text-emerald-200 focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-300">
                  I want to choose a different game
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>

              {!user ? (
                <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-sky-300/20 bg-sky-400/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-300/10 text-sky-200"><UserPlus className="size-4" aria-hidden="true" /></span>
                    <div>
                      <p className="text-sm font-black text-white">Like your score? Keep it.</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">Create a free profile to save XP, levels and streaks—and claim your Founder Beta place.</p>
                    </div>
                  </div>
                  <Link href="/beta" className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-sky-200/20 bg-sky-200/10 px-4 text-xs font-black text-sky-100 outline-none transition hover:bg-sky-200/15 focus-visible:ring-2 focus-visible:ring-sky-200">Save my progress</Link>
                </div>
              ) : (
                <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-violet-300/20 bg-violet-400/[0.07] p-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.17em] text-violet-200">Welcome back</p>
                    <p className="mt-1 text-sm font-black text-white">Level {level.level.toLocaleString()} · {level.xpToNextLevel.toLocaleString()} XP to level {level.level + 1}</p>
                  </div>
                  <Zap className="size-5 shrink-0 text-violet-200" aria-hidden="true" />
                </div>
              )}
              <div className="mt-5 inline-flex max-w-full items-center gap-3 rounded-2xl border border-sky-300/20 bg-sky-400/[0.07] px-3.5 py-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.04)]">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-300/10 text-sky-200">
                  <Smartphone className="size-4.5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.17em] text-sky-200">Mobile app coming soon</span>
                  <span className="mt-0.5 block text-xs text-slate-400">The full beta is ready to play in your browser.</span>
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 rounded-3xl border border-white/10 bg-[#0a1422]/90 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-1">
            <HeroMetric label="What you learn" value="Better choices" hint="Referee, scout and coach games" />
            <HeroMetric label="Daily format" value="5 questions" hint="One challenge per day" />
            <HeroMetric label="Your progress" value="Level + rank" hint="See yourself improve" />
          </div>
        </section>

        <HomePlayJourney />

        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Featured experiences</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-100 sm:text-3xl">Pick a game and have a go.</h2>
            </div>
            <Link href="/quizzes" className="text-sm font-semibold text-emerald-300 transition hover:text-emerald-200">See all games</Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {featuredModes.map((mode) => {
              const Icon = mode.icon
              return (
                <Link key={mode.title} href={mode.href} className="group rounded-2xl border border-white/12 bg-[#0a1422]/95 p-5 transition hover:-translate-y-0.5 hover:border-emerald-300/45 hover:shadow-[0_22px_55px_-35px_rgba(16,185,129,.55)]">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex size-11 items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-400/10 text-emerald-200">
                      <Icon className="size-5" />
                    </span>
                    <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-300">Playable</span>
                  </div>
                  <h3 className="mt-4 text-xl font-black tracking-tight text-slate-100">{mode.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{mode.description}</p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">{mode.tag}</p>
                </Link>
              )
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="rounded-3xl border border-white/12 bg-[#0a1422]/96 p-5 sm:p-6">
            <div className="grid items-center gap-5 lg:grid-cols-[1.2fr_.8fr]">
              <div>
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  <CalendarDays className="size-4" />
                  Play every day
                </p>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-100">Come back tomorrow and keep your streak.</h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">Answer five questions each day. You earn XP and your streak grows when you return.</p>
                <Link href="/daily" className="mt-4 inline-flex h-10 items-center rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300">Play Daily Challenge</Link>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <StripStat label="Rank" value={user ? rank.current.title : 'Sign in'} />
                <StripStat label="Level" value={user ? level.level.toLocaleString() : 'Track it'} />
                <StripStat label="XP" value={user ? (profile?.xp ?? 0).toLocaleString() : 'Track it'} />
                <StripStat label="Streak" value={streakLabel} />
                <StripStat label="Accuracy" value={user ? accuracy : 'Track it'} />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 sm:pb-12 sm:pt-8">
          <div className="rounded-3xl border border-white/12 bg-[linear-gradient(140deg,rgba(8,16,28,.96),rgba(8,16,28,.8))] px-6 py-7 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Ready to start?</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-100">Ten quick duels. Start with one tap.</h2>
              </div>
              <Link href="/quizzes/football-duels" className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-400 px-5 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-300">
                Play now
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 sm:pb-12">
          <SponsorPlacement placement="home" />
        </section>

      </div>
    </main>
  )
}

function HeroMetric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-[#0d1a2b] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-black tracking-tight text-slate-100">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  )
}

function StripStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/12 bg-[#0d1a2b] px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  )
}

function formatAccuracy(correct: number, total: number): string {
  if (!total) {
    return '—'
  }
  return `${Math.round((correct / total) * 100)}%`
}

function formatDayCount(days: number): string {
  const safeDays = Number.isFinite(days) ? Math.max(0, days) : 0
  return `${safeDays} day${safeDays === 1 ? '' : 's'}`
}
