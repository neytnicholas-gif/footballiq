'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { higherLowerItems } from '@/lib/game-data'
import { useAuth } from '@/components/auth-provider'
import { QuizProgressBanner } from '@/components/quiz-progress-banner'
import { clearQuizProgress, loadQuizProgress, saveQuizProgress } from '@/lib/quiz-progress'
import { buildCompletionKey, createCompletionRunId, saveQuizResult } from '@/lib/quiz-save'

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

export function HigherLowerGame() {
  const { user, refreshProfile } = useAuth()
  // The first server and browser render must use the same deck. New runs are
  // randomized by resetGame after hydration.
  const [deckSeed, setDeckSeed] = useState(48157)
  const initialDeckSeed = useRef(deckSeed)
  const deck = useMemo(() => seededShuffle(higherLowerItems, deckSeed), [deckSeed])
  const [index, setIndex] = useState(1)
  const [streak, setStreak] = useState(0)
  const [over, setOver] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [runKey, setRunKey] = useState(() => createCompletionRunId())
  const [resumeState, setResumeState] = useState<{ index: number; streak: number; deckSeed: number } | null>(null)
  const [checkingProgress, setCheckingProgress] = useState(Boolean(user))

  const left = deck[index - 1]
  const right = deck[index]

  useEffect(() => {
    let active = true

    if (!user) {
      const timeout = window.setTimeout(() => {
        if (!active) return
        setResumeState(null)
        setCheckingProgress(false)
      }, 0)
      return () => {
        active = false
        window.clearTimeout(timeout)
      }
    }

    setCheckingProgress(true)
    void (async () => {
      const progress = await loadQuizProgress('higher-lower-pl-goals')
      if (!active) return
      const savedState = progress?.progress as { index?: number; streak?: number; deckSeed?: number } | undefined
      const savedIndex = typeof savedState?.index === 'number' && Number.isInteger(savedState.index) ? savedState.index : null
      if (progress && progress.status === 'in_progress' && savedState && savedIndex !== null && savedIndex > 0 && savedIndex < higherLowerItems.length) {
        setResumeState({
          index: savedIndex,
          streak: typeof savedState.streak === 'number' ? savedState.streak : progress.score,
          deckSeed: typeof savedState.deckSeed === 'number' ? savedState.deckSeed : initialDeckSeed.current,
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

  function answer(higher: boolean) {
    const correct = higher ? right.value >= left.value : right.value <= left.value
    if (!correct || index === deck.length - 1) {
      setOver(true)
      void clearQuizProgress('higher-lower-pl-goals')
      return
    }
    const nextStreak = streak + 1
    const nextIndex = index + 1
    setStreak(nextStreak)
    setIndex(nextIndex)
    void saveQuizProgress({
      quizId: 'higher-lower-pl-goals',
      currentIndex: nextIndex,
      score: nextStreak,
      total: Math.max(1, deck.length - 1),
      progress: { index: nextIndex, streak: nextStreak, deckSeed },
    })
  }

  async function save() {
    if (!user || saved || saving) return
    setSaving(true)
    const total = Math.max(1, deck.length - 1)
    const { error, alreadyCompleted } = await saveQuizResult({ quizId: 'higher-lower-pl-goals', score: streak, total, xp: 20 + streak * 8, completionKey: buildCompletionKey('higher-lower-pl-goals', runKey) })
    if (!error) {
      setSaved(true)
      void clearQuizProgress('higher-lower-pl-goals')
      if (!alreadyCompleted) await refreshProfile()
    }
    setSaving(false)
  }

  function continueProgress() {
    if (!resumeState) return
    setDeckSeed(resumeState.deckSeed)
    setIndex(resumeState.index)
    setStreak(resumeState.streak)
    setOver(false)
    setResumeState(null)
  }

  function restart() {
    const newSeed = Date.now() % 233280
    setDeckSeed(newSeed)
    setRunKey(createCompletionRunId())
    setIndex(1)
    setStreak(0)
    setOver(false)
    setSaved(false)
    setResumeState(null)
    void clearQuizProgress('higher-lower-pl-goals')
  }

  return <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
    {checkingProgress ? <div className="mb-5 rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">Checking saved progress…</div> : resumeState && !saved ? <div className="mb-5"><QuizProgressBanner title="Resume your quiz?" copy={`You left off at round ${resumeState.index} with a ${resumeState.streak}-game streak.`} onContinue={continueProgress} onStartAgain={restart} /></div> : null}
    <div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Current streak</p><p className="text-4xl font-semibold text-primary">{streak}</p></div><p className="text-sm text-muted-foreground">Premier League goals</p></div>
    {!over ? <div className="mt-7 grid gap-4 md:grid-cols-2"><div className="rounded-3xl border border-border bg-background p-7"><p className="text-sm text-muted-foreground">{left.detail}</p><h2 className="mt-3 text-3xl font-semibold">{left.name}</h2><p className="mt-8 text-5xl font-semibold text-primary">{left.value}</p></div><div className="rounded-3xl border border-border bg-background p-7"><p className="text-sm text-muted-foreground">Does this player have higher or lower?</p><h2 className="mt-3 text-3xl font-semibold">{right.name}</h2><div className="mt-8 grid grid-cols-2 gap-3"><button onClick={() => answer(true)} className="rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground">Higher</button><button onClick={() => answer(false)} className="rounded-xl border border-border px-5 py-3">Lower</button></div></div></div> : <div className="mt-8 rounded-2xl bg-secondary/40 p-6"><h2 className="text-2xl font-semibold">Run finished: {streak}</h2><p className="mt-2 text-muted-foreground">{right.name}: {right.value}</p><div className="mt-5 flex gap-3"><button onClick={() => void save()} disabled={!user || saved || saving} className="rounded-xl bg-primary px-5 py-3 text-primary-foreground disabled:opacity-50">{!user ? 'Sign in to save' : saving ? 'Saving...' : saved ? 'Saved' : 'Save XP'}</button><button onClick={restart} className="rounded-xl border border-border px-5 py-3">New run</button></div></div>}
  </div>
}
