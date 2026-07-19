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
  const [result, setResult] = useState<{ guess: 'higher' | 'lower'; correct: boolean } | null>(null)
  const [over, setOver] = useState(false)
  const [saved, setSaved] = useState(false)
  const left = deck[index - 1]
  const right = deck[index]

  function answer(higher: boolean) {
    if (result || over) return
    const correct = higher ? right.value >= left.value : right.value <= left.value
    setResult({ guess: higher ? 'higher' : 'lower', correct })
    if (correct) setStreak((s) => s + 1)
    if (!correct || index === deck.length - 1) setOver(true)
  }

  function next() {
    if (!result || over) return
    setIndex((i) => i + 1)
    setResult(null)
  }

  async function save() {
    if (!user || saved) return
    const total = Math.max(1, deck.length - 1)
    const { error } = await saveQuizResult({ quizId: 'higher-lower-pl-goals', score: streak, total, xp: 20 + streak * 8 })
    if (!error) { setSaved(true); await refreshProfile() }
  }

  return <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
    <div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Current streak</p><p className="text-4xl font-semibold text-primary">{streak}</p></div><p className="text-sm text-muted-foreground">Dataset: {left.detail}</p></div>
    <div className="mt-7 grid gap-4 md:grid-cols-2"><div className="rounded-3xl border border-border bg-background p-7"><p className="text-sm text-muted-foreground">Known value</p><h2 className="mt-3 text-3xl font-semibold">{left.name}</h2><p className="mt-8 text-5xl font-semibold text-primary">{left.value}</p></div><div className="rounded-3xl border border-border bg-background p-7"><p className="text-sm text-muted-foreground">Compare against</p><h2 className="mt-3 text-3xl font-semibold">{right.name}</h2><div className="mt-8 grid grid-cols-2 gap-3"><button disabled={!!result || over} onClick={() => answer(true)} className="rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground disabled:opacity-60">Higher</button><button disabled={!!result || over} onClick={() => answer(false)} className="rounded-xl border border-border px-5 py-3 disabled:opacity-60">Lower</button></div></div></div>

    {result && <div className={`mt-6 rounded-2xl border p-5 ${result.correct ? 'border-primary/40 bg-primary/10' : 'border-destructive/40 bg-destructive/10'}`}><p className="font-semibold">{result.correct ? 'Correct call.' : 'Wrong call.'} {right.name} recorded {right.value}.</p><p className="mt-2 text-sm text-muted-foreground">You chose {result.guess}. {right.value >= left.value ? 'Higher' : 'Lower'} was correct.</p>{!over && <button onClick={next} className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Next question</button>}</div>}

    {over && <div className="mt-8 rounded-2xl bg-secondary/40 p-6"><h2 className="text-2xl font-semibold">Run finished: {streak}</h2><p className="mt-2 text-muted-foreground">Final comparison: {right.name} {right.value}</p><div className="mt-5 flex gap-3"><button onClick={() => void save()} disabled={!user || saved} className="rounded-xl bg-primary px-5 py-3 text-primary-foreground disabled:opacity-50">{!user ? 'Sign in to save' : saved ? 'Saved' : 'Save XP'}</button><button onClick={() => window.location.reload()} className="rounded-xl border border-border px-5 py-3">New run</button></div></div>}
  </div>
}
