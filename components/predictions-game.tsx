'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { supabase } from '@/lib/supabase'

type Pick = 'home' | 'draw' | 'away'
type Fixture = { id: string; home: string; away: string; competition: string }

const fixtures: Fixture[] = [
  { id: 'fixture-1', home: 'Manchester City', away: 'Liverpool', competition: 'Featured match' },
  { id: 'fixture-2', home: 'Real Madrid', away: 'Barcelona', competition: 'Featured match' },
  { id: 'fixture-3', home: 'Inter', away: 'Milan', competition: 'Featured match' },
  { id: 'fixture-4', home: 'Bayern Munich', away: 'Borussia Dortmund', competition: 'Featured match' },
  { id: 'fixture-5', home: 'Arsenal', away: 'Chelsea', competition: 'Featured match' },
]

export function PredictionsGame() {
  const { user } = useAuth()
  const [picks, setPicks] = useState<Record<string, Pick>>({})
  const [saved, setSaved] = useState(false)
  const predictionSet = useMemo(() => new Date().toISOString().slice(0, 10), [])

  useEffect(() => {
    if (!user) return
    void (async () => {
      const { data } = await supabase.from('predictions').select('fixture_id,pick').eq('user_id', user.id).eq('prediction_set', predictionSet)
      if (data) setPicks(Object.fromEntries(data.map((r: { fixture_id: string; pick: Pick }) => [r.fixture_id, r.pick])))
    })()
  }, [user, predictionSet])

  async function save() {
    if (!user || Object.keys(picks).length !== fixtures.length) return
    const rows = fixtures.map((f) => ({ user_id: user.id, prediction_set: predictionSet, fixture_id: f.id, home_team: f.home, away_team: f.away, pick: picks[f.id] }))
    const { error } = await supabase.from('predictions').upsert(rows, { onConflict: 'user_id,prediction_set,fixture_id' })
    if (!error) setSaved(true)
  }

  return <div className="space-y-4">{fixtures.map((f) => <div key={f.id} className="rounded-3xl border border-border bg-card p-5 sm:p-6"><p className="text-xs uppercase tracking-widest text-primary">{f.competition}</p><div className="mt-3 grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]"><h2 className="text-xl font-semibold md:text-right">{f.home}</h2><span className="text-muted-foreground">vs</span><h2 className="text-xl font-semibold">{f.away}</h2></div><div className="mt-5 grid grid-cols-3 gap-2">{([['home','Home'],['draw','Draw'],['away','Away']] as [Pick,string][]).map(([value,label]) => <button key={value} onClick={() => { setPicks((p) => ({ ...p, [f.id]: value })); setSaved(false) }} className={`rounded-xl border px-3 py-3 text-sm ${picks[f.id] === value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background'}`}>{label}</button>)}</div></div>)}<div className="rounded-2xl border border-border bg-card p-5"><button onClick={() => void save()} disabled={!user || Object.keys(picks).length !== fixtures.length || saved} className="rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-50">{!user ? 'Sign in to save predictions' : saved ? 'Predictions saved' : `Save ${Object.keys(picks).length}/${fixtures.length} predictions`}</button><p className="mt-3 text-xs text-muted-foreground">These are demo fixtures for the functional prediction system. Replace them with real scheduled fixtures before public promotion.</p></div></div>
}
