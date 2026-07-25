'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { QuizProgressBanner } from '@/components/quiz-progress-banner'
import { clearQuizProgress, loadQuizProgress, saveQuizProgress } from '@/lib/quiz-progress'
import { saveQuizResult } from '@/lib/quiz-save'

type Item = { prompt: string; options: string[]; answer: number; explanation: string }

export function ChoiceQuiz({ quizId, title, items }: { quizId: string; title: string; items: Item[] }) {
  const { user, refreshProfile } = useAuth()
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resumeState, setResumeState] = useState<{ index: number; selected: number | null; score: number } | null>(null)
  const [checkingProgress, setCheckingProgress] = useState(Boolean(user))
  const item = items[index]
  const finished = selected !== null && index === items.length - 1

  useEffect(() => {
    let active = true

    if (!user) {
      setResumeState(null)
      setCheckingProgress(false)
      return
    }

    setCheckingProgress(true)
    void (async () => {
      const progress = await loadQuizProgress(quizId)
      if (!active) return
      const savedState = progress?.progress as { index?: number; selected?: number | null; score?: number } | undefined
      if (progress && progress.status === 'in_progress' && savedState && Number.isInteger(savedState.index) && savedState.index >= 0 && savedState.index < items.length) {
        setResumeState({
          index: savedState.index,
          selected: typeof savedState.selected === 'number' ? savedState.selected : null,
          score: typeof savedState.score === 'number' ? savedState.score : progress.score,
        })
      } else {
        setResumeState(null)
      }
      setCheckingProgress(false)
    })()

    return () => {
      active = false
    }
  }, [items.length, quizId, user])

  function choose(i: number) {
    if (selected !== null) return
    const nextScore = i === item.answer ? score + 1 : score
    setSelected(i)
    setScore(nextScore)
    void saveQuizProgress({
      quizId,
      currentIndex: index,
      score: nextScore,
      total: items.length,
      progress: { index, selected: i, score: nextScore },
    })
  }

  async function save() {
    if (!user || saved || saving) return
    setSaving(true)
    const xp = 20 + score * 10 + (score === items.length ? 40 : 0)
    const { error, alreadyCompleted } = await saveQuizResult({ quizId, score, total: items.length, xp })
    if (!error) {
      setSaved(true)
      void clearQuizProgress(quizId)
      if (!alreadyCompleted) await refreshProfile()
    }
    setSaving(false)
  }

  function next() {
    const nextIndex = index + 1
    setIndex(nextIndex)
    setSelected(null)
    void saveQuizProgress({
      quizId,
      currentIndex: nextIndex,
      score,
      total: items.length,
      progress: { index: nextIndex, selected: null, score },
    })
  }

  function restart() {
    setIndex(0)
    setSelected(null)
    setScore(0)
    setSaved(false)
    setResumeState(null)
    void clearQuizProgress(quizId)
  }

  function continueProgress() {
    if (!resumeState) return
    setIndex(resumeState.index)
    setSelected(resumeState.selected)
    setScore(resumeState.score)
    setResumeState(null)
  }

  return <div className="rounded-3xl border border-border bg-card p-5 sm:p-8">
    {checkingProgress ? <div className="mb-5 rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">Checking saved progress…</div> : resumeState && !saved ? <div className="mb-5"><QuizProgressBanner title="Resume your quiz?" copy={`You left off at question ${resumeState.index + 1} of ${items.length}.`} onContinue={continueProgress} onStartAgain={restart} /></div> : null}
    <div className="flex items-center justify-between gap-4 border-b border-border pb-5"><div><p className="text-sm text-muted-foreground">Question {index + 1} of {items.length}</p><h2 className="mt-1 text-2xl font-semibold">{title}</h2></div><div className="rounded-xl bg-secondary px-4 py-2">Score <strong className="ml-2 text-primary">{score}</strong></div></div>
    <h3 className="mt-7 text-xl font-semibold leading-relaxed">{item.prompt}</h3>
    <div className="mt-5 grid gap-3">{item.options.map((option, i) => {
      const correct = selected !== null && i === item.answer
      const wrong = selected === i && i !== item.answer
      return <button key={option} onClick={() => choose(i)} disabled={selected !== null} className={`rounded-2xl border p-4 text-left ${correct ? 'border-primary bg-primary/10' : wrong ? 'border-destructive bg-destructive/10' : 'border-border bg-background hover:border-primary/50'}`}>{option}</button>
    })}</div>
    {selected !== null && <div className="mt-6 rounded-2xl bg-secondary/40 p-5"><p className="font-semibold">{selected === item.answer ? 'Correct.' : `Correct answer: ${item.options[item.answer]}`}</p><p className="mt-2 text-sm text-muted-foreground">{item.explanation}</p><div className="mt-4 flex flex-wrap gap-3">{!finished ? <button onClick={next} className="rounded-xl bg-primary px-5 py-2.5 font-medium text-primary-foreground">Next</button> : <><button onClick={() => void save()} disabled={!user || saved || saving} className="rounded-xl bg-primary px-5 py-2.5 font-medium text-primary-foreground disabled:opacity-50">{!user ? 'Sign in to save XP' : saving ? 'Saving...' : saved ? 'Saved' : 'Finish and save XP'}</button><button onClick={restart} className="rounded-xl border border-border px-5 py-2.5">Play again</button></>}</div></div>}
  </div>
}
