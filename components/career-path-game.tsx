'use client'

import { useEffect, useMemo, useState } from 'react'
import { careerQuestions } from '@/lib/game-data'
import { useAuth } from '@/components/auth-provider'
import { QuizProgressBanner } from '@/components/quiz-progress-banner'
import { clearQuizProgress, loadQuizProgress, saveQuizProgress } from '@/lib/quiz-progress'
import { saveQuizResult } from '@/lib/quiz-save'

function seededShuffle<T>(items: T[], seed: number) {
  const copy = [...items]
  let value = seed || 1
  for (let index = copy.length - 1; index > 0; index -= 1) {
    value = (value * 9301 + 49297) % 233280
    const randomIndex = Math.floor((value / 233280) * (index + 1))
    ;[copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]]
  }
  return copy
}

export function CareerPathGame() {
  const { user, refreshProfile } = useAuth()
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [shuffleSeed, setShuffleSeed] = useState(() => Date.now() % 233280)
  const [resumeState, setResumeState] = useState<{ index: number; selected: string | null; score: number; shuffleSeed: number } | null>(null)
  const [checkingProgress, setCheckingProgress] = useState(Boolean(user))
  const q = careerQuestions[index]
  const options = useMemo(() => {
    const wrong = careerQuestions.filter((x) => x.answer !== q.answer).slice((index * 3) % 7, ((index * 3) % 7) + 3).map((x) => x.answer)
    return seededShuffle([q.answer, ...wrong], shuffleSeed + index * 17)
  }, [q, index, shuffleSeed])
  const last = index === careerQuestions.length - 1

  useEffect(() => {
    let active = true

    if (!user) {
      setResumeState(null)
      setCheckingProgress(false)
      return
    }

    setCheckingProgress(true)
    void (async () => {
      const progress = await loadQuizProgress('career-path-1')
      if (!active) return
      const savedState = progress?.progress as { index?: number; selected?: string | null; score?: number; shuffleSeed?: number } | undefined
      const savedIndex = typeof savedState?.index === 'number' && Number.isInteger(savedState.index) ? savedState.index : null
      if (progress && progress.status === 'in_progress' && savedState && savedIndex !== null && savedIndex >= 0 && savedIndex < careerQuestions.length) {
        setResumeState({
          index: savedIndex,
          selected: typeof savedState.selected === 'string' ? savedState.selected : null,
          score: typeof savedState.score === 'number' ? savedState.score : progress.score,
          shuffleSeed: typeof savedState.shuffleSeed === 'number' ? savedState.shuffleSeed : shuffleSeed,
        })
      } else {
        setResumeState(null)
      }
      setCheckingProgress(false)
    })()

    return () => {
      active = false
    }
  }, [user])

  function choose(name: string) {
    if (selected) return
    const nextScore = name === q.answer ? score + 1 : score
    setSelected(name)
    setScore(nextScore)
    void saveQuizProgress({
      quizId: 'career-path-1',
      currentIndex: index,
      score: nextScore,
      total: careerQuestions.length,
      progress: { index, selected: name, score: nextScore, shuffleSeed },
    })
  }

  function next() {
    const nextIndex = index + 1
    setIndex(nextIndex)
    setSelected(null)
    void saveQuizProgress({
      quizId: 'career-path-1',
      currentIndex: nextIndex,
      score,
      total: careerQuestions.length,
      progress: { index: nextIndex, selected: null, score, shuffleSeed },
    })
  }

  function continueProgress() {
    if (!resumeState) return
    setShuffleSeed(resumeState.shuffleSeed)
    setIndex(resumeState.index)
    setSelected(resumeState.selected)
    setScore(resumeState.score)
    setResumeState(null)
  }

  function restart() {
    const newSeed = Date.now() % 233280
    setShuffleSeed(newSeed)
    setIndex(0)
    setSelected(null)
    setScore(0)
    setSaved(false)
    setResumeState(null)
    void clearQuizProgress('career-path-1')
  }

  async function save() {
    if (!user || saved || saving) return
    setSaving(true)
    const { error, alreadyCompleted } = await saveQuizResult({ quizId: 'career-path-1', score, total: careerQuestions.length, xp: 20 + score * 10 })
    if (!error) {
      setSaved(true)
      void clearQuizProgress('career-path-1')
      if (!alreadyCompleted) await refreshProfile()
    }
    setSaving(false)
  }

  return <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
    {checkingProgress ? <div className="mb-5 rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">Checking saved progress…</div> : resumeState && !saved ? <div className="mb-5"><QuizProgressBanner title="Resume your quiz?" copy={`You left off at career ${resumeState.index + 1} of ${careerQuestions.length}.`} onContinue={continueProgress} onStartAgain={restart} /></div> : null}
    <div className="flex justify-between"><p className="text-sm text-muted-foreground">Career {index + 1} of {careerQuestions.length}</p><p className="font-semibold text-primary">Score {score}</p></div><p className="mt-6 text-sm uppercase tracking-widest text-primary">{q.hint}</p><div className="mt-4 flex flex-wrap items-center gap-2">{q.clubs.map((club, i) => <span key={club} className="flex items-center gap-2"><span className="rounded-xl border border-border bg-background px-4 py-3 font-medium">{club}</span>{i < q.clubs.length - 1 && <span className="text-muted-foreground">→</span>}</span>)}</div><div className="mt-7 grid gap-3 sm:grid-cols-2">{options.map((option) => { const correct = selected && option === q.answer; const wrong = selected === option && option !== q.answer; return <button key={option} onClick={() => choose(option)} disabled={!!selected} className={`rounded-2xl border p-4 text-left ${correct ? 'border-primary bg-primary/10' : wrong ? 'border-destructive bg-destructive/10' : 'border-border bg-background hover:border-primary/50'}`}>{option}</button> })}</div>{selected && <div className="mt-6 rounded-2xl bg-secondary/40 p-5"><p className="font-semibold">{selected === q.answer ? 'Correct.' : `Answer: ${q.answer}`}</p><div className="mt-4">{!last ? <button onClick={next} className="rounded-xl bg-primary px-5 py-3 text-primary-foreground">Next career</button> : <button onClick={() => void save()} disabled={!user || saved || saving} className="rounded-xl bg-primary px-5 py-3 text-primary-foreground disabled:opacity-50">{!user ? 'Sign in to save' : saving ? 'Saving...' : saved ? 'Saved' : 'Finish and save XP'}</button>}</div></div>}</div>
}
