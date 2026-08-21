import type { LucideIcon } from 'lucide-react'
import { ArrowRight, Gamepad2 } from 'lucide-react'
import Link from 'next/link'

const accentStyles = {
  emerald: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200',
  amber: 'border-amber-300/25 bg-amber-300/10 text-amber-200',
  blue: 'border-blue-300/25 bg-blue-300/10 text-blue-200',
  rose: 'border-rose-300/25 bg-rose-300/10 text-rose-200',
  violet: 'border-violet-300/25 bg-violet-300/10 text-violet-200',
  sky: 'border-sky-300/25 bg-sky-300/10 text-sky-200',
  cyan: 'border-cyan-300/25 bg-cyan-300/10 text-cyan-200',
} as const

export type PlayMode = {
  title: string
  description: string
  href: string
  icon: LucideIcon
  accent: keyof typeof accentStyles
  count: string
  duration: string
  skill: string
}
export function PlayModeCard({ mode, kind }: { mode: PlayMode; kind: 'game' | 'quiz' }) {
  const Icon = mode.icon
  return (
    <article className="group flex min-h-64 flex-col rounded-[1.35rem] border border-slate-700/75 bg-slate-900/65 p-5 shadow-[0_20px_60px_-45px_rgba(0,0,0,.9)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-500 hover:bg-slate-900 focus-within:border-emerald-300/50">
      <div className="flex items-start justify-between gap-3">
        <span className={`flex size-11 items-center justify-center rounded-xl border ${accentStyles[mode.accent]}`}><Icon className="size-5" /></span>
        {kind === 'game'
          ? <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300/20 bg-blue-300/10 px-2.5 py-1 text-[11px] font-bold text-blue-200"><Gamepad2 className="size-3" /> Game</span>
          : <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[11px] font-bold text-emerald-200"><span className="size-1.5 rounded-full bg-emerald-300" /> Playable</span>}
      </div>
      <h3 className="mt-4 text-xl font-extrabold tracking-tight text-white">{mode.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{mode.description}</p>
      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-700/70 pt-3 text-xs text-slate-400">
        {kind === 'quiz' ? <><span className="font-bold text-cyan-200">{mode.title === 'Daily Challenge' ? 'One fair daily level' : '5 difficulty levels'}</span><span aria-hidden="true">·</span></> : null}
        <span>{mode.count}</span><span aria-hidden="true">·</span><span>{mode.duration}</span><span aria-hidden="true">·</span><span>{mode.skill}</span>
      </div>
      <Link href={mode.href} className="mt-4 inline-flex min-h-11 items-center justify-between rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-950 outline-none transition hover:bg-white focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900">
        Play {mode.title}<ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
      </Link>
    </article>
  )
}
