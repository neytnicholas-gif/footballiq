'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { careerQuestions } from '@/lib/game-data'
import { useAuth } from '@/components/auth-provider'
import { QuizProgressBanner } from '@/components/quiz-progress-banner'
import { clearQuizProgress, loadQuizProgress, saveQuizProgress } from '@/lib/quiz-progress'
import { buildCompletionKey, createCompletionRunId, saveQuizResult } from '@/lib/quiz-save'
import { getCareerRound, playerGuessMatches, playerKnowledgeRoundNames, PLAYER_KNOWLEDGE_ROUND_COUNT } from '@/lib/player-knowledge-bank'

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
  const [round, setRound] = useState(1)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [runKey, setRunKey] = useState(() => createCompletionRunId())
  // Keep SSR and the first browser render identical; replay still creates a
  // fresh seed after hydration.
  const [shuffleSeed, setShuffleSeed] = useState(92731)
  const initialShuffleSeed = useRef(shuffleSeed)
  const [resumeState, setResumeState] = useState<{ index: number; selected: string | null; score: number; shuffleSeed: number; answers: string[] } | null>(null)
  const [checkingProgress, setCheckingProgress] = useState(Boolean(user))
  const questions = useMemo(() => getCareerRound(round), [round])
  const progressQuizId = `career-path-${round}`
  const q = questions[index]!
  const options = useMemo(() => {
    const pool = careerQuestions.filter((x) => x.answer !== q.answer)
    const offset = (round * 11 + index * 3) % (pool.length - 3)
    const wrong = pool.slice(offset, offset + 3).map((x) => x.answer)
    return seededShuffle([q.answer, ...wrong], shuffleSeed + index * 17)
  }, [q, index, round, shuffleSeed])
  const last = index === questions.length - 1

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
      const savedState = progress?.progress as { index?: number; selected?: string | null; score?: number; shuffleSeed?: number; answers?: string[] } | undefined
      const savedIndex = typeof savedState?.index === 'number' && Number.isInteger(savedState.index) ? savedState.index : null
      if (progress && progress.status === 'in_progress' && savedState && savedIndex !== null && savedIndex >= 0 && savedIndex < questions.length) {
        setResumeState({
          index: savedIndex,
          selected: typeof savedState.selected === 'string' ? savedState.selected : null,
          score: typeof savedState.score === 'number' ? savedState.score : progress.score,
          shuffleSeed: typeof savedState.shuffleSeed === 'number' ? savedState.shuffleSeed : initialShuffleSeed.current,
          answers: Array.isArray(savedState.answers) ? savedState.answers.filter((answer): answer is string => typeof answer === 'string') : [],
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

  function choose(name: string) {
    if (checkingProgress || resumeState || selected) return
    const nextScore = playerGuessMatches(name, q) ? score + 1 : score
    const nextAnswers = [...answers, name]
    setSelected(name)
    setScore(nextScore)
    setAnswers(nextAnswers)
    void saveQuizProgress({
      quizId: progressQuizId,
      currentIndex: index,
      score: nextScore,
      total: questions.length,
      progress: { index, selected: name, score: nextScore, shuffleSeed, answers: nextAnswers },
    })
  }

  function next() {
    const nextIndex = index + 1
    setIndex(nextIndex)
    setSelected(null)
    void saveQuizProgress({
      quizId: progressQuizId,
      currentIndex: nextIndex,
      score,
      total: questions.length,
      progress: { index: nextIndex, selected: null, score, shuffleSeed, answers },
    })
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

  function restart() {
    const newSeed = Date.now() % 233280
    setShuffleSeed(newSeed)
    setRunKey(createCompletionRunId())
    setIndex(0)
    setSelected(null)
    setScore(0)
    setAnswers([])
    setSaved(false)
    setResumeState(null)
    void clearQuizProgress(progressQuizId)
  }

  function startRound(nextRound: number) {
    void clearQuizProgress(progressQuizId)
    setRound(nextRound)
    setShuffleSeed((Date.now() + nextRound * 997) % 233280)
    setRunKey(createCompletionRunId())
    setIndex(0); setSelected(null); setScore(0); setAnswers([]); setSaved(false); setResumeState(null)
  }

  async function save() {
    if (!user || saved || saving) return
    setSaving(true)
    const { error, alreadyCompleted } = await saveQuizResult({ quizId: progressQuizId, score, total: questions.length, xp: 20 + score * 10, completionKey: buildCompletionKey(progressQuizId, runKey), proof: { kind: 'career', round, answers } })
    if (!error) {
      setSaved(true)
      void clearQuizProgress(progressQuizId)
      if (!alreadyCompleted) await refreshProfile()
    }
    setSaving(false)
  }

  return <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-sky-300/20 bg-sky-300/5 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-sky-500">Route {round} of {PLAYER_KNOWLEDGE_ROUND_COUNT}</p><p className="font-bold">{playerKnowledgeRoundNames[round-1]}</p><p className="mt-1 text-xs text-muted-foreground">10 careers now · 100 selected career paths in the library</p></div><label className="text-xs font-bold">Choose a route<select value={round} onChange={(event)=>startRound(Number(event.target.value))} className="mt-1 block min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm sm:w-64">{playerKnowledgeRoundNames.map((name,i)=><option key={name} value={i+1}>{i+1}. {name}</option>)}</select></label></div>
    {checkingProgress ? <div className="mb-5 rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">Checking saved progress…</div> : resumeState && !saved ? <div className="mb-5"><QuizProgressBanner title="Resume your quiz?" copy={`You left off at career ${resumeState.index + 1} of ${questions.length}.`} onContinue={continueProgress} onStartAgain={restart} /></div> : null}
    <div className="flex justify-between"><p className="text-sm text-muted-foreground">Career {index + 1} of {questions.length}</p><p className="font-semibold text-primary">Score {score}</p></div><p className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">Selected senior club path</p><p className="mt-2 text-sm font-bold uppercase tracking-widest text-primary">{q.hint}</p><div className="mt-4 flex flex-wrap items-center gap-2">{q.clubs.map((club, i) => <span key={`${club}-${i}`} className="flex items-center gap-2"><span className="rounded-xl border border-border bg-background px-4 py-3 font-medium">{club}</span>{i < q.clubs.length - 1 && <span className="text-muted-foreground">→</span>}</span>)}</div><div className="mt-7 grid gap-3 sm:grid-cols-2">{options.map((option) => { const correct = selected && playerGuessMatches(option,q); const wrong = selected === option && !playerGuessMatches(option,q); return <button key={option} onClick={() => choose(option)} disabled={checkingProgress || Boolean(resumeState) || Boolean(selected)} className={`rounded-2xl border p-4 text-left disabled:cursor-not-allowed disabled:opacity-65 ${correct ? 'border-primary bg-primary/10' : wrong ? 'border-destructive bg-destructive/10' : 'border-border bg-background hover:border-primary/50'}`}>{option}</button> })}</div>{selected && <div className="mt-6 rounded-2xl bg-secondary/40 p-5"><p className="font-semibold">{playerGuessMatches(selected,q) ? 'Correct.' : `Answer: ${q.answer}`}</p><div className="mt-4">{!last ? <button onClick={next} className="rounded-xl bg-primary px-5 py-3 text-primary-foreground">Next career</button> : <button onClick={() => void save()} disabled={!user || saved || saving} className="rounded-xl bg-primary px-5 py-3 text-primary-foreground disabled:opacity-50">{!user ? 'Sign in to save' : saving ? 'Saving...' : saved ? 'Saved' : 'Finish and save XP'}</button>}</div></div>}</div>
}
