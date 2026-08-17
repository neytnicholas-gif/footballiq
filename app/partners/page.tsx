import type { Metadata } from 'next'
import Link from 'next/link'
import { BarChart3, Check, Mail, ShieldCheck, Smartphone, Sparkles, Users } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { BRAND } from '@/lib/brand'

export const metadata: Metadata = {
  title: 'Partner with Early Shout',
  description: 'Sponsor an independent football knowledge and player-market game without interrupting play.',
}

const opportunities = [
  { title: 'Founding partner', description: 'A visible launch relationship across selected high-attention pages, agreed with you before publishing.', icon: Sparkles },
  { title: 'Game sponsor', description: 'Support a quiz, Daily Challenge or seasonal challenge with a clearly labelled message outside active play.', icon: Users },
  { title: 'Content partner', description: 'Support an original Early Shout learning series. Editorial answers and game outcomes always stay independent.', icon: BarChart3 },
]

const standards = [
  'Every paid placement is clearly labelled as an advertisement.',
  'No sponsor message sits beside a Buy, Sell or confirm-trade button.',
  'No betting, cash-investment, tobacco, adult or misleading offers.',
  'No behavioural targeting or third-party tracking by default.',
  'No claim of league, club or player endorsement without written permission.',
  'Creative is reviewed for mobile, tablet and desktop before it goes live.',
]

export default function PartnersPage() {
  const subject = encodeURIComponent('Early Shout partnership enquiry')
  return (
    <main className="min-h-screen bg-[#060b13] text-slate-100">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="overflow-hidden rounded-[2rem] border border-white/12 bg-[radial-gradient(circle_at_12%_10%,rgba(16,185,129,.18),transparent_38%),linear-gradient(145deg,#0b1727,#08111e)] p-6 shadow-2xl sm:p-10">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200"><ShieldCheck className="size-4" /> Partnerships</p>
          <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">Reach football fans without getting in the way of the game.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">Early Shout is building a free football-learning audience and a player-value game. We are opening a small number of honest, clearly labelled launch partnerships.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href={`mailto:${BRAND.partnershipEmail}?subject=${subject}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"><Mail className="size-4" /> Discuss a partnership</a>
            <Link href="/" className="inline-flex min-h-11 items-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-bold transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">Explore Early Shout</Link>
          </div>
        </div>
        <section className="mt-8" aria-labelledby="partner-options">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Ways to work together</p>
          <h2 id="partner-options" className="mt-2 text-3xl font-black">Simple packages, built around real attention.</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {opportunities.map(({ title, description, icon: Icon }) => <article key={title} className="rounded-2xl border border-white/12 bg-[#0b1727] p-5"><span className="flex size-11 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-200"><Icon className="size-5" /></span><h3 className="mt-4 text-xl font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-300">{description}</p></article>)}
          </div>
        </section>
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <section className="rounded-3xl border border-white/12 bg-[#0b1727] p-6" aria-labelledby="standards"><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Our promise to players</p><h2 id="standards" className="mt-2 text-2xl font-black">Sponsorship people can trust.</h2><ul className="mt-5 space-y-3">{standards.map((standard) => <li key={standard} className="flex gap-3 text-sm leading-6 text-slate-300"><Check className="mt-1 size-4 shrink-0 text-emerald-300" aria-hidden="true" /><span>{standard}</span></li>)}</ul></section>
          <section className="rounded-3xl border border-white/12 bg-[#0b1727] p-6" aria-labelledby="measurement"><p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300">Clear reporting</p><h2 id="measurement" className="mt-2 text-2xl font-black">Only verified numbers.</h2><p className="mt-3 text-sm leading-6 text-slate-300">We will share current, dated audience figures when we speak. We will not publish invented reach, inflated users or guaranteed results.</p><div className="mt-5 grid gap-3"><Fact icon={Smartphone} text="Responsive placements on phone, tablet and desktop" /><Fact icon={BarChart3} text="Views and outbound clicks reported separately" /><Fact icon={ShieldCheck} text="Creative approval and a written campaign record" /></div></section>
        </div>
        <section className="mt-8 rounded-3xl border border-emerald-300/25 bg-emerald-400/10 p-6 text-center sm:p-8"><h2 className="text-2xl font-black">Interested in helping Early Shout launch?</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-300">Tell us about your brand, audience and idea. We will reply with suitable placements and current audience data.</p><a href={`mailto:${BRAND.partnershipEmail}?subject=${subject}`} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-emerald-300"><Mail className="size-4" /> {BRAND.partnershipEmail}</a></section>
      </section>
    </main>
  )
}

function Fact({ icon: Icon, text }: { icon: typeof Smartphone; text: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300"><Icon className="size-4 shrink-0 text-sky-300" aria-hidden="true" /><span>{text}</span></div>
}
