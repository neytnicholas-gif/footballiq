'use client'

import { useMemo, useState } from 'react'
import { higherLowerItems } from '@/lib/game-data'
import { useAuth } from '@/components/auth-provider'
import { saveQuizResult } from '@/lib/quiz-save'

export function HigherLowerGame() {
  const { user, refreshProfile } = useAuth()
  const deck = useMemo(() => [...higherLowerItems].sort(() => Math.random() - .5), [])
  const [index, setIndex] = useState(1)
  const [streak, setStreak] = useState(0)
  const [over, setOver] = useState(false)
  const [saved, setSaved] = useState(false)
  const left = deck[index - 1]
  const right = deck[index]

  function answer(higher: boolean) {
    const correct = higher ? right.value >= left.value : right.value <= left.value
    if (!correct || index === deck.length - 1) { setOver(true); return }
    setStreak((s) => s + 1)
    setIndex((i) => i + 1)
  }

  async function save() {
    if (!user || saved) return
    const total = Math.max(1, deck.length - 1)
    const { error } = await saveQuizResult({ quizId: 'higher-lower-pl-goals', score: streak, total, xp: 20 + streak * 8 })
    if (!error) { setSaved(true); await refreshProfile() }
  }

  return <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
    <div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Current streak</p><p className="text-4xl font-semibold text-primary">{streak}</p></div><p className="text-sm text-muted-foreground">Premier League goals</p></div>
    {!over ? <div className="mt-7 grid gap-4 md:grid-cols-2"><div className="rounded-3xl border border-border bg-background p-7"><p className="text-sm text-muted-foreground">{left.detail}</p><h2 className="mt-3 text-3xl font-semibold">{left.name}</h2><p className="mt-8 text-5xl font-semibold text-primary">{left.value}</p></div><div className="rounded-3xl border border-border bg-background p-7"><p className="text-sm text-muted-foreground">Does this player have higher or lower?</p><h2 className="mt-3 text-3xl font-semibold">{right.name}</h2><div className="mt-8 grid grid-cols-2 gap-3"><button onClick={() => answer(true)} className="rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground">Higher</button><button onClick={() => answer(false)} className="rounded-xl border border-border px-5 py-3">Lower</button></div></div></div> : <div className="mt-8 rounded-2xl bg-secondary/40 p-6"><h2 className="text-2xl font-semibold">Run finished: {streak}</h2><p className="mt-2 text-muted-foreground">{right.name}: {right.value}</p><div className="mt-5 flex gap-3"><button onClick={() => void save()} disabled={!user || saved} className="rounded-xl bg-primary px-5 py-3 text-primary-foreground disabled:opacity-50">{!user ? 'Sign in to save' : saved ? 'Saved' : 'Save XP'}</button><button onClick={() => location.reload()} className="rounded-xl border border-border px-5 py-3">New run</button></div></div>}
  </div>
}
