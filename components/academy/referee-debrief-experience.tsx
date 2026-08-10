'use client'

import { useState } from 'react'
import { CheckCircle2, Flag, ShieldAlert } from 'lucide-react'
import { saveAcademyCompletion } from '@/lib/academy'

const options = {
  foul: ['Foul', 'No foul'],
  restart: ['Penalty kick', 'Dropped ball', 'Indirect free kick out'],
  sanction: ['No card', 'Yellow card', 'Red card'],
  var: ['Reviewable incident', 'Not reviewable'],
  confidence: ['Low', 'Medium', 'High'],
}

export function RefereeDebriefExperience() {
  const [foul, setFoul] = useState('')
  const [restart, setRestart] = useState('')
  const [sanction, setSanction] = useState('')
  const [varReview, setVarReview] = useState('')
  const [confidence, setConfidence] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  const complete = Boolean(foul && restart && sanction && varReview && confidence)

  async function submit() {
    if (!complete || submitted) return
    setSaving(true)
    await saveAcademyCompletion({
      experienceKey: 'referee-debrief-penalty-area',
      track: 'referee',
      confidenceLabel: confidence,
    })
    setSubmitted(true)
    setSaving(false)
  }

  const confidenceCalibration = submitted
    ? confidence === 'High'
      ? 'Your confidence was high. In this scenario that is appropriate if you recognized point-of-contact and challenge intensity early.'
      : confidence === 'Medium'
        ? 'Your confidence was measured. Good approach in penalty-area incidents where detail can mislead.'
        : 'Low confidence is understandable. Focus on first-contact and leg path cues to build certainty.'
    : ''

  return (
    <div className="space-y-5 rounded-[1.6rem] border border-border bg-card p-5 sm:p-7">
      <header className="rounded-2xl border border-border bg-[linear-gradient(140deg,rgba(250,204,21,.2),rgba(12,16,24,.96))] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Advanced Referee Debrief</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight">Referee Debrief: Penalty-Area Decision</h2>
        <p className="mt-2 text-sm text-muted-foreground">Read the penalty-box moment, make every call, then check each answer and rule.</p>
      </header>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="space-y-4 rounded-2xl border border-border bg-background/70 p-4">
          <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><Flag className="size-3.5" /> Incident presentation</p>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm leading-relaxed">88th minute. Inside the penalty area, the attacker pushes the ball past the defender toward the byline. The defender plants, then extends the left leg across the attacker path. Contact occurs on the attacker shin before any touch on ball. The attacker falls and loses immediate control.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ScenarioCard title="Referee angle" copy="Trailing 10-12m with slight inside position. Contact line visible but speed is high." />
            <ScenarioCard title="Assistant angle" copy="Aligned with second-last defender. Sees leg extension and attacker path interruption." />
            <ScenarioCard title="VAR angle" copy="Broadcast-style reverse angle confirms contact point before any ball contact." />
            <ScenarioCard title="Match context" copy="Tension high, defending team already has 4 cautions." />
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-background/70 p-4">
          <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><ShieldAlert className="size-3.5" /> Your decision</p>
          <DecisionField label="Foul or no foul" value={foul} setValue={setFoul} options={options.foul} />
          <DecisionField label="Restart" value={restart} setValue={setRestart} options={options.restart} />
          <DecisionField label="Disciplinary sanction" value={sanction} setValue={setSanction} options={options.sanction} />
          <DecisionField label="VAR reviewability" value={varReview} setValue={setVarReview} options={options.var} />
          <DecisionField label="Confidence" value={confidence} setValue={setConfidence} options={options.confidence} />

          <button onClick={() => void submit()} disabled={!complete || submitted || saving} className="mt-4 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {submitted ? 'Submitted' : saving ? 'Submitting…' : 'Submit referee decision'}
          </button>
        </article>
      </section>

      {submitted ? (
        <section className="rounded-2xl border border-amber-300/45 bg-amber-300/12 p-4">
          <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200"><CheckCircle2 className="size-3.5" /> Decision reveal</p>
          <RevealRow label="Correct decision" text="Foul. Penalty kick." />
          <RevealRow label="The rule" text="A direct-free-kick foul by a defender inside their own penalty area is a penalty." />
          <RevealRow label="Tempting alternative" text="No foul is incorrect because defender contact occurs on attacker path before any clean ball contact." />
          <RevealRow label="Referee positioning" text="Inside-trail angle gave referee enough depth perception to identify sweep-leg movement." />
          <RevealRow label="VAR involvement" text="Reviewable as potential penalty incident; VAR can recommend on-field review if missed." />
          <RevealRow label="Restart" text="Penalty kick." />
          <RevealRow label="Sanction" text="Yellow card for reckless trip challenge in this staged scenario." />
          <RevealRow label="Match-control note" text="Decisive whistle and clear signal reduce mass confrontation in late high-stress moments." />

          <div className="mt-3 rounded-xl border border-amber-300/40 bg-background/70 p-3 text-sm text-amber-100">
            <p className="font-semibold">Completion</p>
            <p className="mt-1">You earned 120 Academy XP equivalent and logged one advanced referee completion.</p>
            <p className="mt-1">Key learning point: In penalty area incidents, identify first contact and ball-contact sequence before evaluating sanction.</p>
            <p className="mt-1">Was your confidence right? {confidenceCalibration}</p>
          </div>
        </section>
      ) : null}
    </div>
  )
}

function ScenarioCard({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      <p className="mt-1 text-sm">{copy}</p>
    </div>
  )
}

function DecisionField({
  label,
  value,
  setValue,
  options,
}: {
  label: string
  value: string
  setValue: (value: string) => void
  options: string[]
}) {
  return (
    <label className="mt-3 block text-sm font-semibold">
      {label}
      <select value={value} onChange={(event) => setValue(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-input bg-card px-3">
        <option value="">Select option</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function RevealRow({ label, text }: { label: string; text: string }) {
  return (
    <div className="mt-2 rounded-xl border border-amber-300/35 bg-background/70 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300">{label}</p>
      <p className="mt-1 text-sm text-amber-100">{text}</p>
    </div>
  )
}
