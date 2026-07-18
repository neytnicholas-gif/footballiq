'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Reveal } from '@/components/reveal'
import { cn } from '@/lib/utils'

type Pick = 'home' | 'draw' | 'away'

const fixtures = [
  { id: 1, home: 'Arsenal', away: 'Chelsea', comp: 'Premier League', time: 'Sat 17:30' },
  { id: 2, home: 'Real Madrid', away: 'Sevilla', comp: 'La Liga', time: 'Sat 20:00' },
  { id: 3, home: 'Inter', away: 'Napoli', comp: 'Serie A', time: 'Sun 18:45' },
  { id: 4, home: 'Bayern', away: 'Dortmund', comp: 'Bundesliga', time: 'Sun 17:30' },
]

export function Predictions() {
  const [picks, setPicks] = useState<Record<number, Pick>>({})

  return (
    <section id="predictions" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-medium uppercase tracking-widest text-primary">
          Prediction Game
        </span>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Call the upcoming fixtures
        </h2>
        <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
          Lock in your predictions and climb the global leaderboard.
        </p>
      </Reveal>

      <div className="mx-auto mt-12 max-w-3xl space-y-3">
        {fixtures.map((fixture, i) => {
          const pick = picks[fixture.id]
          const setPick = (p: Pick) =>
            setPicks((prev) => ({ ...prev, [fixture.id]: p }))
          return (
            <Reveal
              key={fixture.id}
              delay={i * 80}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{fixture.comp}</span>
                <span>{fixture.time}</span>
              </div>
              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center justify-between gap-3">
                  <span className="text-sm font-semibold sm:text-base">{fixture.home}</span>
                  <span className="text-xs font-medium text-muted-foreground">vs</span>
                  <span className="text-sm font-semibold sm:text-base">{fixture.away}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:w-56">
                  {(['home', 'draw', 'away'] as Pick[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setPick(option)}
                      className={cn(
                        'flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium uppercase transition-all duration-200',
                        pick === option
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-secondary/50 text-muted-foreground hover:border-primary/40 hover:text-foreground',
                      )}
                    >
                      {pick === option && <Check className="size-3" />}
                      {option === 'home' ? '1' : option === 'draw' ? 'X' : '2'}
                    </button>
                  ))}
                </div>
              </div>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
