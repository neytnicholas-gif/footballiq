import Link from 'next/link'
import { ArrowRight, Brain, Clock3, FileSearch2 } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { ScoutGame } from '@/components/scout-game'
import { scoutScenarioCount } from '@/lib/scout-scenario-expansion'

export default function Page() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07111f] text-slate-100">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_2%,rgba(16,185,129,.16),transparent_30rem),radial-gradient(circle_at_90%_15%,rgba(56,189,248,.13),transparent_28rem),linear-gradient(180deg,#07111f_0%,#081522_48%,#07111f_100%)]" />
      <SiteHeader />
      <section className="relative mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="overflow-hidden rounded-[1.75rem] border border-emerald-300/20 bg-[linear-gradient(135deg,rgba(13,30,44,.98),rgba(8,19,33,.96))] shadow-[0_28px_80px_-52px_rgba(16,185,129,.75)]">
          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[.2em] text-emerald-200">
                <Brain className="size-3.5" aria-hidden="true" /> Quiz · Scouting
              </p>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">Would you scout this player?</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Read the notes, make the call, then see what a scout would notice.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:min-w-[25rem]">
              <HeroStat icon={FileSearch2} label="Dossiers" value={scoutScenarioCount.toLocaleString()} />
              <HeroStat icon={Clock3} label="A full run" value="10–15 min" />
              <HeroStat icon={Brain} label="Skill" value="Scouting" className="col-span-2 sm:col-span-1" />
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-white/10 bg-white/[.025] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div>
              <p className="text-sm font-black text-slate-100">Want to practise the report as well?</p>
              <p className="mt-0.5 text-xs text-slate-400">Scout Room helps you write your own report and compare it with an example.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/academy/scout/scout-room-player-evaluation" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200">Open Scout Room <ArrowRight className="size-4" aria-hidden="true" /></Link>
              <Link href="/academy/scout" className="inline-flex min-h-10 items-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">All scout lessons</Link>
            </div>
          </div>
        </div>
        <div className="mt-5">
          <ScoutGame />
        </div>
      </section>
    </main>
  )
}

function HeroStat({ icon: Icon, label, value, className = '' }: { icon: typeof Brain; label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-[#0d1c2c] p-3 ${className}`}>
      <div className="flex items-center gap-2 text-emerald-300"><Icon className="size-3.5" aria-hidden="true" /><p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">{label}</p></div>
      <p className="mt-1.5 text-sm font-black text-white">{value}</p>
    </div>
  )
}
