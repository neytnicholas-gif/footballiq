'use client'

import { useMemo, useState } from 'react'
import type { DuelPack } from '@/lib/duel-packs'
import { useAuth } from '@/components/auth-provider'
import { supabase } from '@/lib/supabase'

export function DuelQuiz({ pack }: { pack: DuelPack }) {
  const { user, profile, refreshProfile } = useAuth()
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [saved, setSaved] = useState(false)
  const question = pack.questions[index]
  const answered = selected !== null
  const winner = useMemo(() => question.left.value >= question.right.value ? question.left : question.right, [question])
  const isCorrectChoice = (name: string) => {
    const chosen = name === question.left.name ? question.left : question.right
    return chosen.value === Math.max(question.left.value, question.right.value)
  }
  const finished = answered && index === pack.questions.length - 1

  function choose(name: string) {
    if (answered) return
    setSelected(name)
    if (isCorrectChoice(name)) setScore((s) => s + 1)
  }

  async function finishQuiz() {
    if (!user || !profile || saved) return
    const finalScore = score + (selected === winner.name ? 0 : 0)
    const perfect = finalScore === pack.questions.length
    const xpEarned = 25 + finalScore * 10 + (perfect ? 50 : 0)
    const today = new Date().toISOString().slice(0, 10)
    const { error } = await supabase.rpc('complete_quiz', {
      p_quiz_id: pack.id,
      p_score: finalScore,
      p_total: pack.questions.length,
      p_xp: xpEarned,
      p_activity_date: today,
    })
    if (!error) {
      setSaved(true)
      await refreshProfile()
    }
  }

  function next() {
    if (index < pack.questions.length - 1) {
      setIndex((i) => i + 1)
      setSelected(null)
    }
  }

  function restart() { setIndex(0); setSelected(null); setScore(0); setSaved(false) }

  return (
    <div className="rounded-3xl border border-border bg-card p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div><p className="text-sm text-muted-foreground">Question {index + 1} of {pack.questions.length}</p><h2 className="mt-1 text-2xl font-semibold">{pack.title}</h2></div>
        <div className="rounded-xl bg-secondary px-4 py-2">Score <span className="ml-2 font-semibold text-primary">{score}</span></div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {[question.left, question.right].map((option) => {
          const correct = answered && isCorrectChoice(option.name)
          const wrong = answered && selected === option.name && !isCorrectChoice(option.name)
          return <button key={option.name} disabled={answered} onClick={() => choose(option.name)} className={`min-h-52 rounded-3xl border p-6 text-left transition ${correct ? 'border-primary bg-primary/10' : wrong ? 'border-destructive bg-destructive/10' : 'border-border bg-background hover:border-primary/60'}`}>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Choose player</p><h3 className="mt-4 text-3xl font-semibold">{option.name}</h3><p className="mt-2 text-sm text-muted-foreground">{option.detail}</p>{answered && <p className="mt-8 text-4xl font-semibold text-primary">{option.value} <span className="text-sm text-muted-foreground">{pack.statLabel}</span></p>}
          </button>
        })}
      </div>
      {answered && <div className="mt-6 rounded-2xl border border-border bg-secondary/30 p-5"><p className="font-semibold">{selected && isCorrectChoice(selected) ? 'Correct.' : `Not quite — ${winner.name} is the answer.`}</p><div className="mt-4 flex flex-wrap gap-3">{!finished && <button onClick={next} className="rounded-xl bg-primary px-5 py-2.5 font-medium text-primary-foreground">Next question</button>}{finished && <><button onClick={() => void finishQuiz()} disabled={!user || saved} className="rounded-xl bg-primary px-5 py-2.5 font-medium text-primary-foreground disabled:opacity-50">{!user ? 'Sign in to save result' : saved ? 'Result saved' : 'Finish and save XP'}</button><button onClick={restart} className="rounded-xl border border-border px-5 py-2.5">Play again</button></>}</div></div>}
    </div>
  )
}
