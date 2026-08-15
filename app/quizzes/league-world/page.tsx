import { Globe2 } from 'lucide-react'
import { LeagueWorld } from '@/components/league-world'
import { SiteHeader } from '@/components/site-header'

export default function LeagueWorldPage() {
  return (
    <main className="min-h-screen bg-[#07111f] text-slate-100">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-11">
        <div className="mb-7 max-w-3xl">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.22em] text-cyan-300"><Globe2 className="size-4" /> League World</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">How far does your football knowledge travel?</h1>
          <p className="mt-4 text-base leading-7 text-slate-300">Choose a league, answer five clear questions and earn XP. Start with England, then travel through 24 competitions.</p>
        </div>
        <LeagueWorld />
      </section>
    </main>
  )
}
