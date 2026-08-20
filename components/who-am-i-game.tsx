'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { QuizDifficultyPicker, useQuizDifficulty } from '@/components/quiz-difficulty-picker'
import { QuizProgressBanner } from '@/components/quiz-progress-banner'
import {
  getWhoAmIDifficultyRound,
  playerGuessMatches,
  playerKnowledgeDifficultyRoundNames,
  PLAYER_KNOWLEDGE_DIFFICULTY_ROUND_COUNT,
} from '@/lib/player-knowledge-bank'
import { quizDifficulties, quizDifficultyMeta, quizXp, type QuizDifficulty } from '@/lib/quiz-difficulty'
import { clearQuizProgress, loadQuizProgress, saveQuizProgress } from '@/lib/quiz-progress'
import { buildCompletionKey, createCompletionRunId, saveQuizResult } from '@/lib/quiz-save'

const questionCounts = Object.fromEntries(quizDifficulties.map((difficulty) => [difficulty, 20])) as Record<QuizDifficulty, number>
type Answer = { guess: string; clues: number }
type ResumeState = { index: number; clues: number; guess: string; score: number; revealed: boolean; answers: Answer[] }

export function WhoAmIGame() {
  const { user, refreshProfile } = useAuth()
  const { difficulty, setDifficulty, ready } = useQuizDifficulty('who-am-i')
  const [round, setRound] = useState(1)
  const [index, setIndex] = useState(0)
  const [clues, setClues] = useState(1)
  const [guess, setGuess] = useState('')
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [revealed, setRevealed] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [runKey, setRunKey] = useState(() => createCompletionRunId())
  const [resumeState, setResumeState] = useState<ResumeState | null>(null)
  const [checkingProgress, setCheckingProgress] = useState(true)
  const questions = useMemo(() => getWhoAmIDifficultyRound(difficulty, round), [difficulty, round])
  const quizId = `who-am-i-${difficulty}-${round}`
  const q = questions[index]!
  const last = index === questions.length - 1
  const maxScore = questions.length * 4
  const runStarted = index > 0 || answers.length > 0 || revealed

  useEffect(() => {
    let active = true
    setCheckingProgress(true)
    void (async () => {
      const progress = await loadQuizProgress(quizId)
      if (!active) return
      const savedState = progress?.progress as Partial<ResumeState> | undefined
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
      } else setResumeState(null)
      setCheckingProgress(false)
    })()
    return () => { active = false }
  }, [questions.length, quizId, user])

  function reset(nextRound = round) {
    void clearQuizProgress(quizId)
    setRound(nextRound)
    setIndex(0)
    setClues(1)
    setGuess('')
    setScore(0)
    setAnswers([])
    setRevealed(false)
    setSaved(false)
    setRunKey(createCompletionRunId())
    setResumeState(null)
  }

  function changeDifficulty(nextDifficulty: QuizDifficulty) {
    void clearQuizProgress(quizId)
    setDifficulty(nextDifficulty)
    setRound(1)
    setIndex(0)
    setClues(1)
    setGuess('')
    setScore(0)
    setAnswers([])
    setRevealed(false)
    setSaved(false)
    setRunKey(createCompletionRunId())
    setResumeState(null)
  }

  function submit() {
    if (checkingProgress || resumeState || revealed || !guess.trim()) return
    const correct = playerGuessMatches(guess, q)
    const nextScore = correct ? score + (5 - clues) : score
    const nextAnswers = [...answers, { guess: guess.trim(), clues }]
    setScore(nextScore)
    setAnswers(nextAnswers)
    setRevealed(true)
    void saveQuizProgress({ quizId, currentIndex: index, score: nextScore, total: maxScore, progress: { index, clues, guess, score: nextScore, revealed: true, answers: nextAnswers } })
  }

  function next() {
    const nextIndex = index + 1
    setIndex(nextIndex)
    setClues(1)
    setGuess('')
    setRevealed(false)
    void saveQuizProgress({ quizId, currentIndex: nextIndex, score, total: maxScore, progress: { index: nextIndex, clues: 1, guess: '', score, revealed: false, answers } })
  }

  function revealAnotherClue() {
    if (checkingProgress || resumeState) return
    setClues((current) => {
      const nextClues = current + 1
      void saveQuizProgress({ quizId, currentIndex: index, score, total: maxScore, progress: { index, clues: nextClues, guess, score, revealed, answers } })
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

  async function save() {
    if (!user || saved || saving) return
    setSaving(true)
    const xp = quizXp(20 + score * 3, difficulty)
    const { error, alreadyCompleted } = await saveQuizResult({
      quizId,
      score,
      total: maxScore,
      xp,
      completionKey: buildCompletionKey(quizId, runKey),
      proof: { kind: 'who-am-i', difficulty, round, answers },
    })
    if (!error) {
      setSaved(true)
      void clearQuizProgress(quizId)
      if (!alreadyCompleted) await refreshProfile()
    }
    setSaving(false)
  }

  return <div className="space-y-5">
    <QuizDifficultyPicker value={difficulty} onChange={changeDifficulty} counts={questionCounts} disabled={!ready || runStarted || Boolean(resumeState)} />
    <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-violet-300/20 bg-violet-300/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-black uppercase tracking-wider text-violet-500">{quizDifficultyMeta[difficulty].label} mystery set {round} of {PLAYER_KNOWLEDGE_DIFFICULTY_ROUND_COUNT}</p><p className="font-bold">{playerKnowledgeDifficultyRoundNames[round - 1]}</p><p className="mt-1 text-xs text-muted-foreground">10 players now · 20 carefully ranked players at this level · {quizDifficultyMeta[difficulty].xpMultiplier}× XP</p></div>
        <label className="text-xs font-bold">Choose a set<select value={round} onChange={(event) => reset(Number(event.target.value))} disabled={runStarted || Boolean(resumeState)} className="mt-1 block min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm disabled:opacity-55 sm:w-64">{playerKnowledgeDifficultyRoundNames.map((name, itemIndex) => <option key={name} value={itemIndex + 1}>{itemIndex + 1}. {name}</option>)}</select></label>
      </div>
      {checkingProgress ? <div className="mb-5 rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">Checking saved progress…</div> : resumeState && !saved ? <div className="mb-5"><QuizProgressBanner title="Resume your quiz?" copy={`You left off at player ${resumeState.index + 1} of ${questions.length}.`} onContinue={continueProgress} onStartAgain={() => reset()} /></div> : null}
      <div className="flex justify-between"><p className="text-sm text-muted-foreground">Player {index + 1} of {questions.length}</p><p className="font-semibold text-primary">{score} / {maxScore} points</p></div>
      <div className="mt-6 space-y-3">{q.clues.slice(0, clues).map((clue, clueIndex) => <div key={clue} className="rounded-2xl border border-border bg-background p-4"><span className="mr-3 text-primary">Clue {clueIndex + 1}</span>{clue}</div>)}</div>
      {!revealed && <><div className="mt-5 flex gap-3"><input value={guess} onChange={(event) => setGuess(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && submit()} disabled={checkingProgress || Boolean(resumeState)} placeholder="Type the player name" className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary disabled:opacity-65"/><button type="button" onClick={submit} disabled={checkingProgress || Boolean(resumeState) || !guess.trim()} className="rounded-xl bg-primary px-5 py-3 text-primary-foreground disabled:opacity-65">Guess</button></div><p className="mt-2 text-xs text-muted-foreground">Accents and sensible alternate spellings are accepted.</p>{clues < 4 && <button type="button" onClick={revealAnotherClue} disabled={checkingProgress || Boolean(resumeState)} className="mt-3 text-sm text-primary disabled:opacity-65">Reveal another clue (-1 point)</button>}</>}
      {revealed && <div className="mt-6 rounded-2xl bg-secondary/40 p-5"><p className="text-sm text-muted-foreground">Answer</p><h2 className="mt-1 text-3xl font-semibold">{q.answer}</h2><div className="mt-4">{!last ? <button type="button" onClick={next} className="rounded-xl bg-primary px-5 py-3 text-primary-foreground">Next player</button> : <button type="button" onClick={() => void save()} disabled={!user || saved || saving} className="rounded-xl bg-primary px-5 py-3 text-primary-foreground disabled:opacity-50">{!user ? 'Sign in to save' : saving ? 'Saving...' : saved ? 'Saved' : `Finish and save ${quizXp(20 + score * 3, difficulty)} XP`}</button>}</div></div>}
    </div>
  </div>
}
