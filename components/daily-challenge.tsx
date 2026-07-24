'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { refereeQuestions } from '@/lib/game-data'
import {
  formatCountdown,
  getBrusselsDateKey,
  getBrusselsDisplayDate,
  getDailySeedFromKey,
  getSecondsUntilBrusselsMidnight,
} from '@/lib/daily'
import { saveQuizResult } from '@/lib/quiz-save'
import { supabase } from '@/lib/supabase'

type DailyHistoryEntry = {
  key: string
  score: number
  total: number
  completedAt: string
  shared?: boolean
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
  const [dailyKey, setDailyKey] = useState(() => getBrusselsDateKey())
  const [displayDate, setDisplayDate] = useState(() => getBrusselsDisplayDate())
  const [secondsLeft, setSecondsLeft] = useState(() => getSecondsUntilBrusselsMidnight())
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [savedReward, setSavedReward] = useState(false)
  const [savingReward, setSavingReward] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState<Record<string, DailyHistoryEntry>>({})

  useEffect(() => {
    setHistory(loadDailyHistory())
  }, [])

  useEffect(() => {
    const today = history[dailyKey]
    if (today) {
      setScore(today.score)
      setCompleted(true)
      setIndex(0)
      setSelected(null)
    } else {
      setScore(0)
      setCompleted(false)
      setIndex(0)
      setSelected(null)
      setSavedReward(false)
      setSaveMessage('')
    }
  }, [dailyKey, history])

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = new Date()
      const nextKey = getBrusselsDateKey(now)
      setDisplayDate(getBrusselsDisplayDate(now))
      setSecondsLeft(getSecondsUntilBrusselsMidnight(now))
      setDailyKey((current) => (current === nextKey ? current : nextKey))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

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

  function choose(optionIndex: number) {
    if (selected !== null || completed) return
    setSelected(optionIndex)
    if (optionIndex === item.answer) {
      setScore((value) => value + 1)
    }
  }

  function next() {
    if (index >= items.length - 1) return
    setIndex((value) => value + 1)
    setSelected(null)
  }

  async function saveRewardOnce() {
    if (!user || savingReward || savedReward) return
    setSavingReward(true)
    setSaveMessage('')

    const { data: existing, error: existingError } = await supabase
      .from('quiz_results')
      .select('id')
      .eq('user_id', user.id)
      .eq('quiz_id', quizId)
      .limit(1)

    if (existingError) {
      setSaveMessage('Could not verify today’s reward yet. Please try again.')
      setSavingReward(false)
      return
    }

    if ((existing?.length ?? 0) > 0) {
      setSavedReward(true)
      setSaveMessage('Today’s reward was already credited for this account.')
      setSavingReward(false)
      return
    }

    const { error } = await saveQuizResult({
      quizId,
      score,
      total: items.length,
      xp: xpFor(score, items.length),
      activityDate: dailyKey,
    })
    if (error) {
      setSaveMessage('Reward save failed. Please retry.')
      setSavingReward(false)
      return
    }

    await refreshProfile()
    setSavedReward(true)
    setSaveMessage('Today’s reward has been saved to your account.')
    setSavingReward(false)
  }

  async function shareResult() {
    const blocks = Array.from({ length: items.length }, (_, i) => (i < score ? '🟩' : '⬛')).join('')
    const text = `FootballIQ Daily Challenge ${dailyKey}\nScore: ${score}/${items.length}\n${blocks}\nTimezone: Europe/Brussels`
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
    }
    const nextHistory = { ...history, [dailyKey]: entry }
    setHistory(nextHistory)
    saveDailyHistory(nextHistory)
    setCompleted(true)
  }

  function practiceAgain() {
    setIndex(0)
    setSelected(null)
    setScore(0)
    setCompleted(false)
    setSavedReward(false)
    setSaveMessage('Practice run active. Daily account reward remains once per day.')
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Daily Challenge</p>
          <h2 className="mt-1 text-2xl font-semibold">{displayDate}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Resets in {formatCountdown(secondsLeft)} (Europe/Brussels)</p>
        </div>
        <div className="rounded-xl bg-secondary px-4 py-2 text-sm">
          Score <strong className="ml-2 text-primary">{score}</strong>
        </div>
      </div>

      {completed ? (
        <div className="mt-7 space-y-4">
          <div className="rounded-2xl border border-border bg-secondary/40 p-5">
            <p className="font-semibold">Today completed: {score}/{items.length}</p>
            <p className="mt-2 text-sm text-muted-foreground">You can practice again, but account reward is limited to once per day.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {!user ? (
              <>
                <Link href="/login" className="rounded-xl bg-primary px-5 py-2.5 font-medium text-primary-foreground">Sign in to save reward</Link>
                <Link href="/signup" className="rounded-xl border border-border px-5 py-2.5 font-medium">Create account</Link>
              </>
            ) : (
              <button
                onClick={() => void saveRewardOnce()}
                disabled={savingReward || savedReward}
                className="rounded-xl bg-primary px-5 py-2.5 font-medium text-primary-foreground disabled:opacity-50"
              >
                {savingReward ? 'Saving reward...' : savedReward ? 'Reward saved' : 'Save today reward'}
              </button>
            )}
            <button onClick={() => void shareResult()} className="rounded-xl border border-border px-5 py-2.5 font-medium">
              {copied ? 'Copied!' : 'Share result'}
            </button>
            <button onClick={practiceAgain} className="rounded-xl border border-border px-5 py-2.5 font-medium">Practice again</button>
          </div>

          {saveMessage && <p className="text-sm text-muted-foreground">{saveMessage}</p>}

          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-[.15em] text-muted-foreground">Recent daily history</p>
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              {Object.values(history)
                .sort((a, b) => b.key.localeCompare(a.key))
                .slice(0, 5)
                .map((entry) => (
                  <p key={entry.key}>{entry.key}: {entry.score}/{entry.total}</p>
                ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-7 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Question {index + 1} of {items.length}</p>
            <p className="text-xs text-muted-foreground">Daily key: {dailyKey}</p>
          </div>
          <h3 className="mt-4 text-xl font-semibold leading-relaxed">{item.prompt}</h3>
          <div className="mt-5 grid gap-3">
            {item.options.map((option, optionIndex) => {
              const correct = selected !== null && optionIndex === item.answer
              const wrong = selected === optionIndex && optionIndex !== item.answer
              return (
                <button
                  key={option}
                  onClick={() => choose(optionIndex)}
                  disabled={selected !== null}
                  className={`rounded-2xl border p-4 text-left ${correct ? 'border-primary bg-primary/10' : wrong ? 'border-destructive bg-destructive/10' : 'border-border bg-background hover:border-primary/50'}`}
                >
                  {option}
                </button>
              )
            })}
          </div>
          {selected !== null && (
            <div className="mt-6 rounded-2xl bg-secondary/40 p-5">
              <p className="font-semibold">{selected === item.answer ? 'Correct.' : `Correct answer: ${item.options[item.answer]}`}</p>
              <p className="mt-2 text-sm text-muted-foreground">{item.explanation}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {!finished ? (
                  <button onClick={next} className="rounded-xl bg-primary px-5 py-2.5 font-medium text-primary-foreground">Next</button>
                ) : (
                  <button onClick={finishAndStore} className="rounded-xl bg-primary px-5 py-2.5 font-medium text-primary-foreground">Finish daily challenge</button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
