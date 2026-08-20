'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { QuizProgressBanner } from '@/components/quiz-progress-banner'
import { refereeQuestions } from '@/lib/game-data'
import {
  formatCountdown,
  getBrusselsDateKey,
  getBrusselsDisplayDate,
  getDailySeedFromKey,
  getSecondsUntilBrusselsMidnight,
} from '@/lib/daily'
import { clearQuizProgress, loadQuizProgress, saveQuizProgress } from '@/lib/quiz-progress'
import { buildCompletionKey, saveQuizResult } from '@/lib/quiz-save'
import { CalendarDays, Check, Clock3, Loader2, LockKeyhole, Share2, Trophy } from 'lucide-react'

type DailyHistoryEntry = {
  key: string
  score: number
  total: number
  completedAt: string
  shared?: boolean
  answers?: number[]
}

const DAILY_HISTORY_STORAGE_KEY = 'footballiq-daily-history-v1'

function loadDailyHistory() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(DAILY_HISTORY_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, DailyHistoryEntry>) : {}
  } catch {
    return {}
  }
}

function saveDailyHistory(history: Record<string, DailyHistoryEntry>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(DAILY_HISTORY_STORAGE_KEY, JSON.stringify(history))
  } catch {
    // Ignore storage failures and keep gameplay functional.
  }
}

function xpFor(score: number, total: number) {
  return 20 + score * 10 + (score === total ? 40 : 0)
}

export function DailyChallenge() {
  const { user, refreshProfile } = useAuth()
  // Keep the server render and first browser render identical. The Brussels
  // clock is populated immediately after mount, avoiding countdown hydration
  // mismatches caused by the two renders occurring in different seconds.
  const [dailyKey, setDailyKey] = useState('')
  const [displayDate, setDisplayDate] = useState('')
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [completed, setCompleted] = useState(false)
  const [savedReward, setSavedReward] = useState(false)
  const [savingReward, setSavingReward] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState<Record<string, DailyHistoryEntry>>({})
  const [resumeState, setResumeState] = useState<{ dailyKey: string; index: number; selected: number | null; score: number; completed: boolean; answers: number[] } | null>(null)
  const [checkingProgress, setCheckingProgress] = useState(true)

  const items = useMemo(() => {
    const seed = getDailySeedFromKey(dailyKey)
    return Array.from({ length: 5 }, (_, i) => {
      const question = refereeQuestions[(seed + i * 3) % refereeQuestions.length]
      return {
        prompt: question.scenario,
        options: question.options,
        answer: question.answer,
        explanation: question.explanation,
      }
    })
  }, [dailyKey])

  const item = items[index]
  const finished = selected !== null && index === items.length - 1
  const quizId = `daily-${dailyKey}`

  useEffect(() => {
    setHistory(loadDailyHistory())
  }, [])

  useEffect(() => {
    let active = true

    if (!dailyKey) {
      setResumeState(null)
      setCheckingProgress(false)
      return () => { active = false }
    }

    setCheckingProgress(true)
    void (async () => {
      const progress = await loadQuizProgress(`daily-${dailyKey}`)
      if (!active) return
      const savedState = progress?.progress as { dailyKey?: string; index?: number; selected?: number | null; score?: number; completed?: boolean; answers?: number[] } | undefined
      const savedIndex = typeof savedState?.index === 'number' && Number.isInteger(savedState.index) ? savedState.index : null
      if (progress && progress.status === 'in_progress' && savedState && savedState.dailyKey === dailyKey && savedIndex !== null && savedIndex >= 0 && savedIndex < items.length) {
        setResumeState({
          dailyKey,
          index: savedIndex,
          selected: typeof savedState.selected === 'number' ? savedState.selected : null,
          score: typeof savedState.score === 'number' ? savedState.score : progress.score,
          completed: Boolean(savedState.completed),
          answers: Array.isArray(savedState.answers) ? savedState.answers.filter(Number.isSafeInteger) : [],
        })
      } else {
        setResumeState(null)
      }
      setCheckingProgress(false)
    })()

    return () => {
      active = false
    }
  }, [dailyKey, items.length, user])

  useEffect(() => {
    const today = history[dailyKey]
    if (today) {
      setScore(today.score)
      setAnswers(today.answers ?? [])
      setCompleted(true)
      setIndex(0)
      setSelected(null)
    } else {
      setScore(0)
      setAnswers([])
      setCompleted(false)
      setIndex(0)
      setSelected(null)
      setSavedReward(false)
      setSaveMessage('')
    }
  }, [dailyKey, history])

  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      const nextKey = getBrusselsDateKey(now)
      setDisplayDate(getBrusselsDisplayDate(now))
      setSecondsLeft(getSecondsUntilBrusselsMidnight(now))
      setDailyKey((current) => (current === nextKey ? current : nextKey))
    }
    updateClock()
    const timer = window.setInterval(updateClock, 1000)
    return () => window.clearInterval(timer)
  }, [])

  function choose(optionIndex: number) {
    if (checkingProgress || resumeState || selected !== null || completed) return
    const nextScore = optionIndex === item.answer ? score + 1 : score
    const nextAnswers = [...answers, optionIndex]
    setSelected(optionIndex)
    setScore(nextScore)
    setAnswers(nextAnswers)
    void saveQuizProgress({
      quizId,
      currentIndex: index,
      score: nextScore,
      total: items.length,
      progress: { dailyKey, index, selected: optionIndex, score: nextScore, completed: false, answers: nextAnswers },
    })
  }

  function next() {
    if (index >= items.length - 1) return
    const nextIndex = index + 1
    setIndex(nextIndex)
    setSelected(null)
    void saveQuizProgress({
      quizId,
      currentIndex: nextIndex,
      score,
      total: items.length,
      progress: { dailyKey, index: nextIndex, selected: null, score, completed: false, answers },
    })
  }

  async function saveRewardOnce() {
    if (!user || savingReward || savedReward) return
    setSavingReward(true)
    setSaveMessage('')

    const { error, alreadyCompleted } = await saveQuizResult({
      quizId,
      score,
      total: items.length,
      xp: xpFor(score, items.length),
      completionKey: buildCompletionKey(quizId, 'reward'),
      proof: { kind: 'daily', dateKey: dailyKey, answers },
    })

    if (error) {
      setSaveMessage('Reward save failed. Please retry.')
      setSavingReward(false)
      return
    }

    if (!alreadyCompleted) {
      await refreshProfile()
      setSaveMessage('Today’s reward has been saved to your account.')
    } else {
      setSaveMessage('Today’s reward was already credited for this account.')
    }

    setSavedReward(true)
    void clearQuizProgress(quizId)
    setSavingReward(false)
  }

  async function shareResult() {
    const blocks = Array.from({ length: items.length }, (_, i) => (i < score ? '🟩' : '⬛')).join('')
    const text = `Early Shout Daily Challenge ${dailyKey}\nScore: ${score}/${items.length}\n${blocks}\nTimezone: Europe/Brussels\n${window.location.origin}/daily`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
      const nextHistory = {
        ...history,
        [dailyKey]: {
          ...(history[dailyKey] ?? {
            key: dailyKey,
            score,
            total: items.length,
            completedAt: new Date().toISOString(),
          }),
          shared: true,
          answers,
        },
      }
      setHistory(nextHistory)
      saveDailyHistory(nextHistory)
    } catch {
      setSaveMessage('Could not copy your result on this device.')
    }
  }

  function finishAndStore() {
    const entry: DailyHistoryEntry = {
      key: dailyKey,
      score,
      total: items.length,
      completedAt: new Date().toISOString(),
      shared: history[dailyKey]?.shared,
      answers,
    }
    const nextHistory = { ...history, [dailyKey]: entry }
    setHistory(nextHistory)
    saveDailyHistory(nextHistory)
    setCompleted(true)
    void clearQuizProgress(quizId)
  }

  function practiceAgain() {
    setIndex(0)
    setSelected(null)
    setScore(0)
    setAnswers([])
    setCompleted(false)
    setSavedReward(false)
    setSaveMessage('Practice run active. Daily account reward remains once per day.')
    void saveQuizProgress({
      quizId,
      currentIndex: 0,
      score: 0,
      total: items.length,
      progress: { dailyKey, index: 0, selected: null, score: 0, completed: false, answers: [] },
    })
  }

  function continueProgress() {
    if (!resumeState) return
    setIndex(resumeState.index)
    setSelected(resumeState.selected)
    setScore(resumeState.score)
    setCompleted(resumeState.completed)
    setAnswers(resumeState.answers)
    setResumeState(null)
  }

  function restartProgress() {
    setIndex(0)
    setSelected(null)
    setScore(0)
    setAnswers([])
    setCompleted(false)
    setSavedReward(false)
    setResumeState(null)
    void clearQuizProgress(quizId)
  }

  return (
    <div className="rounded-[1.35rem] border border-amber-300/15 bg-slate-950/55 p-4 sm:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-700/70 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-300/25 bg-amber-300/10"><CalendarDays className="size-5 text-amber-200" /></span>
          <div>
          <p className="text-[11px] font-bold uppercase tracking-[.2em] text-amber-200">Today’s event</p>
          <h2 className="mt-1 text-xl font-bold text-slate-100 sm:text-2xl">{displayDate || 'Loading today…'}</h2>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-400"><Clock3 className="size-3.5" /> Resets in {secondsLeft === null ? '--:--:--' : formatCountdown(secondsLeft)} · Europe/Brussels</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <div className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs text-slate-400">Progress <strong className="ml-1 text-slate-100">{completed ? items.length : index + 1}/{items.length}</strong></div>
          <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-xs text-amber-100">Score <strong className="ml-1">{score}</strong></div>
        </div>
      </div>

      {checkingProgress ? <div className="mt-5 flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300"><Loader2 className="size-4 animate-spin text-amber-200" /> Checking saved progress…</div> : resumeState && !completed ? <div className="mt-5"><QuizProgressBanner title="Resume your quiz?" copy={`You left off at question ${resumeState.index + 1} of ${items.length} for today’s Daily Challenge.`} onContinue={continueProgress} onStartAgain={restartProgress} /></div> : null}

      {completed ? (
        <div className="mt-7 space-y-4">
          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5">
            <div className="flex items-center gap-2 text-emerald-200"><Trophy className="size-5" /><p className="font-bold">Daily complete · {score}/{items.length}</p></div>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">You can practise again, but your account can earn today’s XP only once.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {!user ? (
              <>
                <Link href="/login" className="inline-flex min-h-11 items-center rounded-xl bg-amber-300 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"><LockKeyhole className="mr-2 size-4" />Sign in to save reward</Link>
                <Link href="/signup" className="inline-flex min-h-11 items-center rounded-xl border border-slate-600 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-slate-400">Create account</Link>
              </>
            ) : (
              <button
                onClick={() => void saveRewardOnce()}
                disabled={savingReward || savedReward}
                className="inline-flex min-h-11 items-center rounded-xl bg-amber-300 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingReward ? 'Saving reward…' : savedReward ? 'Reward saved' : 'Save today’s reward'}
              </button>
            )}
            <button onClick={() => void shareResult()} className="inline-flex min-h-11 items-center rounded-xl border border-slate-600 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-slate-400">
              {copied ? <Check className="mr-2 size-4 text-emerald-300" /> : <Share2 className="mr-2 size-4" />}{copied ? 'Copied!' : 'Share result'}
            </button>
            <button onClick={practiceAgain} className="min-h-11 rounded-xl border border-slate-600 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-slate-400">Practice again</button>
          </div>

          {saveMessage && <p className="text-sm text-muted-foreground">{saveMessage}</p>}

          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[.15em] text-slate-400">Recent daily history</p>
            <div className="mt-3 space-y-1 text-sm text-slate-300">
              {Object.values(history)
                .sort((a, b) => b.key.localeCompare(a.key))
                .slice(0, 5)
                .map((entry) => (
                  <p key={entry.key}>{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Brussels' }).format(new Date(`${entry.key}T12:00:00Z`))}: {entry.score}/{entry.total}</p>
                ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-400"><span>Question {index + 1} of {items.length}</span><span>Today’s round</span></div>
            <div className="mt-3 grid grid-cols-5 gap-1.5" aria-label={`${index + 1} of ${items.length} questions`}>
              {items.map((_, step) => <span key={step} className={`h-1.5 rounded-full ${step <= index ? 'bg-amber-300' : 'bg-slate-700'}`} />)}
            </div>
          </div>
          <h3 className="mt-5 max-w-3xl text-lg font-bold leading-relaxed text-slate-100 sm:text-xl">{item.prompt}</h3>
          <div className="mt-5 grid gap-3">
            {item.options.map((option, optionIndex) => {
              const correct = selected !== null && optionIndex === item.answer
              const wrong = selected === optionIndex && optionIndex !== item.answer
              return (
                <button
                  key={option}
                  onClick={() => choose(optionIndex)}
                  disabled={checkingProgress || Boolean(resumeState) || selected !== null}
                  className={`min-h-12 rounded-xl border p-4 text-left text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-amber-200 ${correct ? 'border-emerald-300/50 bg-emerald-300/12 text-emerald-100' : wrong ? 'border-rose-300/50 bg-rose-300/10 text-rose-100' : 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-amber-300/40 hover:bg-slate-800'} disabled:cursor-default`}
                >
                  {option}
                </button>
              )
            })}
          </div>
          {selected !== null && (
            <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
              <p className="font-bold text-slate-100">{selected === item.answer ? 'Correct.' : `Correct answer: ${item.options[item.answer]}`}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.explanation}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {!finished ? (
                  <button onClick={next} className="min-h-11 rounded-xl bg-amber-300 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-200">Next question</button>
                ) : (
                  <button onClick={finishAndStore} className="min-h-11 rounded-xl bg-amber-300 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-200">Finish daily challenge</button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
