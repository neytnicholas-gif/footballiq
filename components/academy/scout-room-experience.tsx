'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, ClipboardCheck, Eye, FileSearch, Gauge, ShieldAlert, Target } from 'lucide-react'
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
  const selectedSignals = strengths.length + concerns.length

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
    <div className="space-y-5">
      <header className="mode-hero overflow-hidden rounded-[2rem] border p-6 sm:p-8">
        <div className="mode-visual" aria-hidden="true"><div className="mode-pitch-lines" /><div className="mode-orb mode-orb-one" /><div className="mode-orb mode-orb-two" /></div>
        <div className="relative z-10 grid w-full gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="mode-pill inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em]"><FileSearch className="size-4" /> Advanced Scout Room</p>
            <h1 className="mt-5 text-4xl font-black tracking-[-0.045em] text-white sm:text-5xl">Build the report.<br /><span className="text-emerald-300">Back your judgement.</span></h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Study the evidence, choose the signals that matter and make a clear recommendation. Your example report unlocks after you submit.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:w-[22rem]">
            <HeroMetric label="Signals" value={`${selectedSignals}/6`} />
            <HeroMetric label="Confidence" value={confidence || '—'} />
            <HeroMetric label="Report" value={report.trim().length > 30 ? 'Ready' : 'Draft'} />
          </div>
        </div>
      </header>

      <section className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
        <div className="space-y-4">
          <article className="mode-game rounded-[1.7rem] border p-4 sm:p-5">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Player dossier · Case 01</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-white">{dossier.name}</h2>
                <p className="mt-1 text-sm text-slate-400">{dossier.position} · {dossier.age} years old</p>
              </div>
              <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/8 px-4 py-3 sm:max-w-64">
                <p className="text-[10px] font-black uppercase tracking-[0.17em] text-cyan-300">Current level</p>
                <p className="mt-1 text-sm font-bold leading-5 text-slate-200">{dossier.teamLevel}</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-300/[.07] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.17em] text-emerald-300">Scout brief</p>
              <p className="mt-2 text-base font-bold leading-6 text-white">{dossier.style}</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <DataBlock tone="cyan" icon={<Gauge className="size-4" />} title="Relevant statistics" lines={dossier.stats} />
              <DataBlock tone="violet" icon={<Eye className="size-4" />} title="Context around the numbers" lines={dossier.context} />
              <DataBlock tone="emerald" icon={<CheckCircle2 className="size-4" />} title="What looks strong" lines={dossier.strengths} />
              <DataBlock tone="amber" icon={<ShieldAlert className="size-4" />} title="What needs checking" lines={dossier.concerns} />
            </div>
          </article>

          <article className="mode-game rounded-[1.7rem] border p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Four moments to notice</p><h2 className="mt-1 text-xl font-black text-white">Observation board</h2></div>
              <Eye className="size-6 text-cyan-300" />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Observation label="Possession" text="Consistently scans before receiving from goalkeeper and left pivot." />
              <Observation label="Defensive shape" text="Holds line well until diagonal run threatens far-post channel." />
              <Observation label="Transition" text="Three clips show delayed turn when attacker attacks space behind." />
              <Observation label="Communication" text="Visible hand and voice cues when full-back vacates lane." />
            </div>
          </article>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24">
          <article className="mode-game rounded-[1.7rem] border p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div><p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.18em] text-emerald-300"><Target className="size-4" /> Your call</p><h2 className="mt-1 text-2xl font-black text-white">Make the decision</h2></div>
              <span className="rounded-full border border-white/10 bg-white/[.06] px-3 py-1 text-xs font-bold text-slate-300">6 quick steps</span>
            </div>
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
              <select value={potential} onChange={(event) => setPotential(event.target.value)} className="mt-1.5 h-12 w-full rounded-xl border border-white/15 bg-slate-950/55 px-3 text-sm text-white outline-none focus:border-emerald-300/60">
                <option value="">Choose how good they could become</option>
                <option value="rotation-top-flight">Top-flight rotation potential</option>
                <option value="starter-top-flight">Top-flight starter potential</option>
                <option value="elite-league">Elite league starter potential</option>
              </select>
            </label>

            <label className="mt-3 block text-sm font-semibold">
              Recommendation
              <select value={recommendation} onChange={(event) => setRecommendation(event.target.value)} className="mt-1.5 h-12 w-full rounded-xl border border-white/15 bg-slate-950/55 px-3 text-sm text-white outline-none focus:border-emerald-300/60">
                <option value="">Choose what the club should do</option>
                <option value="recommend-now">Recommend now</option>
                <option value="recommend-follow-up">Recommend with follow-up live check</option>
                <option value="monitor-only">Monitor only</option>
              </select>
            </label>

            <label className="mt-3 block text-sm font-semibold">
              Confidence level
              <select value={confidence} onChange={(event) => setConfidence(event.target.value as Confidence | '')} className="mt-1.5 h-12 w-full rounded-xl border border-white/15 bg-slate-950/55 px-3 text-sm text-white outline-none focus:border-emerald-300/60">
                <option value="">Select confidence</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </label>

            <label className="mt-3 block text-sm font-semibold">
              Structured report (concise)
              <textarea value={report} onChange={(event) => setReport(event.target.value)} rows={5} placeholder="What did you notice? What looks good? What is the risk? What should the club do next?" className="mt-1.5 w-full resize-y rounded-xl border border-white/15 bg-slate-950/55 px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-500 focus:border-emerald-300/60" />
            </label>

            <button onClick={() => void submit()} disabled={!completionReady || submitted || saving} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-5 text-sm font-black text-emerald-950 shadow-[0_16px_36px_-18px_rgba(52,211,153,.8)] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
              <ClipboardCheck className="size-4" />
              {submitted ? 'Submitted' : saving ? 'Submitting…' : 'Submit scouting report'}
            </button>
            {!completionReady && !submitted ? <p className="mt-3 text-center text-xs leading-5 text-slate-400">Choose at least one strength and concern, finish the three decisions, then write a short report.</p> : null}
          </article>

          {submitted ? (
            <article className="rounded-2xl border border-emerald-300/45 bg-emerald-300/12 p-4">
              <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200"><CheckCircle2 className="size-3.5" /> Example answer</p>
              <DebriefRow label="Observation" text="Kovares shows repeatable left-foot progression and communication habits in a high-line structure." />
              <DebriefRow label="Interpretation" text="Technical and perceptual profile suggests starter upside if transition defending stabilizes." />
              <DebriefRow label="Alternative explanation" text="Current clean possession actions may be partly protected by stable pivot support." />
              <DebriefRow label="Missing information" text="Need direct evidence against elite transition pace and aerially dominant forwards." />
              <DebriefRow label="Recommendation" text="Recommend with targeted follow-up scouting in higher tempo fixtures." />
              <DebriefRow label="Confidence" text="Medium-high confidence due repeatability in core passing and communication actions." />

              <div className="mt-3 rounded-xl border border-emerald-300/40 bg-background/70 p-3 text-sm text-emerald-100">
                <p className="font-semibold">Completion</p>
                <p className="mt-1">You earned 120 Academy XP equivalent and logged one advanced scouting completion.</p>
                <p className="mt-1">Remember: one good match does not tell you everything about a player.</p>
                <p className="mt-1">You covered {learning.judgedCoverage} of 4 important report areas.</p>
                {learning.missed.length > 0 ? <p className="mt-1">You may have missed: {learning.missed.join(', ')}.</p> : null}
              </div>
            </article>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.07] px-3 py-3 text-center backdrop-blur"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p><p className="mt-1 truncate text-sm font-black text-white">{value}</p></div>
}

const dataTones = {
  cyan: 'border-cyan-300/15 bg-cyan-300/[.06] text-cyan-300',
  violet: 'border-violet-300/15 bg-violet-300/[.06] text-violet-300',
  emerald: 'border-emerald-300/15 bg-emerald-300/[.06] text-emerald-300',
  amber: 'border-amber-300/15 bg-amber-300/[.06] text-amber-300',
} as const

function DataBlock({ title, lines, icon, tone }: { title: string; lines: string[]; icon: React.ReactNode; tone: keyof typeof dataTones }) {
  return (
    <div className={`rounded-2xl border p-4 ${dataTones[tone]}`}>
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em]">{icon}{title}</p>
      <ul className="mt-3 space-y-2 text-sm leading-5 text-slate-200">
        {lines.map((line) => <li key={line} className="flex gap-2"><span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-current opacity-70" /><span>{line}</span></li>)}
      </ul>
    </div>
  )
}

function Observation({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.055] p-4 transition hover:border-cyan-300/25 hover:bg-cyan-300/[.07]">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-200">{text}</p>
    </div>
  )
}

function FieldLegend({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <p className="text-sm font-bold text-slate-200">{title}</p>
      <div className="mt-1.5 flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function TogglePill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={`min-h-10 rounded-full border px-3 py-2 text-xs font-bold transition ${active ? 'border-emerald-300/55 bg-emerald-300/15 text-emerald-200 shadow-[inset_0_0_0_1px_rgba(52,211,153,.08)]' : 'border-white/12 bg-white/[.055] text-slate-300 hover:border-emerald-300/30 hover:text-white'}`}>
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
