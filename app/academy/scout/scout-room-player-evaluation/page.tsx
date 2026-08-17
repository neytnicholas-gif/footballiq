import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { ScoutRoomExperience } from '@/components/academy/scout-room-experience'

export default function ScoutRoomPlayerEvaluationPage() {
  return (
    <main className="mode-shell mode-scout min-h-screen text-slate-100">
      <div className="mode-atmosphere" aria-hidden="true"><span /><span /><span /></div>
      <SiteHeader />
      <section className="relative mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-11">
        <ScoutRoomExperience />
        <div className="mt-5">
          <Link href="/academy/scout" className="inline-flex min-h-11 items-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 text-sm font-bold text-emerald-200 transition hover:bg-emerald-300/15">← Return to Scout Academy</Link>
        </div>
      </section>
    </main>
  )
}
