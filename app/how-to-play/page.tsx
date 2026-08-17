import type { Metadata } from 'next'
import Link from 'next/link'
import { BarChart3, BookOpenCheck, Gamepad2, LineChart, ShieldCheck, Sparkles, Trophy, Users } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { StartTourButton } from '@/components/start-tour-button'

export const metadata: Metadata = {
  title: 'How to Play',
  description: 'Simple instructions for every part of Early Shout.',
}

const waysToPlay = [
  { number: '1', title: 'Play a football game', copy: 'Open Games. Pick a challenge. Choose your answers and learn as you go.', href: '/quizzes', cta: 'Choose a game', icon: Gamepad2, colour: 'from-sky-400 to-indigo-500' },
  { number: '2', title: 'Build your Market team', copy: 'Use your free Market Credits to choose 11 players. Sell and change your team when you want.', href: '/market', cta: 'Open the Market', icon: LineChart, colour: 'from-emerald-400 to-teal-600' },
  { number: '3', title: 'Predict the matches', copy: 'Choose what you think will happen before kick-off. Correct picks score points.', href: '/predictions', cta: 'Make a prediction', icon: BarChart3, colour: 'from-amber-400 to-orange-500' },
  { number: '4', title: 'Grow your profile', copy: 'Earn XP, raise your level, reach new ranks and collect badges as you play.', href: '/profile', cta: 'See my profile', icon: Trophy, colour: 'from-violet-500 to-fuchsia-500' },
]

export default function HowToPlayPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="border-b border-border bg-[radial-gradient(circle_at_18%_0%,rgba(52,211,153,.22),transparent_34%),radial-gradient(circle_at_84%_15%,rgba(56,189,248,.16),transparent_30%)]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-primary">How to play</p>
            <h1 className="mt-4 text-4xl font-black leading-[.98] tracking-tight text-foreground sm:text-6xl">Learn the whole site in three minutes.</h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">Start with one thing. You do not need to learn everything at once, and you can always come back here.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <StartTourButton />
              <Link href="/quizzes" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-card px-5 font-bold text-foreground transition hover:border-primary/40">Start with a game</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          {waysToPlay.map((item) => {
            const Icon = item.icon
            return (
              <article key={item.title} className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-sm">
                <div className={`h-2 bg-gradient-to-r ${item.colour}`} />
                <div className="p-6 sm:p-7">
                  <div className="flex items-center gap-3">
                    <span className={`grid size-12 place-items-center rounded-2xl bg-gradient-to-br ${item.colour} font-black text-slate-950`}>{item.number}</span>
                    <Icon className="size-6 text-primary" aria-hidden="true" />
                  </div>
                  <h2 className="mt-5 text-2xl font-black tracking-tight text-foreground">{item.title}</h2>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{item.copy}</p>
                  <Link href={item.href} className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-bold text-foreground transition hover:border-primary/40 hover:bg-secondary/50">{item.cta}</Link>
                </div>
              </article>
            )
          })}
        </div>

        <section className="mt-10 rounded-[2rem] border border-border bg-[#071b18] p-6 text-white shadow-xl sm:p-8">
          <div className="flex items-center gap-2 text-emerald-300"><BookOpenCheck className="size-5" /><p className="text-xs font-black uppercase tracking-[0.22em]">The words you will see</p></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SimpleTerm title="XP" copy="Points that grow your level and rank." />
            <SimpleTerm title="Level" copy="Your regular progress number. It keeps going." />
            <SimpleTerm title="Rank" copy="A bigger title earned at XP milestones." />
            <SimpleTerm title="Market Credits" copy="Free points used to choose players. Never real money." />
          </div>
        </section>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <InfoCard icon={<ShieldCheck className="size-5" />} title="Can I lose real money?" copy="No. There are no deposits, cash prizes or withdrawals. Market Credits only work inside the game." />
          <InfoCard icon={<Users className="size-5" />} title="Can I play with friends?" copy="Yes. Market, quiz and prediction friend leagues let you compare with people you know." />
          <InfoCard icon={<Sparkles className="size-5" />} title="What should I try first?" copy="Try one quick Game. It is the easiest way to earn your first XP and see how feedback works." />
        </div>

        <div className="mt-10 rounded-3xl border border-border bg-card p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div><p className="font-black text-foreground">Need the detailed Market rules?</p><p className="mt-1 text-sm text-muted-foreground">See how teams, trades and price updates work.</p></div>
          <Link href="/game-rules" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-secondary px-4 text-sm font-bold text-foreground sm:mt-0">Read the Market rules</Link>
        </div>
      </section>
    </main>
  )
}

function SimpleTerm({ title, copy }: { title: string; copy: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><p className="font-black text-emerald-300">{title}</p><p className="mt-1 text-sm leading-relaxed text-slate-300">{copy}</p></div>
}

function InfoCard({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return <div className="rounded-3xl border border-border bg-card p-5"><div className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">{icon}</div><h3 className="mt-4 font-black text-foreground">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy}</p></div>
}
