'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { saveQuizResult } from '@/lib/quiz-save'

type Item = { prompt: string; options: string[]; answer: number; explanation: string }

export function ChoiceQuiz({ quizId, title, items }: { quizId: string; title: string; items: Item[] }) {
  const { user, refreshProfile } = useAuth()
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [saved, setSaved] = useState(false)
  const item = items[index]
  const finished = selected !== null && index === items.length - 1

  function choose(i: number) {
    if (selected !== null) return
    setSelected(i)
    if (i === item.answer) setScore((s) => s + 1)
  }

  async function save() {
    if (!user || saved) return
    const xp = 20 + score * 10 + (score === items.length ? 40 : 0)
    const { error } = await saveQuizResult({ quizId, score, total: items.length, xp })
    if (!error) { setSaved(true); await refreshProfile() }
  }

  function next() { setIndex((i) => i + 1); setSelected(null) }
  function restart() { setIndex(0); setSelected(null); setScore(0); setSaved(false) }

  return <div className="rounded-3xl border border-border bg-card p-5 sm:p-8">
    <div className="flex items-center justify-between gap-4 border-b border-border pb-5"><div><p className="text-sm text-muted-foreground">Question {index + 1} of {items.length}</p><h2 className="mt-1 text-2xl font-semibold">{title}</h2></div><div className="rounded-xl bg-secondary px-4 py-2">Score <strong className="ml-2 text-primary">{score}</strong></div></div>
    <h3 className="mt-7 text-xl font-semibold leading-relaxed">{item.prompt}</h3>
    <div className="mt-5 grid gap-3">{item.options.map((option, i) => {
      const correct = selected !== null && i === item.answer
      const wrong = selected === i && i !== item.answer
      return <button key={option} onClick={() => choose(i)} disabled={selected !== null} className={`rounded-2xl border p-4 text-left ${correct ? 'border-primary bg-primary/10' : wrong ? 'border-destructive bg-destructive/10' : 'border-border bg-background hover:border-primary/50'}`}>{option}</button>
    })}</div>
    {selected !== null && <div className="mt-6 rounded-2xl bg-secondary/40 p-5"><p className="font-semibold">{selected === item.answer ? 'Correct.' : `Correct answer: ${item.options[item.answer]}`}</p><p className="mt-2 text-sm text-muted-foreground">{item.explanation}</p><div className="mt-4 flex flex-wrap gap-3">{!finished ? <button onClick={next} className="rounded-xl bg-primary px-5 py-2.5 font-medium text-primary-foreground">Next</button> : <><button onClick={() => void save()} disabled={!user || saved} className="rounded-xl bg-primary px-5 py-2.5 font-medium text-primary-foreground disabled:opacity-50">{!user ? 'Sign in to save XP' : saved ? 'Saved' : 'Finish and save XP'}</button><button onClick={restart} className="rounded-xl border border-border px-5 py-2.5">Play again</button></>}</div></div>}
  </div>
}
