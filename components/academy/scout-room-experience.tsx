'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Target } from 'lucide-react'
import { saveAcademyCompletion } from '@/lib/academy'

const dossier = {
  name: 'Milan Kovares',
  position: 'Left-sided Centre-Back',
  age: 18,
  teamLevel: 'Upper second division reserve environment',
  style: 'Front-foot defender with progressive left-foot passing',
  stats: [
    '88.4% pass completion, 9.2 progressive passes per 90',
    '64% aerial duels won, 1.9 interceptions per 90',
    '0.42 fouls in defensive third per 90',
    'Played 2,410 minutes this season',
  ],
  strengths: [
    'Breaks midfield lines with disguised passes',
    'Stays composed when pressed by two forwards',
    'Directs back-line spacing with clear communication cues',
  ],
  concerns: [
    'Recovery sprint mechanics can open hip angle too early',
    'Jumps into midfield duels before weak-side cover is set',
    'Limited evidence against elite transition pace',
  ],
  context: [
    'Team uses high line and aggressive full-back push',
    'Most appearances came with stable double pivot in front',
    'No senior top-flight sample yet',
  ],
}

type Confidence = 'Low' | 'Medium' | 'High'

export function ScoutRoomExperience() {
  const [strengths, setStrengths] = useState<string[]>([])
  const [concerns, setConcerns] = useState<string[]>([])
  const [potential, setPotential] = useState('')
  const [recommendation, setRecommendation] = useState('')
  const [confidence, setConfidence] = useState<Confidence | ''>('')
  const [report, setReport] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  const completionReady = strengths.length > 0 && concerns.length > 0 && potential && recommendation && confidence && report.trim().length > 30

  const learning = useMemo(() => {
    const profile = {
      judgedCoverage: 0,
      missed: [] as string[],
    }

    if (strengths.includes('progressive-passing')) profile.judgedCoverage += 1
    else profile.missed.push('Progressive passing impact')

    if (strengths.includes('composure-under-press')) profile.judgedCoverage += 1
    else profile.missed.push('Press resistance consistency')

    if (concerns.includes('transition-recovery')) profile.judgedCoverage += 1
    else profile.missed.push('Transition recovery risk')

    if (concerns.includes('step-timing')) profile.judgedCoverage += 1
    else profile.missed.push('Stepping trigger discipline')

    return profile
  }, [strengths, concerns])

  async function submit() {
    if (!completionReady || submitted) return
    setSaving(true)
    await saveAcademyCompletion({
      experienceKey: 'scout-room-player-evaluation',
      track: 'scout',
      confidenceLabel: confidence,
    })
    setSubmitted(true)
    setSaving(false)
  }

  return (
    <div className="space-y-6 rounded-[1.6rem] border border-border bg-card p-5 sm:p-7">
      <header className="rounded-2xl border border-border bg-[linear-gradient(140deg,rgba(34,197,94,.18),rgba(10,17,24,.95))] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Advanced Scout Room</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight">Scout Room: Player Evaluation</h2>
        <p className="mt-2 text-sm text-muted-foreground">Review dossier evidence, write your judgement, then compare with an expert-style report structure.</p>
      </header>

      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <article className="rounded-2xl border border-border bg-background/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Player dossier</p>
            <h3 className="mt-2 text-2xl font-bold">{dossier.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{dossier.position} · {dossier.age} · {dossier.teamLevel}</p>
            <p className="mt-3 text-sm">{dossier.style}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <DataBlock title="Relevant statistics" lines={dossier.stats} />
              <DataBlock title="Contextual factors" lines={dossier.context} />
              <DataBlock title="Strength indicators" lines={dossier.strengths} />
              <DataBlock title="Concern indicators" lines={dossier.concerns} />
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-background/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Observation cards</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Observation label="Possession" text="Consistently scans before receiving from goalkeeper and left pivot." />
              <Observation label="Defensive shape" text="Holds line well until diagonal run threatens far-post channel." />
              <Observation label="Transition" text="Three clips show delayed turn when attacker attacks space behind." />
              <Observation label="Communication" text="Visible hand and voice cues when full-back vacates lane." />
            </div>
          </article>
        </div>

        <div className="space-y-4">
          <article className="rounded-2xl border border-border bg-background/70 p-4">
            <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><Target className="size-3.5" /> Your judgement</p>
            <FieldLegend title="Key strengths">
              <TogglePill label="Progressive passing" active={strengths.includes('progressive-passing')} onClick={() => setStrengths(toggleValue(strengths, 'progressive-passing'))} />
              <TogglePill label="Composure under press" active={strengths.includes('composure-under-press')} onClick={() => setStrengths(toggleValue(strengths, 'composure-under-press'))} />
              <TogglePill label="Aerial dominance" active={strengths.includes('aerial-duels')} onClick={() => setStrengths(toggleValue(strengths, 'aerial-duels'))} />
            </FieldLegend>

            <FieldLegend title="Main concerns">
              <TogglePill label="Transition recovery" active={concerns.includes('transition-recovery')} onClick={() => setConcerns(toggleValue(concerns, 'transition-recovery'))} />
              <TogglePill label="Step timing" active={concerns.includes('step-timing')} onClick={() => setConcerns(toggleValue(concerns, 'step-timing'))} />
              <TogglePill label="Limited top-tier sample" active={concerns.includes('sample-size')} onClick={() => setConcerns(toggleValue(concerns, 'sample-size'))} />
            </FieldLegend>

            <label className="mt-3 block text-sm font-semibold">
              Potential level
              <select value={potential} onChange={(event) => setPotential(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-input bg-card px-3">
                <option value="">Select projection</option>
                <option value="rotation-top-flight">Top-flight rotation potential</option>
                <option value="starter-top-flight">Top-flight starter potential</option>
                <option value="elite-league">Elite league starter potential</option>
              </select>
            </label>

            <label className="mt-3 block text-sm font-semibold">
              Recommendation
              <select value={recommendation} onChange={(event) => setRecommendation(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-input bg-card px-3">
                <option value="">Select recommendation</option>
                <option value="recommend-now">Recommend now</option>
                <option value="recommend-follow-up">Recommend with follow-up live check</option>
                <option value="monitor-only">Monitor only</option>
              </select>
            </label>

            <label className="mt-3 block text-sm font-semibold">
              Confidence level
              <select value={confidence} onChange={(event) => setConfidence(event.target.value as Confidence | '')} className="mt-1.5 h-11 w-full rounded-xl border border-input bg-card px-3">
                <option value="">Select confidence</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </label>

            <label className="mt-3 block text-sm font-semibold">
              Structured report (concise)
              <textarea value={report} onChange={(event) => setReport(event.target.value)} rows={5} placeholder="Summarize observation, interpretation, risk and recommendation." className="mt-1.5 w-full rounded-xl border border-input bg-card px-3 py-2" />
            </label>

            <button onClick={() => void submit()} disabled={!completionReady || submitted || saving} className="mt-4 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {submitted ? 'Submitted' : saving ? 'Submitting…' : 'Submit scouting report'}
            </button>
          </article>

          {submitted ? (
            <article className="rounded-2xl border border-emerald-300/45 bg-emerald-300/12 p-4">
              <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200"><CheckCircle2 className="size-3.5" /> Expert debrief</p>
              <DebriefRow label="Observation" text="Kovares shows repeatable left-foot progression and communication habits in a high-line structure." />
              <DebriefRow label="Interpretation" text="Technical and perceptual profile suggests starter upside if transition defending stabilizes." />
              <DebriefRow label="Alternative explanation" text="Current clean possession actions may be partly protected by stable pivot support." />
              <DebriefRow label="Missing information" text="Need direct evidence against elite transition pace and aerially dominant forwards." />
              <DebriefRow label="Recommendation" text="Recommend with targeted follow-up scouting in higher tempo fixtures." />
              <DebriefRow label="Confidence" text="Medium-high confidence due repeatability in core passing and communication actions." />

              <div className="mt-3 rounded-xl border border-emerald-300/40 bg-background/70 p-3 text-sm text-emerald-100">
                <p className="font-semibold">Completion</p>
                <p className="mt-1">You earned 120 Academy XP equivalent and logged one advanced scouting completion.</p>
                <p className="mt-1">Key learning: Separate production from context before final recommendation.</p>
                <p className="mt-1">You covered {learning.judgedCoverage}/4 core judgement areas.</p>
                {learning.missed.length > 0 ? <p className="mt-1">You may have missed: {learning.missed.join(', ')}.</p> : null}
              </div>
            </article>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function DataBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {lines.map((line) => <li key={line}>• {line}</li>)}
      </ul>
    </div>
  )
}

function Observation({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{text}</p>
    </div>
  )
}

function FieldLegend({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-1.5 flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function TogglePill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground hover:border-primary/45'}`}>
      {label}
    </button>
  )
}

function DebriefRow({ label, text }: { label: string; text: string }) {
  return (
    <div className="mt-2 rounded-xl border border-emerald-300/35 bg-background/70 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">{label}</p>
      <p className="mt-1 text-sm text-emerald-100">{text}</p>
    </div>
  )
}

function toggleValue(values: string[], key: string) {
  if (values.includes(key)) return values.filter((value) => value !== key)
  return [...values, key]
}
