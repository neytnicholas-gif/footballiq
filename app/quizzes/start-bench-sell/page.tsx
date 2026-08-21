import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, EyeOff, MousePointerClick, Users } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { StartBenchSellGame } from '@/components/start-bench-sell-game'
import { BRAND } from '@/lib/brand'

const title = 'Make the Call: Start One, Bench One, Sell One | Early Shout'
const description = 'Choose who starts, who gets benched and who gets sold—then see how your football decisions compare with the Early Shout community.'
const canonical = `${BRAND.siteUrl}/quizzes/start-bench-sell`

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical },
  openGraph: { title, description, url: canonical, siteName: BRAND.name, type: 'website', images: [{ url: BRAND.socialImage }] },
  twitter: { card: 'summary_large_image', title, description, images: [BRAND.socialImage] },
}
export default function StartBenchSellPage() {
  return <main className="min-h-screen bg-[#07111f] text-slate-100">
    <SiteHeader />
    <section className="relative overflow-hidden border-b border-white/5">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(52,211,153,.16),transparent_30rem),radial-gradient(circle_at_88%_12%,rgba(96,165,250,.13),transparent_28rem)]" />
      <div className="relative mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
        <Link href="/quizzes" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-300 transition hover:text-white"><ArrowLeft className="size-4" aria-hidden="true" />All games</Link>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl"><p className="text-xs font-black uppercase tracking-[.24em] text-emerald-300">Make the Call</p><h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-5xl">Three players. Three jobs. One call.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Start one, bench one and sell one. Lock in your football judgement before the Early Shout crowd appears.</p></div>
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-slate-300 sm:text-xs"><span className="rounded-xl border border-white/10 bg-white/5 px-3 py-3"><MousePointerClick className="mx-auto mb-1 size-4 text-emerald-300" />Tap to choose</span><span className="rounded-xl border border-white/10 bg-white/5 px-3 py-3"><EyeOff className="mx-auto mb-1 size-4 text-amber-300" />Votes hidden</span><span className="rounded-xl border border-white/10 bg-white/5 px-3 py-3"><Users className="mx-auto mb-1 size-4 text-blue-300" />Real results</span></div>
        </div>
      </div>
    </section>
    <section className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-8"><StartBenchSellGame /><p className="mx-auto mt-4 max-w-3xl text-center text-xs leading-5 text-slate-500">Community percentages use completed calls only. No player photographs are used in this beta treatment.</p></section>
  </main>
}
