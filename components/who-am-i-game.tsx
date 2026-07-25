'use client'

import { useEffect, useState } from 'react'
import { whoAmIQuestions } from '@/lib/game-data'
import { useAuth } from '@/components/auth-provider'
import { QuizProgressBanner } from '@/components/quiz-progress-banner'
import { clearQuizProgress, loadQuizProgress, saveQuizProgress } from '@/lib/quiz-progress'
import { saveQuizResult } from '@/lib/quiz-save'

export function WhoAmIGame() {
  const { user, refreshProfile } = useAuth()
  const [index, setIndex] = useState(0)
  const [clues, setClues] = useState(1)
  const [guess, setGuess] = useState('')
  const [score, setScore] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resumeState, setResumeState] = useState<{ index: number; clues: number; guess: string; score: number; revealed: boolean } | null>(null)
  const [checkingProgress, setCheckingProgress] = useState(Boolean(user))
  const q = whoAmIQuestions[index]
  const last = index === whoAmIQuestions.length - 1

  useEffect(() => {
    let active = true

    if (!user) {
      setResumeState(null)
      setCheckingProgress(false)
      return
    }

    setCheckingProgress(true)
    void (async () => {
      const progress = await loadQuizProgress('who-am-i-1')
      if (!active) return
      const savedState = progress?.progress as { index?: number; clues?: number; guess?: string; score?: number; revealed?: boolean } | undefined
      if (progress && progress.status === 'in_progress' && savedState && Number.isInteger(savedState.index) && savedState.index >= 0 && savedState.index < whoAmIQuestions.length) {
        setResumeState({
          index: savedState.index,
          clues: typeof savedState.clues === 'number' ? savedState.clues : 1,
          guess: typeof savedState.guess === 'string' ? savedState.guess : '',
          score: typeof savedState.score === 'number' ? savedState.score : progress.score,
          revealed: Boolean(savedState.revealed),
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

  function submit() {
    if (revealed || !guess.trim()) return
    const ok = guess.trim().toLowerCase() === q.answer.toLowerCase()
    const nextScore = ok ? score + (5 - clues) : score
    if (ok) setScore(nextScore)
    setRevealed(true)
    void saveQuizProgress({
      quizId: 'who-am-i-1',
      currentIndex: index,
      score: nextScore,
      total: 40,
      progress: { index, clues, guess, score: nextScore, revealed: true },
    })
  }
  function next() {
    const nextIndex = index + 1
    setIndex(nextIndex)
    setClues(1)
    setGuess('')
    setRevealed(false)
    void saveQuizProgress({
      quizId: 'who-am-i-1',
      currentIndex: nextIndex,
      score,
      total: 40,
      progress: { index: nextIndex, clues: 1, guess: '', score, revealed: false },
    })
  }
  function revealAnotherClue() {
    setClues((current) => {
      const nextClues = current + 1
      void saveQuizProgress({
        quizId: 'who-am-i-1',
        currentIndex: index,
        score,
        total: 40,
        progress: { index, clues: nextClues, guess, score, revealed },
      })
      return nextClues
    })
  }
  function continueProgress() {
    if (!resumeState) return
    setIndex(resumeState.index)
    setClues(resumeState.clues)
    setGuess(resumeState.guess)
    setScore(resumeState.score)
    setRevealed(resumeState.revealed)
    setResumeState(null)
  }
  function restart() {
    setIndex(0)
    setClues(1)
    setGuess('')
    setScore(0)
    setRevealed(false)
    setSaved(false)
    setResumeState(null)
    void clearQuizProgress('who-am-i-1')
  }
  async function save() {
    if (!user || saved || saving) return
    setSaving(true)
    const { error, alreadyCompleted } = await saveQuizResult({ quizId: 'who-am-i-1', score, total: 40, xp: 20 + score * 3 })
    if (!error) {
      setSaved(true)
      void clearQuizProgress('who-am-i-1')
      if (!alreadyCompleted) await refreshProfile()
    }
    setSaving(false)
  }

  return <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
    {checkingProgress ? <div className="mb-5 rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">Checking saved progress…</div> : resumeState && !saved ? <div className="mb-5"><QuizProgressBanner title="Resume your quiz?" copy={`You left off at player ${resumeState.index + 1} of ${whoAmIQuestions.length}.`} onContinue={continueProgress} onStartAgain={restart} /></div> : null}
    <div className="flex justify-between"><p className="text-sm text-muted-foreground">Player {index + 1} of {whoAmIQuestions.length}</p><p className="font-semibold text-primary">{score} points</p></div><div className="mt-6 space-y-3">{q.clues.slice(0, clues).map((c, i) => <div key={c} className="rounded-2xl border border-border bg-background p-4"><span className="mr-3 text-primary">Clue {i + 1}</span>{c}</div>)}</div>{!revealed && <><div className="mt-5 flex gap-3"><input value={guess} onChange={(e) => setGuess(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="Type the player name" className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"/><button onClick={submit} className="rounded-xl bg-primary px-5 py-3 text-primary-foreground">Guess</button></div>{clues < 4 && <button onClick={revealAnotherClue} className="mt-3 text-sm text-primary">Reveal another clue (-1 point)</button>}</>}{revealed && <div className="mt-6 rounded-2xl bg-secondary/40 p-5"><p className="text-sm text-muted-foreground">Answer</p><h2 className="mt-1 text-3xl font-semibold">{q.answer}</h2><div className="mt-4">{!last ? <button onClick={next} className="rounded-xl bg-primary px-5 py-3 text-primary-foreground">Next player</button> : <button onClick={() => void save()} disabled={!user || saved || saving} className="rounded-xl bg-primary px-5 py-3 text-primary-foreground disabled:opacity-50">{!user ? 'Sign in to save' : saving ? 'Saving...' : saved ? 'Saved' : 'Finish and save XP'}</button>}</div></div>}</div>
}
