'use client'

import { useMemo, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { saveQuizResult } from '@/lib/quiz-save'
import { scoutQuestions, type ScoutDecision } from '@/lib/game-data'

const decisionOptions: ScoutDecision[] = ['Strongly follow', 'Follow', 'Monitor', 'Do not pursue']

export function ScoutGame() {
  const { user, refreshProfile } = useAuth()
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<ScoutDecision | null>(null)
  const [score, setScore] = useState(0)
  const [saved, setSaved] = useState(false)

  const dossier = scoutQuestions[index]
  const isLast = index === scoutQuestions.length - 1
  const percent = Math.round(((index + (selected ? 1 : 0)) / scoutQuestions.length) * 100)

  const verdict = useMemo(() => {
    if (!selected) return null
    if (selected === dossier.strongestDecision) return { label: 'Best-supported recommendation', tone: 'good', points: 2 }
    if (dossier.defensibleAlternative && selected === dossier.defensibleAlternative) {
      return { label: 'Defensible alternative', tone: 'ok', points: 1 }
    }
    return { label: 'Weaker recommendation for this evidence set', tone: 'risk', points: 0 }
  }, [selected, dossier])

  function choose(decision: ScoutDecision) {
    if (selected) return
    setSelected(decision)
    setScore((value) => value + (decision === dossier.strongestDecision ? 2 : dossier.defensibleAlternative === decision ? 1 : 0))
  }

  function nextDossier() {
    setSelected(null)
    setIndex((value) => value + 1)
  }

  async function saveResult() {
    if (!user || saved) return
    const xp = 30 + score * 6
    const { error } = await saveQuizResult({ quizId: 'would-you-scout-1', score, total: scoutQuestions.length * 2, xp })
    if (!error) {
      setSaved(true)
      await refreshProfile()
    }
  }

  function restart() {
    setIndex(0)
    setSelected(null)
    setScore(0)
    setSaved(false)
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
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Your recommendation</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {decisionOptions.map((option) => {
                const active = selected === option
                const isBest = selected && option === dossier.strongestDecision
                return (
                  <button
                    key={option}
                    onClick={() => choose(option)}
                    disabled={Boolean(selected)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${isBest ? 'border-primary bg-primary/10 text-primary' : active ? 'border-border bg-secondary' : 'border-border bg-card hover:border-primary/45'}`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-[linear-gradient(180deg,rgba(50,230,170,.08),rgba(10,18,21,.65))] p-5">
          {!selected ? (
            <div className="h-full rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Select a scouting recommendation to reveal the structured report: observation, interpretation, strengths, concerns, missing information, and next step.
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <p className={`rounded-xl border px-3 py-2 font-semibold ${verdict?.tone === 'good' ? 'border-primary/45 bg-primary/10 text-primary' : verdict?.tone === 'ok' ? 'border-sky-400/35 bg-sky-500/10 text-sky-200' : 'border-orange-400/35 bg-orange-500/10 text-orange-200'}`}>
                {verdict?.label}
              </p>
              <ReportItem label="Observation" text={dossier.observation} />
              <ReportItem label="Interpretation" text={dossier.interpretation} />
              <ReportItem label="Strengths" text={dossier.strengths} />
              <ReportItem label="Concerns" text={dossier.concerns} />
              <ReportItem label="Missing information" text={dossier.missingInformation} />
              <ReportItem label="Alternative view" text={dossier.alternativeView} />
              <ReportItem label="Recommended action" text={dossier.recommendedAction} />
              <ReportItem label="Next scouting step" text={dossier.nextScoutingStep} />
              <ReportItem label="Confidence" text={`${dossier.confidence} — ${dossier.confidenceReason}`} />
              <ReportItem label="Why weaker alternatives are weaker" text={dossier.weakerAlternatives} />
            </div>
          )}
        </section>
      </div>

      {selected && (
        <div className="border-t border-border bg-background/70 p-5 sm:p-6">
          {!isLast ? (
            <button onClick={nextDossier} className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground">Next dossier</button>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button onClick={() => void saveResult()} disabled={!user || saved} className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground disabled:opacity-50">
                {!user ? 'Sign in to save Scout XP' : saved ? 'Saved' : 'Finish and save Scout XP'}
              </button>
              <button onClick={restart} className="rounded-xl border border-border px-5 py-2.5 font-semibold">Run dossiers again</button>
            </div>
          )}
        </div>
      )}
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
