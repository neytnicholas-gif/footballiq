'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BarChart3, CalendarCheck2, Gamepad2, LineChart, Radar, Scale, Sparkles, Workflow } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PLAY_PATH_EVENT, readPlayInterests } from '@/components/play-path-tracker'
import { emptyPlayInterestProfile, strongestPlayInterest, type PlayInterest, type PlayInterestProfile } from '@/lib/play-path'

type JourneyStep = { title: string; copy: string; href: string; label: string; icon: LucideIcon; colour: string }

const marketStart: JourneyStep = { title: 'Build your first XI', copy: 'Use your free game budget and choose the players you believe in.', href: '/market', label: 'Player Market', icon: LineChart, colour: 'emerald' }
const quickStart: JourneyStep = { title: 'Win a quick duel', copy: 'Choose between two players and see the answer straight away.', href: '/quizzes/football-duels', label: '2-minute game', icon: Gamepad2, colour: 'sky' }
const dailyStart: JourneyStep = { title: 'Make today’s five calls', copy: 'A short mixed challenge that grows your streak and level.', href: '/daily', label: 'Today', icon: CalendarCheck2, colour: 'amber' }

const journeys: Record<PlayInterest, JourneyStep[]> = {
  market: [
    { title: 'Check your starting XI', copy: 'See your roster, budget and value movement in one place.', href: '/market/roster', label: 'Continue your team', icon: LineChart, colour: 'emerald' },
    { title: 'Scout your next player', copy: 'Compare prices, positions and recent evidence before you buy.', href: '/market/players', label: 'Next signing', icon: Radar, colour: 'cyan' },
    dailyStart,
  ],
  tactics: [
    { title: 'Read the next tactical problem', copy: 'Make a team decision and learn why it works.', href: '/quizzes/tactical-lab', label: 'Tactical Lab', icon: Workflow, colour: 'cyan' },
    marketStart,
    { title: 'Predict the next matches', copy: 'Call the result before kick-off and climb the prediction table.', href: '/predictions', label: 'Match picks', icon: BarChart3, colour: 'violet' },
  ],
  referee: [
    { title: 'Take the referee’s next call', copy: 'Choose the foul, card or restart, then learn the rule.', href: '/quizzes/referee-decisions', label: 'Referee Arena', icon: Scale, colour: 'amber' },
    quickStart,
    marketStart,
  ],
  scouting: [
    { title: 'Open your next dossier', copy: 'Study the clues and decide whether the club should follow the player.', href: '/quizzes/would-you-scout-him', label: 'Scout Vision', icon: Radar, colour: 'emerald' },
    marketStart,
    dailyStart,
  ],
  'quick-games': [quickStart, marketStart, dailyStart],
  predictions: [
    { title: 'Make your next match picks', copy: 'Choose results before kick-off and follow your accuracy.', href: '/predictions', label: 'Predictions', icon: BarChart3, colour: 'violet' },
    marketStart,
    quickStart,
  ],
  daily: [dailyStart, marketStart, quickStart],
}

const accentClasses: Record<string, string> = {
  emerald: 'border-emerald-300/25 bg-emerald-300/[.07] text-emerald-200',
  sky: 'border-sky-300/25 bg-sky-300/[.07] text-sky-200',
  amber: 'border-amber-300/25 bg-amber-300/[.07] text-amber-200',
  cyan: 'border-cyan-300/25 bg-cyan-300/[.07] text-cyan-200',
  violet: 'border-violet-300/25 bg-violet-300/[.07] text-violet-200',
}

export function HomePlayJourney() {
  const [profile, setProfile] = useState<PlayInterestProfile>(emptyPlayInterestProfile)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const update = () => { setProfile(readPlayInterests()); setReady(true) }
    const timeout = window.setTimeout(update, 0)
    window.addEventListener(PLAY_PATH_EVENT, update)
    return () => { window.clearTimeout(timeout); window.removeEventListener(PLAY_PATH_EVENT, update) }
  }, [])

  const favourite = useMemo(() => strongestPlayInterest(profile), [profile])
  const steps = favourite ? journeys[favourite] : [marketStart, quickStart, dailyStart]

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8" aria-labelledby="your-next-moves-title">
      <div className="overflow-hidden rounded-3xl border border-white/12 bg-[linear-gradient(145deg,rgba(10,20,34,.98),rgba(7,14,24,.92))] p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-emerald-300"><Sparkles className="size-4" />{favourite ? 'Your path' : 'Start your story'}</p>
            <h2 id="your-next-moves-title" className="mt-2 text-2xl font-black text-white sm:text-3xl">{favourite ? 'Your next moves are ready.' : 'Three good ways to begin.'}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{favourite ? 'These suggestions adjust to the parts of Early Shout you use most.' : 'Start with the Player Market, then try a quick game or today’s challenge.'}</p>
          </div>
          {ready && favourite ? <p className="max-w-xs text-xs leading-5 text-slate-500">Based only on play saved in this browser. Nothing is sent elsewhere.</p> : null}
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon
            return <Link key={`${step.href}-${index}`} href={step.href} className={`group rounded-2xl border p-4 outline-none transition hover:-translate-y-0.5 hover:border-white/35 focus-visible:ring-2 focus-visible:ring-emerald-300 ${accentClasses[step.colour]}`}>
              <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-black/20"><Icon className="size-5" /></span><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.17em] opacity-80">Move {index + 1} · {step.label}</p><h3 className="mt-1 text-lg font-black text-white">{step.title}</h3><p className="mt-1 text-sm leading-5 text-slate-400">{step.copy}</p></div></div>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-black">Play next <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span>
            </Link>
          })}
        </div>
      </div>
    </section>
  )
}
