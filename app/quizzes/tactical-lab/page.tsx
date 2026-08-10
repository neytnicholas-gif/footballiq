import { TacticalLab } from '@/components/tactical-lab'
import { SiteHeader } from '@/components/site-header'

export const metadata = { title: 'Tactical Lab | FootballIQ', description: 'Practise build-up, pressing, transition and game-state decisions.' }

export default function TacticalLabPage() {
  return <main className="min-h-screen bg-[#07111f] text-slate-100"><SiteHeader /><section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12"><p className="text-xs font-bold uppercase tracking-[.22em] text-cyan-300">Tactical Lab</p><h1 className="mt-3 text-3xl font-black sm:text-5xl">Read the game. Choose the next action.</h1><p className="mt-3 max-w-2xl text-slate-300">A 150-scenario bank across build-up, pressing, transitions, overloads, set pieces and game management. Each run selects 10 decisions and teaches the football principle behind every choice.</p><div className="mt-8"><TacticalLab /></div></section></main>
}
