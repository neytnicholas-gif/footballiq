import type { Metadata } from 'next'
import Link from 'next/link'
import { Gamepad2, GitBranch, ListChecks, Search, Sparkles, TrendingUp, Trophy } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { PlayModeCard, type PlayMode } from '@/components/play-mode-card'
import { coreDuelPacks, reserveDuelPacks } from '@/lib/duel-packs'
import { careerQuestions, higherLowerItems, whoAmIQuestions } from '@/lib/game-data'
import { MAKE_CALL_TOTAL_ROUNDS } from '@/lib/make-call-catalogue'

export const metadata: Metadata = {
  title: 'Football Games',
  description: 'Play fast football games for calls, scores and streaks on Early Shout.',
}

const games: PlayMode[] = [
  { title: 'Make the Call', description: 'Start one. Bench one. Sell one—then unlock the real crowd vote.', href: '/quizzes/start-bench-sell', icon: ListChecks, accent: 'emerald', count: `${MAKE_CALL_TOTAL_ROUNDS} calls`, duration: '10–20 sec', skill: 'Judgement' },
  { title: 'Football Duels', description: 'Pick winners in fast stat battles, master a theme and unlock Extra Time packs.', href: '/quizzes/football-duels', icon: Trophy, accent: 'blue', count: `${coreDuelPacks.length} core + ${reserveDuelPacks.length} Extra Time`, duration: '5–10 min', skill: 'Knowledge' },
  { title: 'Higher or Lower', description: 'Keep a streak alive by comparing one player record with the next.', href: '/quizzes/higher-or-lower', icon: TrendingUp, accent: 'rose', count: `${higherLowerItems.length} cards · 10 decks`, duration: 'Quick run', skill: 'Stats' },
  { title: 'Who Am I?', description: 'Open clues and guess the hidden player before your points run out.', href: '/quizzes/who-am-i', icon: Search, accent: 'violet', count: `${whoAmIQuestions.length} players · 10 sets`, duration: '5–10 min', skill: 'Deduction' },
  { title: 'Career Path', description: 'Look at the clubs and guess which player had that career.', href: '/quizzes/career-path', icon: GitBranch, accent: 'sky', count: `${careerQuestions.length} careers · 10 routes`, duration: '5–10 min', skill: 'Recall' },
]

export default function GamesPage() {
  return (
    <main className="min-h-screen bg-[#07111f] text-slate-100">
      <SiteHeader />
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(16,185,129,.16),transparent_30rem),radial-gradient(circle_at_88%_20%,rgba(59,130,246,.14),transparent_28rem)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-11">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.22em] text-emerald-300"><Gamepad2 className="size-4" /> Games</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Make the call. Chase the streak.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Quick football games made for instant decisions. Start with the crowd game, or choose another run.</p>
          <Link href="/quizzes/start-bench-sell" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-300 px-5 text-sm font-black text-slate-950 shadow-[0_18px_45px_-20px_rgba(110,231,183,.9)] transition hover:-translate-y-0.5 hover:bg-emerald-200"><Sparkles className="size-4" /> Play Make the Call now</Link>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9">
        <div className="mb-5"><h2 className="text-xl font-bold">Choose a game</h2><p className="mt-1 text-sm text-slate-400">Games are for quick choices, scores and streaks. Quizzes live in their own section.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{games.map((mode) => <PlayModeCard key={mode.title} mode={mode} kind="game" />)}</div>
        <div className="mt-5 rounded-2xl border border-slate-700/70 bg-slate-900/45 p-4 text-sm leading-relaxed text-slate-400">You can play without an account. Sign in to save XP, scores and progress.</div>
      </section>
    </main>
  )
}
