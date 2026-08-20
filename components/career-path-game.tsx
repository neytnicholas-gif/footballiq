'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { QuizDifficultyPicker, useQuizDifficulty } from '@/components/quiz-difficulty-picker'
import { QuizProgressBanner } from '@/components/quiz-progress-banner'
import {
  getCareerDifficultyPool,
  getCareerDifficultyRound,
  playerGuessMatches,
  playerKnowledgeDifficultyRoundNames,
  PLAYER_KNOWLEDGE_DIFFICULTY_ROUND_COUNT,
} from '@/lib/player-knowledge-bank'
import { quizDifficulties, quizDifficultyMeta, quizXp, type QuizDifficulty } from '@/lib/quiz-difficulty'
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

const questionCounts = Object.fromEntries(quizDifficulties.map((difficulty) => [difficulty, 20])) as Record<QuizDifficulty, number>
type ResumeState = { index: number; selected: string | null; score: number; shuffleSeed: number; answers: string[] }

export function CareerPathGame() {
  const { user, refreshProfile } = useAuth()
  const { difficulty, setDifficulty, ready } = useQuizDifficulty('career-path')
  const [round, setRound] = useState(1)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [runKey, setRunKey] = useState(() => createCompletionRunId())
  const [shuffleSeed, setShuffleSeed] = useState(92731)
  const initialShuffleSeed = useRef(shuffleSeed)
  const [resumeState, setResumeState] = useState<ResumeState | null>(null)
  const [checkingProgress, setCheckingProgress] = useState(true)
  const questions = useMemo(() => getCareerDifficultyRound(difficulty, round), [difficulty, round])
  const difficultyPool = useMemo(() => getCareerDifficultyPool(difficulty), [difficulty])
  const quizId = `career-path-${difficulty}-${round}`
  const q = questions[index]!
  const options = useMemo(() => {
    const wrongPool = difficultyPool.filter((item) => item.answer !== q.answer)
    const shuffledWrong = seededShuffle(wrongPool, shuffleSeed + round * 101 + index * 17).slice(0, 3).map((item) => item.answer)
    return seededShuffle([q.answer, ...shuffledWrong], shuffleSeed + index * 23)
  }, [difficultyPool, index, q.answer, round, shuffleSeed])
  const last = index === questions.length - 1
  const runStarted = index > 0 || answers.length > 0 || Boolean(selected)

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
          selected: typeof savedState.selected === 'string' ? savedState.selected : null,
          score: typeof savedState.score === 'number' ? savedState.score : progress.score,
          shuffleSeed: typeof savedState.shuffleSeed === 'number' ? savedState.shuffleSeed : initialShuffleSeed.current,
          answers: Array.isArray(savedState.answers) ? savedState.answers.filter((answer): answer is string => typeof answer === 'string') : [],
        })
      } else setResumeState(null)
      setCheckingProgress(false)
    })()
    return () => { active = false }
  }, [questions.length, quizId, user])

  function reset(nextRound = round) {
    void clearQuizProgress(quizId)
    setRound(nextRound)
    setShuffleSeed((Date.now() + nextRound * 997) % 233280)
    setRunKey(createCompletionRunId())
    setIndex(0)
    setSelected(null)
    setScore(0)
    setAnswers([])
    setSaved(false)
    setResumeState(null)
  }

  function changeDifficulty(nextDifficulty: QuizDifficulty) {
    void clearQuizProgress(quizId)
    setDifficulty(nextDifficulty)
    setRound(1)
    setShuffleSeed((Date.now() + quizDifficulties.indexOf(nextDifficulty) * 997) % 233280)
    setRunKey(createCompletionRunId())
    setIndex(0)
    setSelected(null)
    setScore(0)
    setAnswers([])
    setSaved(false)
    setResumeState(null)
  }

  function choose(name: string) {
    if (checkingProgress || resumeState || selected) return
    const nextScore = playerGuessMatches(name, q) ? score + 1 : score
    const nextAnswers = [...answers, name]
    setSelected(name)
    setScore(nextScore)
    setAnswers(nextAnswers)
    void saveQuizProgress({ quizId, currentIndex: index, score: nextScore, total: questions.length, progress: { index, selected: name, score: nextScore, shuffleSeed, answers: nextAnswers } })
  }

  function next() {
    const nextIndex = index + 1
    setIndex(nextIndex)
    setSelected(null)
    void saveQuizProgress({ quizId, currentIndex: nextIndex, score, total: questions.length, progress: { index: nextIndex, selected: null, score, shuffleSeed, answers } })
  }

  function continueProgress() {
    if (!resumeState) return
    setShuffleSeed(resumeState.shuffleSeed)
    setIndex(resumeState.index)
    setSelected(resumeState.selected)
    setScore(resumeState.score)
    setAnswers(resumeState.answers)
    setResumeState(null)
  }

  async function save() {
    if (!user || saved || saving) return
    setSaving(true)
    const xp = quizXp(20 + score * 10, difficulty)
    const { error, alreadyCompleted } = await saveQuizResult({
      quizId,
      score,
      total: questions.length,
      xp,
      completionKey: buildCompletionKey(quizId, runKey),
      proof: { kind: 'career', difficulty, round, answers },
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
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-sky-300/20 bg-sky-300/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-black uppercase tracking-wider text-sky-500">{quizDifficultyMeta[difficulty].label} route {round} of {PLAYER_KNOWLEDGE_DIFFICULTY_ROUND_COUNT}</p><p className="font-bold">{playerKnowledgeDifficultyRoundNames[round - 1]}</p><p className="mt-1 text-xs text-muted-foreground">10 careers now · 20 carefully ranked careers at this level · {quizDifficultyMeta[difficulty].xpMultiplier}× XP</p></div>
        <label className="text-xs font-bold">Choose a route<select value={round} onChange={(event) => reset(Number(event.target.value))} disabled={runStarted || Boolean(resumeState)} className="mt-1 block min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm disabled:opacity-55 sm:w-64">{playerKnowledgeDifficultyRoundNames.map((name, itemIndex) => <option key={name} value={itemIndex + 1}>{itemIndex + 1}. {name}</option>)}</select></label>
      </div>
      {checkingProgress ? <div className="mb-5 rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">Checking saved progress…</div> : resumeState && !saved ? <div className="mb-5"><QuizProgressBanner title="Resume your quiz?" copy={`You left off at career ${resumeState.index + 1} of ${questions.length}.`} onContinue={continueProgress} onStartAgain={() => reset()} /></div> : null}
      <div className="flex justify-between"><p className="text-sm text-muted-foreground">Career {index + 1} of {questions.length}</p><p className="font-semibold text-primary">Score {score}</p></div>
      <p className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">Selected senior club path</p><p className="mt-2 text-sm font-bold uppercase tracking-widest text-primary">{q.hint}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">{q.clubs.map((club, clubIndex) => <span key={`${club}-${clubIndex}`} className="flex items-center gap-2"><span className="rounded-xl border border-border bg-background px-4 py-3 font-medium">{club}</span>{clubIndex < q.clubs.length - 1 && <span className="text-muted-foreground">→</span>}</span>)}</div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">{options.map((option) => { const correct = selected && playerGuessMatches(option, q); const wrong = selected === option && !playerGuessMatches(option, q); return <button key={option} type="button" onClick={() => choose(option)} disabled={checkingProgress || Boolean(resumeState) || Boolean(selected)} className={`rounded-2xl border p-4 text-left disabled:opacity-65 ${correct ? 'border-primary bg-primary/10' : wrong ? 'border-destructive bg-destructive/10' : 'border-border bg-background hover:border-primary/50'}`}>{option}</button> })}</div>
      {selected && <div className="mt-6 rounded-2xl bg-secondary/40 p-5"><p className="font-semibold">{playerGuessMatches(selected, q) ? 'Correct.' : `Answer: ${q.answer}`}</p><div className="mt-4">{!last ? <button type="button" onClick={next} className="rounded-xl bg-primary px-5 py-3 text-primary-foreground">Next career</button> : <button type="button" onClick={() => void save()} disabled={!user || saved || saving} className="rounded-xl bg-primary px-5 py-3 text-primary-foreground disabled:opacity-50">{!user ? 'Sign in to save' : saving ? 'Saving...' : saved ? 'Saved' : `Finish and save ${quizXp(20 + score * 10, difficulty)} XP`}</button>}</div></div>}
    </div>
  </div>
}
