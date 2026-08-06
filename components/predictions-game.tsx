'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CalendarDays, Check, CheckCircle2, Loader2, LockKeyhole, ShieldAlert } from 'lucide-react'
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
  const [loading, setLoading] = useState(Boolean(user))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<Array<{ set: string; picks: number }>>([])
  const predictionSet = useMemo(() => new Date().toISOString().slice(0, 10), [])

  useEffect(() => {
    if (!user) return
    void (async () => {
      setLoading(true)
      const { data, error: loadError } = await supabase.from('predictions').select('fixture_id,pick').eq('user_id', user.id).eq('prediction_set', predictionSet)
      if (loadError) setError('Saved predictions could not be loaded. You can still make picks and retry saving.')
      if (data) {
        setPicks(Object.fromEntries(data.map((r: { fixture_id: string; pick: Pick }) => [r.fixture_id, r.pick])))
        if (data.length === fixtures.length) {
          setSaved(true)
          setLocked(true)
        }
      }
      setLoading(false)
    })()
  }, [user, predictionSet])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem('footballiq-prediction-history')
        setHistory(stored ? JSON.parse(stored) as Array<{ set: string; picks: number }> : [])
      } catch {
        setHistory([])
      }
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [])

  async function save() {
    if (!user || Object.keys(picks).length !== fixtures.length || locked) return
    setSaving(true)
    setError('')
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
    } else {
      setError('Your card was not saved. Check your connection and try again—your picks are still selected.')
    }
    setSaving(false)
  }

  const pickedCount = Object.keys(picks).length

  return (
    <div className="space-y-3">
      <div className="rounded-[1.35rem] border border-sky-300/15 bg-slate-950/45 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-sky-300/20 bg-sky-300/10"><ShieldAlert className="size-4 text-sky-200" /></span>
            <div>
            <p className="font-semibold text-slate-100">Simulation card <span className="font-mono text-sm text-slate-400">{predictionSet}</span></p>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">
              These fixtures are a simulation set for gameplay. They are not live feeds.
            </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-sky-400 transition-all" style={{ width: `${(pickedCount / fixtures.length) * 100}%` }} /></div>
            <span className="whitespace-nowrap text-xs font-semibold text-slate-300">{pickedCount}/{fixtures.length} picked</span>
          </div>
        </div>
      </div>

      {loading ? <div className="flex items-center gap-2 rounded-2xl border border-slate-700/70 bg-slate-950/50 p-4 text-sm text-slate-300"><Loader2 className="size-4 animate-spin text-sky-300" /> Checking your saved card…</div> : null}
      {error ? <div role="alert" className="flex items-start gap-2 rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-100"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</div> : null}

      {fixtures.map((fixture, fixtureIndex) => (
        <div key={fixture.id} className="group rounded-[1.35rem] border border-slate-700/70 bg-slate-900/65 p-4 transition hover:border-sky-300/30 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[.16em] text-slate-400">
            <span className="inline-flex items-center gap-2"><span className="text-sky-300">Fixture {fixtureIndex + 1}</span><span className="text-slate-700">/</span>{fixture.competition}</span>
            <span className="inline-flex items-center gap-1.5 normal-case tracking-normal"><CalendarDays className="size-3.5 text-sky-300" /> {fixture.kickoff}</span>
          </div>

          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <h2 className="text-right text-base font-bold text-slate-100 sm:text-xl">{fixture.home}</h2>
            <span className="rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1 text-[10px] font-bold uppercase text-slate-500">vs</span>
            <h2 className="text-base font-bold text-slate-100 sm:text-xl">{fixture.away}</h2>
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
                aria-pressed={picks[fixture.id] === value}
                className={`min-h-11 rounded-xl border px-3 py-2.5 text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-sky-300 ${picks[fixture.id] === value ? 'border-sky-300/60 bg-sky-300/15 text-sky-100 shadow-[inset_0_0_0_1px_rgba(125,211,252,.12)]' : 'border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500 hover:bg-slate-800'} disabled:cursor-not-allowed disabled:opacity-55`}
              >
                <span className="inline-flex items-center gap-1.5">{picks[fixture.id] === value ? <Check className="size-3.5" /> : null}{label}</span>
              </button>
            ))}
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between"><label htmlFor={`confidence-${fixture.id}`} className="text-[11px] font-semibold uppercase tracking-[.16em] text-slate-500">Confidence</label><span className="text-xs font-semibold text-slate-300">{confidence[fixture.id] ?? 3}/5</span></div>
            <input
              id={`confidence-${fixture.id}`}
              type="range"
              min={1}
              max={5}
              value={confidence[fixture.id] ?? 3}
              disabled={locked}
              onChange={(event) =>
                setConfidence((current) => ({ ...current, [fixture.id]: Number(event.target.value) }))
              }
              className="mt-2 w-full accent-sky-400 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      ))}

      <div className="rounded-2xl border border-sky-300/20 bg-slate-950/90 p-4 shadow-2xl backdrop-blur-xl sm:p-5">
        <button
          type="button"
          onClick={() => void save()}
          disabled={!user || pickedCount !== fixtures.length || saved || locked || saving || loading}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-300 px-5 py-2.5 text-sm font-bold text-slate-950 outline-none transition hover:bg-sky-200 focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-auto"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : locked ? <LockKeyhole className="size-4" /> : null}
          {!user
            ? 'Sign in to save predictions'
            : locked
              ? 'Predictions locked for this set'
              : saved
                ? 'Predictions saved'
                : saving
                  ? 'Saving your card…'
                  : `Lock ${pickedCount}/${fixtures.length} predictions`}
        </button>
        <p className="mt-3 text-xs leading-relaxed text-slate-400">
          Points are awarded when you compare your picks against recorded outcomes for this set.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-700/70 bg-slate-900/55 p-5">
        <h3 className="font-semibold text-slate-100">Recent prediction history</h3>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No saved cards on this device yet. Your first locked card will appear here.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {history.map((item) => (
              <li key={item.set} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-slate-300">
                <span>{item.set}</span>
                <span className="inline-flex items-center gap-1 text-emerald-300"><CheckCircle2 className="size-4" /> {item.picks} picks locked</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
