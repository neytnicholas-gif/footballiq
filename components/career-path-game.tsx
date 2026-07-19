'use client'

import { useMemo, useState } from 'react'
import { careerQuestions } from '@/lib/game-data'
import { useAuth } from '@/components/auth-provider'
import { saveQuizResult } from '@/lib/quiz-save'

export function CareerPathGame() {
  const { user, refreshProfile } = useAuth()
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [saved, setSaved] = useState(false)
  const q = careerQuestions[index]
  const options = useMemo(() => {
    const wrong = careerQuestions.filter((x) => x.answer !== q.answer).slice((index * 3) % 7, ((index * 3) % 7) + 3).map((x) => x.answer)
    return [q.answer, ...wrong].sort(() => Math.random() - .5)
  }, [q, index])
  const last = index === careerQuestions.length - 1

  function choose(name: string) { if (selected) return; setSelected(name); if (name === q.answer) setScore((s) => s + 1) }
  function next() { setIndex((i) => i + 1); setSelected(null) }
  async function save() { if (!user || saved) return; const { error } = await saveQuizResult({ quizId: 'career-path-1', score, total: careerQuestions.length, xp: 20 + score * 10 }); if (!error) { setSaved(true); await refreshProfile() } }

  return <div className="rounded-3xl border border-border bg-card p-6 sm:p-8"><div className="flex justify-between"><p className="text-sm text-muted-foreground">Career {index + 1} of {careerQuestions.length}</p><p className="font-semibold text-primary">Score {score}</p></div><p className="mt-6 text-sm uppercase tracking-widest text-primary">{q.hint}</p><div className="mt-4 flex flex-wrap items-center gap-2">{q.clubs.map((club, i) => <span key={club} className="flex items-center gap-2"><span className="rounded-xl border border-border bg-background px-4 py-3 font-medium">{club}</span>{i < q.clubs.length - 1 && <span className="text-muted-foreground">→</span>}</span>)}</div><div className="mt-7 grid gap-3 sm:grid-cols-2">{options.map((option) => { const correct = selected && option === q.answer; const wrong = selected === option && option !== q.answer; return <button key={option} onClick={() => choose(option)} disabled={!!selected} className={`rounded-2xl border p-4 text-left ${correct ? 'border-primary bg-primary/10' : wrong ? 'border-destructive bg-destructive/10' : 'border-border bg-background hover:border-primary/50'}`}>{option}</button> })}</div>{selected && <div className="mt-6 rounded-2xl bg-secondary/40 p-5"><p className="font-semibold">{selected === q.answer ? 'Correct.' : `Answer: ${q.answer}`}</p><div className="mt-4">{!last ? <button onClick={next} className="rounded-xl bg-primary px-5 py-3 text-primary-foreground">Next career</button> : <button onClick={() => void save()} disabled={!user || saved} className="rounded-xl bg-primary px-5 py-3 text-primary-foreground disabled:opacity-50">{!user ? 'Sign in to save' : saved ? 'Saved' : 'Finish and save XP'}</button>}</div></div>}</div>
}
