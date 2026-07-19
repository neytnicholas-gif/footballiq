'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { supabase } from '@/lib/supabase'

type Pick = 'home' | 'draw' | 'away'
type Fixture = {
  id: string
  home: string
  away: string
  competition: string
  kickoff: string
}

const fixtures: Fixture[] = [
  { id: 'fixture-1', home: 'Manchester City', away: 'Liverpool', competition: 'Simulation challenge', kickoff: 'Sat 17:30' },
  { id: 'fixture-2', home: 'Real Madrid', away: 'Barcelona', competition: 'Simulation challenge', kickoff: 'Sat 20:00' },
  { id: 'fixture-3', home: 'Inter', away: 'Milan', competition: 'Simulation challenge', kickoff: 'Sun 18:45' },
  { id: 'fixture-4', home: 'Bayern Munich', away: 'Borussia Dortmund', competition: 'Simulation challenge', kickoff: 'Sun 17:30' },
  { id: 'fixture-5', home: 'Arsenal', away: 'Chelsea', competition: 'Simulation challenge', kickoff: 'Mon 20:00' },
]

export function PredictionsGame() {
  const { user } = useAuth()
  const [picks, setPicks] = useState<Record<string, Pick>>({})
  const [confidence, setConfidence] = useState<Record<string, number>>({})
  const [saved, setSaved] = useState(false)
  const [locked, setLocked] = useState(false)
  const [history, setHistory] = useState<Array<{ set: string; picks: number }>>([])
  const predictionSet = useMemo(() => new Date().toISOString().slice(0, 10), [])

  useEffect(() => {
    if (!user) return
    void (async () => {
      const { data } = await supabase.from('predictions').select('fixture_id,pick').eq('user_id', user.id).eq('prediction_set', predictionSet)
      if (data) setPicks(Object.fromEntries(data.map((r: { fixture_id: string; pick: Pick }) => [r.fixture_id, r.pick])))
    })()
  }, [user, predictionSet])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('footballiq-prediction-history')
      if (!stored) return
      setHistory(JSON.parse(stored) as Array<{ set: string; picks: number }>)
    } catch {
      setHistory([])
    }
  }, [])

  async function save() {
    if (!user || Object.keys(picks).length !== fixtures.length || locked) return
    const rows = fixtures.map((f) => ({
      user_id: user.id,
      prediction_set: predictionSet,
      fixture_id: f.id,
      home_team: f.home,
      away_team: f.away,
      pick: picks[f.id],
    }))
    const { error } = await supabase.from('predictions').upsert(rows, { onConflict: 'user_id,prediction_set,fixture_id' })
    if (!error) {
      setSaved(true)
      setLocked(true)
      const updated = [{ set: predictionSet, picks: fixtures.length }, ...history.filter((item) => item.set !== predictionSet)].slice(0, 6)
      setHistory(updated)
      localStorage.setItem('footballiq-prediction-history', JSON.stringify(updated))
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 size-5 text-primary" />
          <div>
            <p className="font-semibold">Prediction challenge card ({predictionSet})</p>
            <p className="mt-1 text-sm text-muted-foreground">
              These fixtures are a simulation set for gameplay. They are not live feeds.
            </p>
          </div>
        </div>
      </div>

      {fixtures.map((fixture) => (
        <div key={fixture.id} className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <span>{fixture.competition}</span>
            <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" /> {fixture.kickoff}</span>
          </div>

          <div className="mt-3 grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
            <h2 className="text-xl font-semibold md:text-right">{fixture.home}</h2>
            <span className="text-muted-foreground">vs</span>
            <h2 className="text-xl font-semibold">{fixture.away}</h2>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {([
              ['home', '1'],
              ['draw', 'X'],
              ['away', '2'],
            ] as [Pick, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                disabled={locked}
                onClick={() => {
                  setPicks((current) => ({ ...current, [fixture.id]: value }))
                  setSaved(false)
                }}
                className={`rounded-xl border px-3 py-3 text-sm font-semibold ${picks[fixture.id] === value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background'} disabled:opacity-60`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Confidence</label>
            <input
              type="range"
              min={1}
              max={5}
              value={confidence[fixture.id] ?? 3}
              disabled={locked}
              onChange={(event) =>
                setConfidence((current) => ({ ...current, [fixture.id]: Number(event.target.value) }))
              }
              className="mt-2 w-full"
            />
            <p className="text-xs text-muted-foreground">{confidence[fixture.id] ?? 3}/5 confidence</p>
          </div>
        </div>
      ))}

      <div className="rounded-2xl border border-border bg-card p-5">
        <button
          type="button"
          onClick={() => void save()}
          disabled={!user || Object.keys(picks).length !== fixtures.length || saved || locked}
          className="rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-50"
        >
          {!user
            ? 'Sign in to save predictions'
            : locked
              ? 'Predictions locked for this set'
              : saved
                ? 'Predictions saved'
                : `Lock ${Object.keys(picks).length}/${fixtures.length} predictions`}
        </button>
        <p className="mt-3 text-xs text-muted-foreground">
          Points are awarded when you compare your picks against recorded outcomes for this set.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-semibold">Recent prediction history</h3>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No saved prediction cards yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {history.map((item) => (
              <li key={item.set} className="flex items-center justify-between rounded-xl border border-border bg-background/70 px-3 py-2">
                <span>{item.set}</span>
                <span className="inline-flex items-center gap-1 text-primary"><CheckCircle2 className="size-4" /> {item.picks} picks locked</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
