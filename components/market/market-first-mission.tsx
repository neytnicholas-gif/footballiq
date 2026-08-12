'use client'

import Link from 'next/link'
import { Check, Circle, Flag, Trophy } from 'lucide-react'

type MissionStep = {
  label: string
  detail: string
  href: string
  action: string
  complete: boolean
}

export function MarketFirstMission({
  visitedMarket,
  hasFirstPlayer,
  hasFullTeam,
  visitedRoster,
}: {
  visitedMarket: boolean
  hasFirstPlayer: boolean
  hasFullTeam: boolean
  visitedRoster: boolean
}) {
  const steps: MissionStep[] = [
    { label: 'Explore the Market', detail: 'Find a player you believe in.', href: '/market/players', action: 'Open Market', complete: visitedMarket },
    { label: 'Make your first signing', detail: 'Buy one player for your team.', href: '/market/players', action: 'Choose a player', complete: hasFirstPlayer },
    { label: 'Build your starting XI', detail: 'Fill every place in your formation.', href: '/market/players', action: 'Finish my XI', complete: hasFullTeam },
    { label: 'Check your roster', detail: 'See your full team and budget.', href: '/market/roster', action: 'Open roster', complete: visitedRoster },
  ]
  const completeCount = steps.filter((step) => step.complete).length
  const nextStep = steps.find((step) => !step.complete)

  return (
    <section aria-labelledby="first-mission-title" className="overflow-hidden rounded-[2rem] border border-emerald-900/15 bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 text-white shadow-xl shadow-emerald-950/10">
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[.72fr_1.28fr] lg:items-center">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.22em] text-emerald-300"><Flag className="size-4" /> First mission</p>
          <h2 id="first-mission-title" className="mt-3 text-3xl font-black tracking-tight">Build your first team.</h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-emerald-50/75">Four simple steps. Your progress saves automatically.</p>
          <div className="mt-5" aria-label={`${completeCount} of 4 first mission steps complete`}>
            <div className="flex items-center justify-between text-xs font-bold"><span>{completeCount}/4 complete</span><span>{completeCount === 4 ? 'Mission complete' : `${Math.round((completeCount / 4) * 100)}%`}</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-emerald-300 transition-[width] duration-500" style={{ width: `${completeCount * 25}%` }} /></div>
          </div>
          {completeCount === 4 ? <p className="mt-5 flex items-center gap-2 rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-100"><Trophy className="size-5" /> First mission complete. Your XI is ready.</p> : nextStep ? <Link href={nextStep.href} className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-emerald-300 px-5 py-2.5 text-sm font-black text-emerald-950 transition hover:bg-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">{nextStep.action}</Link> : null}
        </div>
        <ol className="grid gap-3 sm:grid-cols-2">
          {steps.map((step, index) => <li key={step.label} className={`rounded-2xl border p-4 ${step.complete ? 'border-emerald-300/25 bg-emerald-300/10' : nextStep?.label === step.label ? 'border-white/35 bg-white/10' : 'border-white/10 bg-black/10'}`}>
            <div className="flex gap-3">
              <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${step.complete ? 'bg-emerald-300 text-emerald-950' : 'border border-white/25 text-white/75'}`}>{step.complete ? <Check className="size-4" /> : <Circle className="size-3" />}</span>
              <div><p className="text-xs font-bold uppercase tracking-widest text-emerald-200">Step {index + 1}</p><p className="mt-1 font-black">{step.label}</p><p className="mt-1 text-xs leading-5 text-emerald-50/65">{step.complete ? 'Done' : step.detail}</p></div>
            </div>
          </li>)}
        </ol>
      </div>
    </section>
  )
}
