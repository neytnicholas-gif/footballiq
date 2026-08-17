'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { QuizProgressBanner } from '@/components/quiz-progress-banner'
import { clearQuizProgress, loadQuizProgress, saveQuizProgress } from '@/lib/quiz-progress'
import { buildCompletionKey, createCompletionRunId, saveQuizResult } from '@/lib/quiz-save'
import { getWhoAmIRound, playerGuessMatches, playerKnowledgeRoundNames, PLAYER_KNOWLEDGE_ROUND_COUNT } from '@/lib/player-knowledge-bank'

export function WhoAmIGame() {
  const { user, refreshProfile } = useAuth()
  const [round, setRound] = useState(1)
  const [index, setIndex] = useState(0)
  const [clues, setClues] = useState(1)
  const [guess, setGuess] = useState('')
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState<Array<{ guess: string; clues: number }>>([])
  const [revealed, setRevealed] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [runKey, setRunKey] = useState(() => createCompletionRunId())
  const [resumeState, setResumeState] = useState<{ index: number; clues: number; guess: string; score: number; revealed: boolean; answers: Array<{ guess: string; clues: number }> } | null>(null)
  const [checkingProgress, setCheckingProgress] = useState(Boolean(user))
  const questions = useMemo(() => getWhoAmIRound(round), [round])
  const progressQuizId = `who-am-i-${round}`
  const q = questions[index]!
  const last = index === questions.length - 1
  const maxScore = questions.length * 4

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
      const progress = await loadQuizProgress(progressQuizId)
      if (!active) return
      const savedState = progress?.progress as { index?: number; clues?: number; guess?: string; score?: number; revealed?: boolean; answers?: Array<{ guess: string; clues: number }> } | undefined
      const savedIndex = typeof savedState?.index === 'number' && Number.isInteger(savedState.index) ? savedState.index : null
      if (progress && progress.status === 'in_progress' && savedState && savedIndex !== null && savedIndex >= 0 && savedIndex < questions.length) {
        setResumeState({
          index: savedIndex,
          clues: typeof savedState.clues === 'number' ? savedState.clues : 1,
          guess: typeof savedState.guess === 'string' ? savedState.guess : '',
          score: typeof savedState.score === 'number' ? savedState.score : progress.score,
          revealed: Boolean(savedState.revealed),
          answers: Array.isArray(savedState.answers) ? savedState.answers : [],
        })
      } else {
        setResumeState(null)
      }
      setCheckingProgress(false)
    })()

    return () => {
      active = false
    }
  }, [progressQuizId, questions.length, user])

  function submit() {
    if (checkingProgress || resumeState || revealed || !guess.trim()) return
    const ok = playerGuessMatches(guess, q)
    const nextScore = ok ? score + (5 - clues) : score
    const nextAnswers = [...answers, { guess: guess.trim(), clues }]
    if (ok) setScore(nextScore)
    setAnswers(nextAnswers)
    setRevealed(true)
    void saveQuizProgress({
      quizId: progressQuizId,
      currentIndex: index,
      score: nextScore,
      total: maxScore,
      progress: { index, clues, guess, score: nextScore, revealed: true, answers: nextAnswers },
    })
  }
  function next() {
    const nextIndex = index + 1
    setIndex(nextIndex)
    setClues(1)
    setGuess('')
    setRevealed(false)
    void saveQuizProgress({
      quizId: progressQuizId,
      currentIndex: nextIndex,
      score,
      total: maxScore,
      progress: { index: nextIndex, clues: 1, guess: '', score, revealed: false, answers },
    })
  }
  function revealAnotherClue() {
    if (checkingProgress || resumeState) return
    setClues((current) => {
      const nextClues = current + 1
      void saveQuizProgress({
        quizId: progressQuizId,
        currentIndex: index,
        score,
        total: maxScore,
        progress: { index, clues: nextClues, guess, score, revealed, answers },
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
    setAnswers(resumeState.answers)
    setResumeState(null)
  }
  function restart() {
    setIndex(0)
    setClues(1)
    setGuess('')
    setScore(0)
    setAnswers([])
    setRevealed(false)
    setSaved(false)
    setRunKey(createCompletionRunId())
    setResumeState(null)
    void clearQuizProgress(progressQuizId)
  }
  function startRound(nextRound: number) {
    void clearQuizProgress(progressQuizId)
    setRound(nextRound); setIndex(0); setClues(1); setGuess(''); setScore(0); setAnswers([]); setRevealed(false); setSaved(false); setResumeState(null); setRunKey(createCompletionRunId())
  }
  async function save() {
    if (!user || saved || saving) return
    setSaving(true)
    const { error, alreadyCompleted } = await saveQuizResult({ quizId: progressQuizId, score, total: maxScore, xp: 20 + score * 3, completionKey: buildCompletionKey(progressQuizId, runKey), proof: { kind: 'who-am-i', round, answers } })
    if (!error) {
      setSaved(true)
      void clearQuizProgress(progressQuizId)
      if (!alreadyCompleted) await refreshProfile()
    }
    setSaving(false)
  }

  return <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-violet-300/20 bg-violet-300/5 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-violet-500">Mystery set {round} of {PLAYER_KNOWLEDGE_ROUND_COUNT}</p><p className="font-bold">{playerKnowledgeRoundNames[round-1]}</p><p className="mt-1 text-xs text-muted-foreground">10 players now · 100 different players in the library</p></div><label className="text-xs font-bold">Choose a set<select value={round} onChange={(event)=>startRound(Number(event.target.value))} className="mt-1 block min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm sm:w-64">{playerKnowledgeRoundNames.map((name,i)=><option key={name} value={i+1}>{i+1}. {name}</option>)}</select></label></div>
    {checkingProgress ? <div className="mb-5 rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">Checking saved progress…</div> : resumeState && !saved ? <div className="mb-5"><QuizProgressBanner title="Resume your quiz?" copy={`You left off at player ${resumeState.index + 1} of ${questions.length}.`} onContinue={continueProgress} onStartAgain={restart} /></div> : null}
    <div className="flex justify-between"><p className="text-sm text-muted-foreground">Player {index + 1} of {questions.length}</p><p className="font-semibold text-primary">{score} / {maxScore} points</p></div><div className="mt-6 space-y-3">{q.clues.slice(0, clues).map((c, i) => <div key={c} className="rounded-2xl border border-border bg-background p-4"><span className="mr-3 text-primary">Clue {i + 1}</span>{c}</div>)}</div>{!revealed && <><div className="mt-5 flex gap-3"><input value={guess} onChange={(e) => setGuess(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} disabled={checkingProgress || Boolean(resumeState)} placeholder="Type the player name" className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-65"/><button onClick={submit} disabled={checkingProgress || Boolean(resumeState)} className="rounded-xl bg-primary px-5 py-3 text-primary-foreground disabled:cursor-not-allowed disabled:opacity-65">Guess</button></div><p className="mt-2 text-xs text-muted-foreground">Accents and sensible alternate spellings are accepted.</p>{clues < 4 && <button onClick={revealAnotherClue} disabled={checkingProgress || Boolean(resumeState)} className="mt-3 text-sm text-primary disabled:cursor-not-allowed disabled:opacity-65">Reveal another clue (-1 point)</button>}</>}{revealed && <div className="mt-6 rounded-2xl bg-secondary/40 p-5"><p className="text-sm text-muted-foreground">Answer</p><h2 className="mt-1 text-3xl font-semibold">{q.answer}</h2><div className="mt-4">{!last ? <button onClick={next} className="rounded-xl bg-primary px-5 py-3 text-primary-foreground">Next player</button> : <button onClick={() => void save()} disabled={!user || saved || saving} className="rounded-xl bg-primary px-5 py-3 text-primary-foreground disabled:opacity-50">{!user ? 'Sign in to save' : saving ? 'Saving...' : saved ? 'Saved' : 'Finish and save XP'}</button>}</div></div>}</div>
}
