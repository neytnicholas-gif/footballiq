'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Reveal } from '@/components/reveal'
import { cn } from '@/lib/utils'

type Pick = 'home' | 'draw' | 'away'

const fixtures = [
  { id: 1, home: 'Arsenal', away: 'Chelsea', comp: 'Premier League', time: 'Sat 17:30', probability: 58, accent: 'from-sky-400/20 via-cyan-400/10 to-transparent' },
  { id: 2, home: 'Real Madrid', away: 'Sevilla', comp: 'La Liga', time: 'Sat 20:00', probability: 72, accent: 'from-violet-400/20 via-fuchsia-400/10 to-transparent' },
  { id: 3, home: 'Inter', away: 'Napoli', comp: 'Serie A', time: 'Sun 18:45', probability: 46, accent: 'from-amber-400/20 via-orange-400/10 to-transparent' },
  { id: 4, home: 'Bayern', away: 'Dortmund', comp: 'Bundesliga', time: 'Sun 17:30', probability: 64, accent: 'from-emerald-400/20 via-lime-400/10 to-transparent' },
]

export function Predictions() {
  const [picks, setPicks] = useState<Record<number, Pick>>({})

  return (
    <section id="predictions" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-medium uppercase tracking-[0.32em] text-primary">
          Predictions
        </span>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Broadcast-style match centre.
        </h2>
        <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground">
          Each fixture feels like a live panel: probability bars, crisp pick controls and a polished match-day feel.
        </p>
      </Reveal>

      <div className="mx-auto mt-12 max-w-3xl space-y-3">
        {fixtures.map((fixture, i) => {
          const pick = picks[fixture.id]
          const setPick = (p: Pick) => setPicks((prev) => ({ ...prev, [fixture.id]: p }))
          return (
            <Reveal key={fixture.id} delay={i * 80}>
              <div className={`overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.08),_transparent_35%),linear-gradient(135deg,_rgba(6,12,24,0.98),_rgba(14,28,52,0.95))] p-5 shadow-[0_18px_55px_-28px_rgba(0,0,0,0.7)]`}>
                <div className={`h-1.5 rounded-full bg-gradient-to-r ${fixture.accent}`} />
                <div className="mt-4 flex items-center justify-between text-xs text-white/60">
                  <span>{fixture.comp}</span>
                  <span>{fixture.time}</span>
                </div>
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-white sm:text-base">{fixture.home}</span>
                    <span className="text-xs font-medium uppercase tracking-[0.24em] text-white/50">vs</span>
                    <span className="text-sm font-semibold text-white sm:text-base">{fixture.away}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:w-56">
                    {(['home', 'draw', 'away'] as Pick[]).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setPick(option)}
                        className={cn(
                          'flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium uppercase transition-all duration-200',
                          pick === option ? 'border-primary bg-primary text-primary-foreground' : 'border-white/10 bg-white/8 text-white/70 hover:border-primary/40 hover:text-white',
                        )}
                      >
                        {pick === option && <Check className="size-3" />}
                        {option === 'home' ? '1' : option === 'draw' ? 'X' : '2'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-white/50">
                    <span>Probability</span>
                    <span>{fixture.probability}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-sky-400" style={{ width: `${fixture.probability}%` }} />
                  </div>
                </div>
              </div>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
