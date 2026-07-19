import Link from 'next/link'
import { ArrowRight, EyeOff, Flame, Radar, Shield, Sparkles, Swords } from 'lucide-react'
import { Reveal } from '@/components/reveal'
import { cn } from '@/lib/utils'

type ModeCard = {
  title: string
  badge: string
  description: string
  href: string
  accent: string
  icon: typeof Shield
  preview: string
  panelClass: string
}

const modes: ModeCard[] = [
  {
    title: 'Referee Arena',
    badge: 'VAR night',
    description: 'Dark stadium drama with yellow and red card accents, floodlights and tactical decision panels.',
    href: '/quizzes/referee-decisions',
    accent: 'from-[#f7d44b]/25 via-[#ff6b3d]/10 to-transparent',
    icon: Shield,
    preview: 'VAR • Review • Cards',
    panelClass: 'border-amber-400/30 bg-[radial-gradient(circle_at_top_left,_rgba(247,212,75,0.22),_transparent_38%),linear-gradient(135deg,_rgba(4,7,16,0.98),_rgba(12,24,42,0.95))]',
  },
  {
    title: 'Scout Vision',
    badge: 'Analytics',
    description: 'A tactical pitch presentation with heat-map energy and scouting-dossier styling.',
    href: '/quizzes/would-you-scout-him',
    accent: 'from-cyan-400/20 via-sky-500/10 to-transparent',
    icon: Radar,
    preview: 'Heat map • Radar • Dossier',
    panelClass: 'border-cyan-400/30 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.2),_transparent_35%),linear-gradient(135deg,_rgba(4,12,20,0.97),_rgba(10,26,42,0.95))]',
  },
  {
    title: 'Football Duels',
    badge: 'Battle mode',
    description: 'Commanding player-card duels with a gold-and-purple battle frame and dramatic reveal.',
    href: '/quizzes/football-duels',
    accent: 'from-fuchsia-500/25 via-violet-500/10 to-transparent',
    icon: Swords,
    preview: 'Player card • VS • Reveal',
    panelClass: 'border-fuchsia-400/30 bg-[radial-gradient(circle_at_top_left,_rgba(192,132,252,0.24),_transparent_35%),linear-gradient(135deg,_rgba(25,10,44,0.98),_rgba(67,23,122,0.95))]',
  },
  {
    title: 'Guess the Player',
    badge: 'Mystery',
    description: 'Silhouette-first drama, blurred profiles and a dark blue-purple identity.',
    href: '/quizzes',
    accent: 'from-indigo-500/25 via-violet-500/10 to-transparent',
    icon: EyeOff,
    preview: 'Blur • Silhouette • ?',
    panelClass: 'border-indigo-400/30 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.24),_transparent_35%),linear-gradient(135deg,_rgba(7,10,28,0.98),_rgba(34,18,77,0.95))]',
  },
  {
    title: 'Predictions',
    badge: 'Match centre',
    description: 'Broadcast-style fixture cards with live probability bars and sharp matchday energy.',
    href: '/predictions',
    accent: 'from-sky-400/20 via-blue-500/10 to-transparent',
    icon: Sparkles,
    preview: 'Fixture • Odds • Live',
    panelClass: 'border-sky-400/30 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.2),_transparent_34%),linear-gradient(135deg,_rgba(4,12,22,0.98),_rgba(12,33,56,0.95))]',
  },
  {
    title: 'Daily Challenge',
    badge: 'Streak focus',
    description: 'Calendar-style momentum with flame visuals, rewards and XP-led progression.',
    href: '/daily',
    accent: 'from-orange-400/20 via-rose-500/10 to-transparent',
    icon: Flame,
    preview: 'Streak • XP • Reward',
    panelClass: 'border-orange-400/30 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.2),_transparent_34%),linear-gradient(135deg,_rgba(20,10,13,0.98),_rgba(58,19,27,0.95))]',
  },
]

export function ModeShowcase() {
  return (
    <section id="modes" className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
      <Reveal className="mx-auto max-w-3xl text-center">
        <span className="text-sm font-medium uppercase tracking-[0.32em] text-primary">FootballIQ modes</span>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          One premium hub, six football identities.
        </h2>
        <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          Every mode carries its own atmosphere, but the core loop stays familiar: quiz, learn, progress and compete.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {modes.map((mode, index) => {
          const Icon = mode.icon
          return (
            <Reveal key={mode.title} delay={index * 70} className="h-full">
              <Link
                href={mode.href}
                className={cn(
                  'group relative isolate z-10 flex h-full cursor-pointer flex-col overflow-hidden rounded-[28px] border p-6 text-left shadow-[0_20px_80px_-30px_rgba(0,0,0,0.7)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 pointer-events-auto',
                  mode.panelClass,
                )}
              >
                <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br', mode.accent)} />
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:18px_18px]" />
                <div className="relative z-10 flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/80">
                      <Icon className="size-3.5" />
                      {mode.badge}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.24em] text-white/70">
                      Live
                    </span>
                  </div>

                  <div className="mt-6 flex-1">
                    <h3 className="text-2xl font-semibold tracking-tight text-white">{mode.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-white/70">{mode.description}</p>
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.28em] text-white/60">
                      <span>Preview</span>
                      <span>Premium UI</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm font-medium text-white/85">
                      <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1">{mode.preview}</span>
                    </div>
                  </div>

                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors group-hover:text-white">
                    Explore mode
                    <ArrowRight className="size-4" />
                  </span>
                </div>
              </Link>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
