import Link from 'next/link'
import { ArrowRight, Brain, Flag, Gamepad2, GitBranch, Search, Sparkles, TrendingUp, Trophy, Workflow } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { duelPacks } from '@/lib/duel-packs'
import { careerQuestions, higherLowerItems, whoAmIQuestions } from '@/lib/game-data'
import { tacticalScenarios } from '@/lib/tactical-scenarios'
import { refereeScenarios } from '@/lib/referee-scenarios'
import { scoutScenarioCount } from '@/lib/scout-scenario-expansion'

const refereeQuestions = refereeScenarios
const scoutQuestions = { length: scoutScenarioCount }

const modes = [
  { title: 'Tactical Lab', description: 'Look at the match and pick what your team should do next.', href: '/quizzes/tactical-lab', icon: Workflow, accent: 'cyan', count: `${tacticalScenarios.length} scenarios`, duration: '8–12 min', skill: 'Tactics' },
  { title: 'Scout Vision', description: 'Read about a player and decide if your club should follow them.', href: '/quizzes/would-you-scout-him', icon: Brain, accent: 'emerald', count: `${scoutQuestions.length} dossiers`, duration: '10–15 min', skill: 'Scouting' },
  { title: 'Referee Arena', description: 'Choose the foul, card or restart. Then learn the rule.', href: '/quizzes/referee-decisions', icon: Flag, accent: 'amber', count: `${refereeQuestions.length} scenarios`, duration: '8–12 min', skill: 'Laws' },
  { title: 'Football Duels', description: 'Pick winners in fast stat battles across leagues, trophies and records.', href: '/quizzes/football-duels', icon: Trophy, accent: 'blue', count: `${duelPacks.length} packs`, duration: '5–10 min', skill: 'Knowledge' },
  { title: 'Daily Challenge', description: 'Answer today’s five questions and keep your streak going.', href: '/daily', icon: Sparkles, accent: 'amber', count: '5 questions', duration: 'Daily', skill: 'Mixed' },
  { title: 'Higher or Lower', description: 'Keep a streak alive by comparing one player record with the next.', href: '/quizzes/higher-or-lower', icon: TrendingUp, accent: 'rose', count: `${higherLowerItems.length} players`, duration: 'Quick run', skill: 'Stats' },
  { title: 'Who Am I?', description: 'Open clues and guess the hidden player before your points run out.', href: '/quizzes/who-am-i', icon: Search, accent: 'violet', count: `${whoAmIQuestions.length} players`, duration: '5–10 min', skill: 'Deduction' },
  { title: 'Career Path', description: 'Look at the clubs and guess which player had that career.', href: '/quizzes/career-path', icon: GitBranch, accent: 'sky', count: `${careerQuestions.length} careers`, duration: '5–10 min', skill: 'Recall' },
] as const

const accentStyles = {
  emerald: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200',
  amber: 'border-amber-300/25 bg-amber-300/10 text-amber-200',
  blue: 'border-blue-300/25 bg-blue-300/10 text-blue-200',
  rose: 'border-rose-300/25 bg-rose-300/10 text-rose-200',
  violet: 'border-violet-300/25 bg-violet-300/10 text-violet-200',
  sky: 'border-sky-300/25 bg-sky-300/10 text-sky-200',
  cyan: 'border-cyan-300/25 bg-cyan-300/10 text-cyan-200',
} as const

export default function QuizzesPage() {
  return (
    <main className="min-h-screen bg-[#07111f] text-slate-100">
      <SiteHeader />
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(16,185,129,.14),transparent_30rem),radial-gradient(circle_at_88%_20%,rgba(59,130,246,.13),transparent_28rem)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-11">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.22em] text-emerald-300"><Gamepad2 className="size-4" /> Games catalogue</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">What do you want to play?</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Pick any game below. They are all ready to play.</p>
            </div>
            <div className="flex gap-6 border-l border-slate-700 pl-5">
              <div><p className="text-2xl font-black text-white">{modes.length}</p><p className="text-xs text-slate-400">Playable games</p></div>
              <div><p className="text-2xl font-black text-emerald-300">0</p><p className="text-xs text-slate-400">Locked</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xl font-bold">Games</h2><p className="mt-1 text-sm text-slate-400">Tap a game to start.</p></div>
          <span className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">All systems ready</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {modes.map((mode) => {
            const Icon = mode.icon
            return (
              <article key={mode.title} className="group flex min-h-64 flex-col rounded-[1.35rem] border border-slate-700/75 bg-slate-900/65 p-5 shadow-[0_20px_60px_-45px_rgba(0,0,0,.9)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-500 hover:bg-slate-900 focus-within:border-emerald-300/50">
                <div className="flex items-start justify-between gap-3">
                  <span className={`flex size-11 items-center justify-center rounded-xl border ${accentStyles[mode.accent]}`}><Icon className="size-5" /></span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[11px] font-bold text-emerald-200"><span className="size-1.5 rounded-full bg-emerald-300" /> Playable</span>
                </div>
                <h3 className="mt-4 text-xl font-extrabold tracking-tight text-white">{mode.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{mode.description}</p>
                <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-700/70 pt-3 text-xs text-slate-400"><span>{mode.count}</span><span aria-hidden="true">·</span><span>{mode.duration}</span><span aria-hidden="true">·</span><span>{mode.skill}</span></div>
                <Link href={mode.href} className="mt-4 inline-flex min-h-10 items-center justify-between rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-950 outline-none transition hover:bg-white focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900">
                  Play {mode.title}<ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                </Link>
              </article>
            )
          })}
        </div>

        <div className="mt-5 rounded-2xl border border-slate-700/70 bg-slate-900/45 p-4 text-sm leading-relaxed text-slate-400">
          You can play without an account. Sign in if you want us to save your XP, scores and progress.
        </div>
      </section>
    </main>
  )
}
