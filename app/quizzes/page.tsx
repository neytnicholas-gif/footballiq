import type { Metadata } from 'next'
import Link from 'next/link'
import { Brain, CircleDotDashed, Flag, Gamepad2, Globe2, Link2, ListOrdered, ShieldQuestion, Sparkles, Target, Users, Workflow } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { PlayModeCard, type PlayMode } from '@/components/play-mode-card'
import { tacticalScenarios } from '@/lib/tactical-scenarios'
import { refereeScenarios } from '@/lib/referee-scenarios'
import { scoutScenarioCount } from '@/lib/scout-scenario-expansion'
import { quizLabQuestionBank } from '@/lib/quiz-lab'

export const metadata: Metadata = {
  title: 'Football Quizzes',
  description: 'Learn through referee, tactical, scouting and football-knowledge quizzes on Early Shout.',
}

const quizzes: PlayMode[] = [
  { title: 'Tactical Lab', description: 'Look at the match and pick what your team should do next.', href: '/quizzes/tactical-lab', icon: Workflow, accent: 'cyan', count: `${tacticalScenarios.length} scenarios`, duration: '8–12 min', skill: 'Tactics' },
  { title: 'Scout Vision', description: 'Read about a player and decide if your club should follow them.', href: '/quizzes/would-you-scout-him', icon: Brain, accent: 'emerald', count: `${scoutScenarioCount} dossiers`, duration: '10–15 min', skill: 'Scouting' },
  { title: 'Referee Arena', description: 'Choose the foul, card or restart. Then learn the rule.', href: '/quizzes/referee-decisions', icon: Flag, accent: 'amber', count: `${refereeScenarios.length} scenarios`, duration: '8–12 min', skill: 'Laws' },
  { title: 'Daily Challenge', description: 'Answer today’s five questions and keep your streak going.', href: '/daily', icon: Sparkles, accent: 'amber', count: '5 questions', duration: 'Daily', skill: 'Mixed' },
  { title: 'League World', description: 'Travel through 24 leagues, including all four nationwide English divisions.', href: '/quizzes/league-world', icon: Globe2, accent: 'blue', count: '24 league rooms', duration: '15 questions each', skill: 'World football' },
  { title: 'Odd One Out', description: 'Spot the role, rule or football idea that does not belong.', href: '/quizzes/quiz-lab/odd-one-out', icon: CircleDotDashed, accent: 'cyan', count: `${quizLabQuestionBank['odd-one-out'].length} challenges`, duration: '12 per round', skill: 'Patterns' },
  { title: 'Truth Trap', description: 'Three statements are sound. Find the one false football claim.', href: '/quizzes/quiz-lab/truth-trap', icon: ShieldQuestion, accent: 'rose', count: `${quizLabQuestionBank['truth-trap'].length} challenges`, duration: '12 per round', skill: 'Careful reading' },
  { title: 'Order the Play', description: 'Build a decision, routine or team move in the correct order.', href: '/quizzes/quiz-lab/order-the-play', icon: ListOrdered, accent: 'amber', count: `${quizLabQuestionBank['order-the-play'].length} challenges`, duration: '12 per round', skill: 'Sequences' },
  { title: 'Link-Up Board', description: 'Connect four football roles, rules or clues to their correct partners.', href: '/quizzes/quiz-lab/link-up', icon: Link2, accent: 'violet', count: `${quizLabQuestionBank['link-up'].length} boards`, duration: '12 per round', skill: 'Connections' },
  { title: 'Formation Fix', description: 'See the problem area on the pitch and choose the missing role.', href: '/quizzes/quiz-lab/formation-fix', icon: Target, accent: 'emerald', count: `${quizLabQuestionBank['formation-fix'].length} pitch problems`, duration: '12 per round', skill: 'Shape reading' },
]

export default function QuizzesPage() {
  return (
    <main className="min-h-screen bg-[#07111f] text-slate-100">
      <SiteHeader />
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(16,185,129,.14),transparent_30rem),radial-gradient(circle_at_88%_20%,rgba(59,130,246,.13),transparent_28rem)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-11">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.22em] text-emerald-300"><Brain className="size-4" /> Quizzes</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Test your football brain.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Choose a topic, pick one of five levels and learn at your pace. Looking for scores and streaks? Games now has its own home.</p>
            </div>
            <div className="flex items-center gap-5 border-l border-slate-700 pl-5">
              <div><p className="text-2xl font-black text-white">{quizzes.length}</p><p className="text-xs text-slate-400">Quiz modes</p></div>
              <Link href="/games" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-300/25 bg-blue-300/10 px-4 text-sm font-black text-blue-100 transition hover:bg-blue-300/20"><Gamepad2 className="size-4" /> Go to Games</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9">
        <div className="mb-7 flex flex-col gap-4 rounded-[1.5rem] border border-cyan-300/20 bg-[linear-gradient(120deg,rgba(34,211,238,.1),rgba(168,85,247,.08))] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[.18em] text-cyan-300">Play together</p><h2 className="mt-1 text-xl font-black text-white">Build a quiz mini league.</h2><p className="mt-1 text-sm text-slate-400">Pick the quiz types, scoring rule, time window and League World rooms.</p></div>
          <Link href="/quizzes/leagues" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-black text-slate-950"><Users className="size-4" /> Make a quiz league</Link>
        </div>
        <div className="mb-5"><h2 className="text-xl font-bold">Choose a quiz</h2><p className="mt-1 text-sm text-slate-400">Make a decision, see the answer and learn why.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{quizzes.map((mode) => <PlayModeCard key={mode.title} mode={mode} kind="quiz" />)}</div>
        <div className="mt-5 rounded-2xl border border-slate-700/70 bg-slate-900/45 p-4 text-sm leading-relaxed text-slate-400">You can play without an account. Sign in if you want us to save your XP, scores and progress.</div>
      </section>
    </main>
  )
}
