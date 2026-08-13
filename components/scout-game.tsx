'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { QuizProgressBanner } from '@/components/quiz-progress-banner'
import { clearQuizProgress, loadQuizProgress, saveQuizProgress } from '@/lib/quiz-progress'
import { getRankProgress } from '@/lib/progression'
import { buildCompletionKey, createCompletionRunId, saveQuizResult } from '@/lib/quiz-save'
import { scoutQuestions, type ScoutDecision } from '@/lib/game-data'

const decisionOptions: ScoutDecision[] = ['Strongly follow', 'Follow', 'Monitor', 'Do not pursue']

export function ScoutGame() {
  const { user, profile, refreshProfile } = useAuth()
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<ScoutDecision | null>(null)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState<ScoutDecision[]>([])
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [alreadyCredited, setAlreadyCredited] = useState(false)
  const [runKey, setRunKey] = useState(() => createCompletionRunId())
  const [resumeState, setResumeState] = useState<{ index: number; selected: ScoutDecision | null; score: number; answers: ScoutDecision[] } | null>(null)
  const [checkingProgress, setCheckingProgress] = useState(Boolean(user))

  const dossier = scoutQuestions[index]
  const isLast = index === scoutQuestions.length - 1
  const percent = Math.round(((index + (selected ? 1 : 0)) / scoutQuestions.length) * 100)
  const maxScore = scoutQuestions.length * 2
  const accuracy = Math.round((score / maxScore) * 100)
  const xp = 30 + score * 6
  const creditedXp = saved && !alreadyCredited ? xp : 0
  const rank = getRankProgress((profile?.xp ?? 0) + creditedXp)

  const verdict = useMemo(() => {
    if (!selected) return null
    if (selected === dossier.strongestDecision) return { label: 'Best choice for these player notes', tone: 'good', points: 2 }
    if (dossier.defensibleAlternative && selected === dossier.defensibleAlternative) {
      return { label: 'Defensible alternative', tone: 'ok', points: 1 }
    }
    return { label: 'The player notes point to a better choice', tone: 'risk', points: 0 }
  }, [selected, dossier])

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
      const progress = await loadQuizProgress('would-you-scout-1')
      if (!active) return
      const savedState = progress?.progress as { index?: number; selected?: ScoutDecision | null; score?: number; answers?: ScoutDecision[] } | undefined
      const savedIndex = typeof savedState?.index === 'number' && Number.isInteger(savedState.index) ? savedState.index : null
      if (progress && progress.status === 'in_progress' && savedState && savedIndex !== null && savedIndex >= 0 && savedIndex < scoutQuestions.length) {
        setResumeState({
          index: savedIndex,
          selected: typeof savedState.selected === 'string' ? (savedState.selected as ScoutDecision) : null,
          score: typeof savedState.score === 'number' ? savedState.score : progress.score,
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
  }, [user])

  function choose(decision: ScoutDecision) {
    if (checkingProgress || resumeState || selected) return
    const nextScore = score + (decision === dossier.strongestDecision ? 2 : dossier.defensibleAlternative === decision ? 1 : 0)
    const nextAnswers = [...answers, decision]
    setSelected(decision)
    setScore(nextScore)
    setAnswers(nextAnswers)
    void saveQuizProgress({
      quizId: 'would-you-scout-1',
      currentIndex: index,
      score: nextScore,
      total: scoutQuestions.length * 2,
      progress: { index, selected: decision, score: nextScore, answers: nextAnswers },
    })
  }

  function nextDossier() {
    const nextIndex = index + 1
    setSelected(null)
    setIndex(nextIndex)
    void saveQuizProgress({
      quizId: 'would-you-scout-1',
      currentIndex: nextIndex,
      score,
      total: scoutQuestions.length * 2,
      progress: { index: nextIndex, selected: null, score, answers },
    })
  }

  async function saveResult() {
    if (!user || saved || saving) return
    setSaving(true)
    const { error, alreadyCompleted } = await saveQuizResult({ quizId: 'would-you-scout-1', score, total: maxScore, xp, completionKey: buildCompletionKey('would-you-scout-1', runKey), proof: { kind: 'scout-dossier', answers } })
    if (!error) {
      setSaved(true)
      setAlreadyCredited(alreadyCompleted)
      void clearQuizProgress('would-you-scout-1')
      if (!alreadyCompleted) await refreshProfile()
    }
    setSaving(false)
  }

  function restart() {
    setIndex(0)
    setSelected(null)
    setScore(0)
    setAnswers([])
    setSaved(false)
    setAlreadyCredited(false)
    setRunKey(createCompletionRunId())
    setResumeState(null)
    void clearQuizProgress('would-you-scout-1')
  }

  function continueProgress() {
    if (!resumeState) return
    setIndex(resumeState.index)
    setSelected(resumeState.selected)
    setScore(resumeState.score)
    setAnswers(resumeState.answers)
    setResumeState(null)
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="border-b border-border bg-[linear-gradient(135deg,rgba(50,230,170,.12),rgba(45,135,255,.1))] p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.24em] text-primary">Scout Vision dossier</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">{dossier.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">Dossier {index + 1} of {scoutQuestions.length} · Think like a scout.</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/70 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Judgement score</p>
            <p className="text-2xl font-bold text-primary">{score}</p>
          </div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-secondary/70">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[1.15fr_.85fr]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-border bg-background/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Evidence file</p>
            <p className="mt-3 text-sm text-muted-foreground">{dossier.summary}</p>
            <ul className="mt-4 space-y-2">
              {dossier.profile.map((line) => (
                <li key={line} className="rounded-xl border border-border bg-card px-3 py-2 text-sm">{line}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-background/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">What should the club do?</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {decisionOptions.map((option) => {
                const active = selected === option
                const isBest = selected && option === dossier.strongestDecision
                return (
                  <button
                    key={option}
                    onClick={() => choose(option)}
                    disabled={checkingProgress || Boolean(resumeState) || Boolean(selected)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${isBest ? 'border-primary bg-primary/10 text-primary' : active ? 'border-border bg-secondary' : 'border-border bg-card hover:border-primary/45'}`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-[linear-gradient(180deg,rgba(54,206,163,.09),rgba(8,14,24,.92))] p-5">
          {checkingProgress ? <div className="rounded-xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">Checking saved progress…</div> : resumeState && !saved ? <div className="mb-4"><QuizProgressBanner title="Resume your quiz?" copy={`You left off at dossier ${resumeState.index + 1} of ${scoutQuestions.length}.`} onContinue={continueProgress} onStartAgain={restart} /></div> : null}
          {!selected ? (
            <div className="h-full rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Choose what the club should do. Then we show what was good, what was risky and what the scout still needs to learn.
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <p className={`rounded-xl border px-3 py-2 font-semibold ${verdict?.tone === 'good' ? 'border-primary/45 bg-primary/10 text-primary' : verdict?.tone === 'ok' ? 'border-sky-300 bg-sky-100 text-sky-800' : 'border-orange-300 bg-orange-100 text-orange-800'}`}>
                {verdict?.label}
              </p>
              {!isLast ? (
                <button onClick={nextDossier} className="w-full rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground">
                  Next dossier
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-background/70 p-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <MiniStat label="Score" value={`${score}/${maxScore}`} />
                      <MiniStat label="Accuracy" value={`${accuracy}%`} />
                      <MiniStat label="XP credited" value={user ? `+${creditedXp}` : `+${xp}`} />
                    </div>
                    {user ? (
                      <div className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-sm">
                        <p className="font-semibold">{rank.current.emoji} {rank.current.title}</p>
                        <p className="mt-1 text-muted-foreground">{rank.next ? `${rank.remaining} XP to ${rank.next.title}` : 'Maximum rank reached'}</p>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-muted-foreground">Create an account to save this progress, earn XP and build your Back Your Eye profile.</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => void saveResult()} disabled={!user || saved || saving} className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground disabled:opacity-50">
                      {!user ? 'Sign in to save progress' : saving ? 'Saving...' : saved ? 'Saved' : 'Finish and save Scout XP'}
                    </button>
                    <button onClick={restart} className="rounded-xl border border-border px-5 py-2.5 font-semibold">Run dossiers again</button>
                  </div>
                  {user ? <p className="text-xs text-muted-foreground">{saving ? 'Saving your result…' : saved && !alreadyCredited ? 'XP, rating and streak updates saved to your profile.' : saved && alreadyCredited ? 'This Scout Vision reward was already credited for your account.' : ''}</p> : null}
                </div>
              )}

              <div className="space-y-3">
                <ReportItem label="Observation" text={dossier.observation} />
                <ReportItem label="What it means" text={dossier.interpretation} />
                <ReportItem label="Strengths" text={dossier.strengths} />
                <ReportItem label="Concerns" text={dossier.concerns} />
                <ReportItem label="Missing information" text={dossier.missingInformation} />
                <ReportItem label="Alternative view" text={dossier.alternativeView} />
                <ReportItem label="Recommended action" text={dossier.recommendedAction} />
                <ReportItem label="Next scouting step" text={dossier.nextScoutingStep} />
                <ReportItem label="Confidence" text={`${dossier.confidence} — ${dossier.confidenceReason}`} />
                <ReportItem label="Why weaker alternatives are weaker" text={dossier.weakerAlternatives} />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  )
}

function ReportItem({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/75 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-primary">{label}</p>
      <p className="mt-1 text-muted-foreground">{text}</p>
    </div>
  )
}
