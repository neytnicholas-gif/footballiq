'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, Loader2, RotateCcw, Sparkles, Trophy, X } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { QuizDifficultyPicker, useQuizDifficulty } from '@/components/quiz-difficulty-picker'
import { tacticalScenarios } from '@/lib/tactical-scenarios'
import { buildQuizDifficultyIndex, filterQuizDifficulty, quizDifficultyCounts, quizXp } from '@/lib/quiz-difficulty'
import { buildCompletionKey, createCompletionRunId, saveQuizResult } from '@/lib/quiz-save'
import { createQuizSessionSeed, sampleBalancedQuizSession } from '@/lib/quiz-session'
import { cn } from '@/lib/utils'

const SESSION_SIZE = 10
const SESSION_STORAGE_KEY = 'early-shout:tactical-session-seed'
type RewardStatus = 'idle' | 'saving' | 'saved' | 'already' | 'error'
const difficultyIndex = buildQuizDifficultyIndex(tacticalScenarios, {
  id: (scenario) => scenario.id,
  authored: (scenario) => scenario.difficulty,
  text: (scenario) => `${scenario.prompt} ${scenario.context} ${scenario.options.join(' ')}`,
})
const difficultyCounts = quizDifficultyCounts(difficultyIndex)

export function TacticalLab() {
  const { user, refreshProfile } = useAuth()
  const { difficulty, setDifficulty, ready } = useQuizDifficulty('tactical-lab')
  const [sessionSeed, setSessionSeed] = useState<number | null>(null)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [runKey, setRunKey] = useState(() => createCompletionRunId())
  const [rewardStatus, setRewardStatus] = useState<RewardStatus>('idle')
  const [awardedXp, setAwardedXp] = useState(0)
  const scenarios = useMemo(
    () => sessionSeed === null ? [] : sampleBalancedQuizSession(
      filterQuizDifficulty(tacticalScenarios, difficulty, difficultyIndex, (item) => item.id),
      SESSION_SIZE,
      sessionSeed,
      (item) => /^tac-(communication|fatigue|opponent-adjustment|one-touch|away-game|wet-surface|young-team|transition-reset)-\d{3}$/.test(item.id),
    ),
    [difficulty, sessionSeed],
  )
  const scenario = scenarios[index]
  const complete = Boolean(scenario) && index === scenarios.length - 1 && selected !== null
  const xp = quizXp(20 + score * 10 + (score === scenarios.length ? 40 : 0), difficulty)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const stored = Number(window.sessionStorage.getItem(SESSION_STORAGE_KEY))
      const nextSeed = Number.isSafeInteger(stored) && stored > 0 ? stored : createQuizSessionSeed()
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, String(nextSeed))
      setSessionSeed(nextSeed)
    })
    return () => window.clearTimeout(timeout)
  }, [])

  function choose(option: number) {
    if (!scenario || selected !== null) return
    setSelected(option)
    setAnswers((current) => [...current, option])
    if (option === scenario.answer) setScore((value) => value + 1)
  }

  function next() {
    setIndex((value) => value + 1)
    setSelected(null)
  }

  function restart() {
    const nextSeed = createQuizSessionSeed()
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, String(nextSeed))
    setSessionSeed(nextSeed)
    setIndex(0)
    setSelected(null)
    setScore(0)
    setAnswers([])
    setRunKey(createCompletionRunId())
    setRewardStatus('idle')
    setAwardedXp(0)
  }

  function changeDifficulty(nextDifficulty: typeof difficulty) {
    setDifficulty(nextDifficulty)
    restart()
  }

  async function save() {
    if (!user || !complete || rewardStatus === 'saving' || rewardStatus === 'saved' || rewardStatus === 'already') return
    setRewardStatus('saving')
    const { error, alreadyCompleted, xpAwarded } = await saveQuizResult({
      quizId: 'tactical-lab-1',
      score,
      total: scenarios.length,
      xp,
      completionKey: buildCompletionKey('tactical-lab-1', runKey),
      proof: { kind: 'tactical-choice', scenarioIds: scenarios.map((item) => item.id), answers, difficulty },
    })
    if (error) {
      setRewardStatus('error')
      return
    }
    setAwardedXp(alreadyCompleted ? 0 : (xpAwarded ?? xp))
    setRewardStatus(alreadyCompleted ? 'already' : 'saved')
    if (!alreadyCompleted) await refreshProfile()
  }

  if (!ready || !scenario) {
    return <div className="flex min-h-64 items-center justify-center gap-3 rounded-3xl border border-white/10 bg-slate-900/75 text-sm text-slate-300"><Loader2 className="size-4 animate-spin text-cyan-300" />Building a fresh Tactical Lab round…</div>
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <QuizDifficultyPicker value={difficulty} onChange={changeDifficulty} counts={difficultyCounts} disabled={index > 0 || selected !== null} />
      <div className="rounded-3xl border border-white/10 bg-slate-900/75 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300">{scenario.category} · {scenario.difficulty}</p><h2 className="mt-2 text-2xl font-black text-white">{scenario.prompt}</h2></div>
          <p className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300" aria-label={`Scenario ${index + 1} of ${scenarios.length}`}>{index + 1}/{scenarios.length}</p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-cyan-300 transition-all" style={{ width: `${((index + (selected !== null ? 1 : 0)) / scenarios.length) * 100}%` }} /></div>
      </div>

      <article className="rounded-3xl border border-white/10 bg-slate-900/75 p-5 sm:p-7">
        <p className="text-base leading-relaxed text-slate-200">{scenario.context}</p>
        <div className="mt-6 grid gap-3">
          {scenario.options.map((option, optionIndex) => {
            const correct = selected !== null && optionIndex === scenario.answer
            const wrong = selected === optionIndex && optionIndex !== scenario.answer
            return <button key={option} type="button" onClick={() => choose(optionIndex)} disabled={selected !== null} className={cn('min-h-12 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-cyan-300', selected === null && 'border-slate-700 bg-slate-950/50 hover:border-cyan-300/60', correct && 'border-emerald-300 bg-emerald-300/10 text-emerald-100', wrong && 'border-rose-300 bg-rose-300/10 text-rose-100', selected !== null && !correct && !wrong && 'border-slate-800 text-slate-500')}>{option}</button>
          })}
        </div>

        {selected !== null && <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/55 p-5" aria-live="polite">
          <p className="flex items-center gap-2 font-bold text-white">{selected === scenario.answer ? <Check className="size-5 text-emerald-300" /> : <X className="size-5 text-rose-300" />}{selected === scenario.answer ? 'Good choice!' : 'There is a better choice.'}</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-300"><strong className="text-cyan-200">Why it works:</strong> {scenario.principle}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{scenario.explanation}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-400"><strong>Why the other answers are weaker:</strong> {scenario.alternatives}</p>
          {!complete ? <button type="button" onClick={next} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950">Next question <ArrowRight className="size-4" /></button> : null}
        </div>}

        {complete ? <section className="mt-6 overflow-hidden rounded-3xl border border-cyan-300/25 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.18),transparent_42%),linear-gradient(145deg,rgba(15,23,42,.98),rgba(7,17,31,.98))] p-5 sm:p-6" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">Round complete</p><h3 className="mt-2 text-3xl font-black text-white">Your tactical read: {score}/{scenarios.length}</h3><p className="mt-2 text-sm text-slate-300">{user ? 'You made ten match decisions. Save the result to add it to your Early Shout profile.' : 'This was a practice round. Your score stays on this screen, but it is not added to a profile.'}</p></div><span className="flex size-14 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-200"><Trophy className="size-7" /></span></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3"><ResultStat label="Accuracy" value={`${Math.round((score / scenarios.length) * 100)}%`} /><ResultStat label={user ? rewardStatus === 'saved' || rewardStatus === 'already' ? 'XP saved' : 'XP available' : 'Practice XP'} value={`+${rewardStatus === 'saved' || rewardStatus === 'already' ? awardedXp : xp}`} /><ResultStat label="Fresh scenarios" value={`${scenarios.length}`} /></div>
          <div className="mt-5 flex flex-wrap gap-3">
            {user ? <button type="button" onClick={() => void save()} disabled={rewardStatus === 'saving' || rewardStatus === 'saved' || rewardStatus === 'already'} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2.5 text-sm font-black text-slate-950 disabled:opacity-60">{rewardStatus === 'saving' ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{rewardStatus === 'saving' ? 'Saving result…' : rewardStatus === 'saved' ? 'XP saved' : rewardStatus === 'already' ? 'Already saved' : rewardStatus === 'error' ? 'Try saving again' : 'Save result and XP'}</button> : <p className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">Create an account before your next round to save XP, accuracy and leaderboard progress.</p>}
            <button type="button" onClick={restart} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-white"><RotateCcw className="size-4" /> Play 10 new scenarios</button>
          </div>
          {rewardStatus === 'error' ? <p className="mt-3 text-sm font-semibold text-rose-200">That result was not saved. Your score is still on this screen—try once more.</p> : null}
        </section> : null}
      </article>
    </div>
  )
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-slate-400">{label}</p><p className="mt-1 text-xl font-black text-white">{value}</p></div>
}
