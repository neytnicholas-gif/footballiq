import type { Metadata } from 'next'
import { ContactForm } from '@/components/contact-form'
import { SiteHeader } from '@/components/site-header'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Send Early Shout a question, beta report or content concern.',
}

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ topic?: string; subject?: string; message?: string }> }) {
  const params = await searchParams
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_15%_10%,rgba(16,185,129,.14),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(59,130,246,.12),transparent_30%),linear-gradient(160deg,#07131f,#0b1f2c_55%,#09251f)] text-white">
      <SiteHeader />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:py-20">
        <section className="rounded-[2rem] border border-white/10 bg-white/[.05] p-7 shadow-2xl shadow-black/20 sm:p-9">
          <p className="text-xs font-black uppercase tracking-[.24em] text-emerald-300">Talk to Early Shout</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">What can we help with?</h1>
          <p className="mt-5 leading-7 text-slate-300">Ask a question, report a problem or share beta feedback. Fill in the form and your message goes straight to the Early Shout inbox.</p>
          <div className="mt-8 space-y-3 text-sm text-slate-300">
            <p className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[.06] p-4"><strong className="text-white">Found a bug?</strong><br />Tell us the page, what you clicked and what happened.</p>
            <p className="rounded-2xl border border-sky-300/15 bg-sky-300/[.06] p-4"><strong className="text-white">Have an idea?</strong><br />Tell us what would make the game more fun or easier to use.</p>
            <p className="rounded-2xl border border-amber-300/15 bg-amber-300/[.06] p-4"><strong className="text-white">Content concern?</strong><br />Choose “Content or safety” so it reaches the right place.</p>
          </div>
        </section>
        <ContactForm
          initialTopic={params.topic === 'content' ? 'Content or safety' : params.topic === 'beta' ? 'Beta feedback' : 'General question'}
          initialSubject={(params.subject ?? '').slice(0, 120)}
          initialMessage={(params.message ?? '').slice(0, 4000)}
        />
      </div>
    </main>
  )
}
