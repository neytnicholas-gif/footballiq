'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Clock3, Copy, Flame, RotateCcw, Sparkles, Trophy, X, Zap } from 'lucide-react'
import type { DuelPack, DuelQuestion } from '@/lib/duel-packs'
import { useAuth } from '@/components/auth-provider'
import { supabase } from '@/lib/supabase'
import { calculateDuelXp, getRankProgress } from '@/lib/progression'

type Choice = 'left' | 'right' | 'same'
type Speed = 'relaxed' | 'timed'

type StoredBest = { score: number; points: number; bestCombo: number }

function shuffledQuestions(questions: DuelQuestion[]) {
  return [...questions]
    .sort(() => Math.random() - 0.5)
    .map((question) => Math.random() > 0.5 ? question : { left: question.right, right: question.left })
}

function correctChoice(question: DuelQuestion): Choice {
  if (question.left.value === question.right.value) return 'same'
  return question.left.value > question.right.value ? 'left' : 'right'
}

function gradeFor(score: number, total: number) {
  const percentage = Math.round(score / total * 100)
  if (percentage === 100) return { title: 'Football Encyclopedia', copy: 'Perfect. You did not miss once.', emoji: '🧠' }
  if (percentage >= 80) return { title: 'Elite Football Brain', copy: 'Very strong. One more run could be perfect.', emoji: '🔥' }
  if (percentage >= 60) return { title: 'Proper Ball Knowledge', copy: 'Solid score. You know your football.', emoji: '⚽' }
  if (percentage >= 40) return { title: 'Promising Prospect', copy: 'A few traps caught you. Run it back.', emoji: '📈' }
  return { title: 'Back to the Analysis Room', copy: 'This pack got you. The rematch is waiting.', emoji: '🎥' }
}

export function DuelQuiz({ pack, onComplete }: { pack: DuelPack; onComplete?: (packId: string, score: number) => void }) {
  const { user, profile, refreshProfile } = useAuth()
  const [questions, setQuestions] = useState(() => shuffledQuestions(pack.questions))
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<Choice | 'timeout' | null>(null)
  const [score, setScore] = useState(0)
  const [points, setPoints] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [speed, setSpeed] = useState<Speed>('timed')
  const [timeLeft, setTimeLeft] = useState(15)
  const [showResults, setShowResults] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [rewardFlash, setRewardFlash] = useState<number | null>(null)
  const [personalBest, setPersonalBest] = useState<StoredBest | null>(null)

  const question = questions[index]
  const answer = correctChoice(question)
  const currentStatLabel = question.statLabel ?? pack.statLabel
  const answered = selected !== null
  const isCorrect = selected === answer
  const isLast = index === questions.length - 1
  const progress = Math.round(((index + (answered ? 1 : 0)) / questions.length) * 100)

  useEffect(() => {
    try {
      const savedBest = localStorage.getItem(`footballiq-best-${pack.id}`)
      setPersonalBest(savedBest ? JSON.parse(savedBest) as StoredBest : null)
    } catch { setPersonalBest(null) }
  }, [pack.id])

  const lockAnswer = useCallback((choice: Choice | 'timeout') => {
    if (answered) return
    setSelected(choice)
    const correct = choice === answer
    if (correct) {
      const nextCombo = combo + 1
      const speedBonus = speed === 'timed' ? timeLeft * 5 : 0
      const comboBonus = Math.min(200, combo * 25)
      setScore((value) => value + 1)
      const questionPoints = 100 + speedBonus + comboBonus
      setPoints((value) => value + questionPoints)
      setRewardFlash(12 + Math.min(combo, 4) * 2 + (speed === 'timed' && timeLeft >= 10 ? 4 : 0))
      window.setTimeout(() => setRewardFlash(null), 900)
      setCombo(nextCombo)
      setBestCombo((value) => Math.max(value, nextCombo))
    } else {
      setCombo(0)
    }
  }, [answer, answered, combo, speed, timeLeft])

  useEffect(() => {
    if (speed !== 'timed' || answered || showResults) return
    if (timeLeft <= 0) {
      lockAnswer('timeout')
      return
    }
    const timer = window.setTimeout(() => setTimeLeft((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [answered, lockAnswer, showResults, speed, timeLeft])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (showResults || answered) return
      if (event.key === '1') lockAnswer('left')
      if (event.key === '2') lockAnswer('same')
      if (event.key === '3') lockAnswer('right')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [answered, lockAnswer, showResults])

  async function saveResult() {
    if (!user || !profile || saved || saving) return
    setSaving(true)
    const perfect = score === questions.length
    const xpEarned = calculateDuelXp(score, questions.length, bestCombo, points)
    const today = new Date().toISOString().slice(0, 10)
    const { error } = await supabase.rpc('complete_quiz', {
      p_quiz_id: pack.id,
      p_score: score,
      p_total: questions.length,
      p_xp: xpEarned,
      p_activity_date: today,
    })
    if (!error) {
      setSaved(true)
      await refreshProfile()
    }
    setSaving(false)
  }

  function finish() {
    setShowResults(true)
    const best: StoredBest = {
      score: Math.max(score, personalBest?.score ?? 0),
      points: Math.max(points, personalBest?.points ?? 0),
      bestCombo: Math.max(bestCombo, personalBest?.bestCombo ?? 0),
    }
    setPersonalBest(best)
    try { localStorage.setItem(`footballiq-best-${pack.id}`, JSON.stringify(best)) } catch {}
    onComplete?.(pack.id, score)
    void saveResult()
  }

  function next() {
    if (isLast) {
      finish()
      return
    }
    setIndex((value) => value + 1)
    setSelected(null)
    setTimeLeft(15)
  }

  useEffect(() => {
    if (!answered || showResults) return
    const timer = window.setTimeout(() => {
      if (isLast) finish()
      else next()
    }, isLast ? 1450 : 1050)
    return () => window.clearTimeout(timer)
  // The game intentionally advances automatically after feedback.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered, isLast, showResults])

  function restart() {
    setQuestions(shuffledQuestions(pack.questions))
    setIndex(0)
    setSelected(null)
    setScore(0)
    setPoints(0)
    setCombo(0)
    setBestCombo(0)
    setTimeLeft(15)
    setShowResults(false)
    setSaved(false)
    setCopied(false)
  }

  async function shareResult() {
    const blocks = questions.map((_, questionIndex) => questionIndex < score ? '🟩' : '⬛').join('')
    const text = `FootballIQ — ${pack.title}\n${score}/${questions.length} • ${points} pts • ${bestCombo} best combo\n${blocks}\nfootballiq-tau.vercel.app/quizzes/football-duels`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {}
  }

  const outcomeCopy = useMemo(() => {
    if (selected === 'timeout') return 'Time ran out.'
    if (isCorrect) return combo >= 2 ? `${combo} in a row — keep it going.` : 'Correct call.'
    if (answer === 'same') return 'They finished level.'
    const winner = answer === 'left' ? question.left.name : question.right.name
    return `${winner} had the higher total.`
  }, [answer, combo, isCorrect, question.left.name, question.right.name, selected])

  if (showResults) {
    const grade = gradeFor(score, questions.length)
    const xpEarned = calculateDuelXp(score, questions.length, bestCombo, points)
    const rankProgress = getRankProgress((profile?.xp ?? 0) + xpEarned)
    const isNewBest = score >= (personalBest?.score ?? 0)
    return (
      <div className="overflow-hidden rounded-[2rem] border border-border bg-card">
        <div className="relative border-b border-border bg-[radial-gradient(circle_at_top,var(--primary),transparent_58%)] p-8 text-center sm:p-12">
          <div className="mx-auto flex size-20 items-center justify-center rounded-3xl border border-primary/30 bg-background/70 text-4xl shadow-2xl">{grade.emoji}</div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[.28em] text-primary">Pack complete</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{grade.title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{grade.copy}</p>
          <div className="mt-7 flex items-end justify-center gap-2"><span className="text-7xl font-bold text-primary">{score}</span><span className="pb-2 text-2xl text-muted-foreground">/{questions.length}</span></div>
        </div>
        <div className="p-6 sm:p-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ResultStat icon={<Sparkles className="size-5" />} label="Points" value={points.toLocaleString()} />
            <ResultStat icon={<Flame className="size-5" />} label="Best combo" value={`${bestCombo}x`} />
            <ResultStat icon={<Trophy className="size-5" />} label="Personal best" value={`${personalBest?.score ?? score}/${questions.length}`} />
            <ResultStat icon={<Zap className="size-5" />} label="XP earned" value={`+${xpEarned}`} />
          </div>
          {isNewBest && <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/10 px-5 py-4 text-sm text-primary">New personal best recorded on this device.</div>}
          {user && <div className="mt-4 rounded-2xl border border-border bg-background p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New rank progress</p><p className="mt-1 text-lg font-bold">{rankProgress.current.emoji} {rankProgress.current.title}</p></div><p className="text-sm text-primary">{rankProgress.next ? `${rankProgress.remaining} XP to ${rankProgress.next.title}` : 'Maximum rank reached'}</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-all" style={{width:`${rankProgress.percent}%`}} /></div></div>}
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={restart} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground"><RotateCcw className="size-4" /> Play again</button>
            <button onClick={() => void shareResult()} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-5 py-3 font-semibold"><Copy className="size-4" /> {copied ? 'Copied!' : 'Share score'}</button>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">{!user ? 'Sign in to save XP, streaks and leaderboard progress.' : saving ? 'Saving your result…' : saved ? 'XP and progress saved.' : 'This pack may already have rewarded XP today.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-2xl shadow-black/10">
      <div className="border-b border-border p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><span>{pack.emoji}</span><span>{pack.title}</span><span>•</span><span>Question {index + 1}/{questions.length}</span></div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-2xl font-bold">Who has more?</p>
              {combo >= 2 && <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-3 py-1 text-xs font-semibold text-orange-300"><Flame className="size-3.5" /> {combo}x combo</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSpeed(speed === 'timed' ? 'relaxed' : 'timed')} disabled={index > 0 || answered} className="rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground disabled:opacity-50">{speed === 'timed' ? '⏱ Timed' : '☕ Relaxed'}</button>
            <div className="rounded-xl bg-secondary px-4 py-2 text-sm"><span className="text-muted-foreground">Score</span> <strong className="ml-2 text-primary">{score}</strong></div>
          </div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} /></div>
        {speed === 'timed' && !answered && <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="size-3.5" /><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"><div className={`h-full transition-all duration-1000 ${timeLeft <= 5 ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${timeLeft / 15 * 100}%` }} /></div><span className={timeLeft <= 5 ? 'text-destructive' : ''}>{timeLeft}s</span></div>}
      </div>

      <div className="p-5 sm:p-7">
        <div className="grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
          <PlayerChoice side="left" option={question.left} selected={selected} answer={answer} answered={answered} statLabel={currentStatLabel} onChoose={lockAnswer} />
          <button onClick={() => lockAnswer('same')} disabled={answered} className={`self-center rounded-2xl border px-5 py-3 text-sm font-bold transition md:px-4 ${answered && answer === 'same' ? 'border-primary bg-primary text-primary-foreground' : answered && selected === 'same' ? 'border-destructive bg-destructive/10 text-destructive' : 'border-border bg-secondary hover:border-primary hover:text-primary'}`}><span className="md:hidden">Same total</span><span className="hidden md:block">SAME</span><span className="ml-2 text-[10px] opacity-60">2</span></button>
          <PlayerChoice side="right" option={question.right} selected={selected} answer={answer} answered={answered} statLabel={currentStatLabel} onChoose={lockAnswer} />
        </div>

        {!answered && <p className="mt-5 text-center text-xs text-muted-foreground">Click a player, choose Same, or use keyboard keys 1 • 2 • 3</p>}
        {rewardFlash !== null && <div className="pointer-events-none fixed left-1/2 top-28 z-50 -translate-x-1/2 animate-bounce rounded-full border border-primary/30 bg-background/95 px-5 py-2 font-bold text-primary shadow-2xl">⚡ +{rewardFlash} XP</div>}
        {answered && (
          <div className={`mt-6 rounded-2xl border p-5 ${isCorrect ? 'border-primary/35 bg-primary/10' : 'border-destructive/35 bg-destructive/10'}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 flex size-8 items-center justify-center rounded-full ${isCorrect ? 'bg-primary text-primary-foreground' : 'bg-destructive text-white'}`}>{isCorrect ? <Check className="size-5" /> : <X className="size-5" />}</span>
                <div><p className="font-bold">{outcomeCopy}</p><p className="mt-1 text-sm text-muted-foreground">{question.left.name}: {question.left.value} • {question.right.name}: {question.right.value} {currentStatLabel}</p></div>
              </div>
              <div className="w-full rounded-xl border border-primary/25 bg-background/70 px-5 py-3 text-center text-sm font-semibold text-primary sm:w-auto">{isLast ? 'Calculating results…' : 'Next duel loading…'}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PlayerChoice({ side, option, selected, answer, answered, statLabel, onChoose }: {
  side: 'left' | 'right'
  option: DuelQuestion['left']
  selected: Choice | 'timeout' | null
  answer: Choice
  answered: boolean
  statLabel: string
  onChoose: (choice: Choice) => void
}) {
  const correct = answered && answer === side
  const wrong = answered && selected === side && answer !== side
  return (
    <button disabled={answered} onClick={() => onChoose(side)} className={`group relative min-h-64 overflow-hidden rounded-3xl border p-6 text-left transition duration-300 sm:p-8 ${correct ? 'border-primary bg-primary/10 ring-1 ring-primary/40' : wrong ? 'border-destructive bg-destructive/10' : 'border-border bg-background hover:-translate-y-1 hover:border-primary/60 hover:shadow-xl hover:shadow-primary/5'}`}>
      <span className="absolute right-5 top-5 rounded-lg border border-border bg-card/80 px-2 py-1 text-[10px] text-muted-foreground">{side === 'left' ? '1' : '3'}</span>
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Pick this player</p>
      <h3 className="mt-5 max-w-sm text-3xl font-bold tracking-tight sm:text-4xl">{option.name}</h3>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{option.detail}</p>
      {answered ? <div className="mt-10"><span className="text-5xl font-bold text-primary">{option.value}</span><span className="ml-2 text-sm text-muted-foreground">{statLabel}</span></div> : <div className="mt-10 text-sm font-medium text-muted-foreground transition group-hover:text-primary">Lock in answer →</div>}
    </button>
  )
}

function ResultStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-border bg-background p-5"><div className="flex items-center gap-2 text-primary">{icon}<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span></div><p className="mt-3 text-2xl font-bold">{value}</p></div>
}
