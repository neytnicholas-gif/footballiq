'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, Link2, ListOrdered, RotateCcw, ShieldCheck, Sparkles, Target, X } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { QuizDifficultyPicker, useQuizDifficulty } from '@/components/quiz-difficulty-picker'
import {
  quizLabCorrectAnswer,
  quizLabFormatById,
  quizLabQuestionBank,
  type QuizLabChoiceQuestion,
  type QuizLabFormat,
  type QuizLabLinkQuestion,
  type QuizLabOrderQuestion,
  type QuizLabQuestion,
} from '@/lib/quiz-lab'
import { buildQuizDifficultyIndex, filterQuizDifficulty, quizDifficultyCounts, quizXp } from '@/lib/quiz-difficulty'
import { buildCompletionKey, createCompletionRunId, saveQuizResult } from '@/lib/quiz-save'
import { createQuizSessionSeed, sampleQuizSession } from '@/lib/quiz-session'

const accentClasses: Record<QuizLabFormat, { badge: string; button: string; soft: string }> = {
  'odd-one-out': { badge: 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200', button: 'bg-cyan-300 text-slate-950', soft: 'border-cyan-300/25 bg-cyan-300/5' },
  'truth-trap': { badge: 'border-rose-300/30 bg-rose-300/10 text-rose-200', button: 'bg-rose-300 text-slate-950', soft: 'border-rose-300/25 bg-rose-300/5' },
  'order-the-play': { badge: 'border-amber-300/30 bg-amber-300/10 text-amber-200', button: 'bg-amber-300 text-slate-950', soft: 'border-amber-300/25 bg-amber-300/5' },
  'link-up': { badge: 'border-violet-300/30 bg-violet-300/10 text-violet-200', button: 'bg-violet-300 text-slate-950', soft: 'border-violet-300/25 bg-violet-300/5' },
  'formation-fix': { badge: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200', button: 'bg-emerald-300 text-slate-950', soft: 'border-emerald-300/25 bg-emerald-300/5' },
}

const SESSION_SIZE = 12
const difficultyIndexes = Object.fromEntries(Object.entries(quizLabQuestionBank).map(([format, questions]) => [
  format,
  buildQuizDifficultyIndex(questions, {
    id: (question) => question.id,
    authored: (question) => question.difficulty,
    text: (question) => `${question.prompt} ${question.explanation} ${question.takeaway}`,
  }),
])) as Record<QuizLabFormat, Map<string, import('@/lib/quiz-difficulty').QuizDifficulty>>

function PitchPicture({ zone }: { zone: QuizLabChoiceQuestion['visual'] }) {
  const zoneClass = {
    goal: 'bottom-[7%] left-1/2 h-[22%] w-[38%] -translate-x-1/2',
    left: 'left-[5%] top-[25%] h-[50%] w-[25%]',
    centre: 'left-1/2 top-1/2 h-[38%] w-[28%] -translate-x-1/2 -translate-y-1/2',
    right: 'right-[5%] top-[25%] h-[50%] w-[25%]',
    'half-space': 'right-[26%] top-[22%] h-[42%] w-[20%]',
    wide: 'right-[3%] top-[15%] h-[70%] w-[20%]',
    depth: 'left-1/2 top-[5%] h-[28%] w-[38%] -translate-x-1/2',
  }[zone ?? 'centre']

  return <div className="relative mx-auto aspect-[16/9] w-full max-w-xl overflow-hidden rounded-2xl border border-emerald-200/25 bg-[#07533d] shadow-inner" aria-label="Pitch map with the problem area highlighted">
    <div className="absolute inset-3 rounded-xl border border-white/35" />
    <div className="absolute left-1/2 top-3 bottom-3 border-l border-white/35" />
    <div className="absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/35" />
    <div className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" />
    <div className={`absolute rounded-2xl border-2 border-amber-200 bg-amber-200/30 shadow-[0_0_30px_rgba(253,230,138,.35)] ${zoneClass}`}><span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-slate-950/80 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-100">Fix here</span></div>
  </div>
}

function ChoiceBoard({ question, disabled, onAnswer, selected }: { question: QuizLabChoiceQuestion; disabled: boolean; onAnswer: (answer: string) => void; selected: string | null }) {
  return <>
    {question.kind === 'formation-fix' ? <div className="mb-5"><PitchPicture zone={question.visual} /></div> : null}
    <div className="grid gap-3 sm:grid-cols-2">
      {question.options.map((option, index) => <button key={option} type="button" disabled={disabled} onClick={() => onAnswer(option)} className={`min-h-16 rounded-2xl border p-4 text-left text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-white/70 ${selected === option ? 'border-white bg-white text-slate-950' : 'border-slate-700 bg-slate-950/45 text-slate-100 hover:-translate-y-0.5 hover:border-slate-400'} disabled:cursor-default disabled:hover:translate-y-0`}><span className="mr-2 text-xs text-slate-400">{String.fromCharCode(65 + index)}</span>{option}</button>)}
    </div>
  </>
}

function OrderBoard({ question, disabled, onAnswer }: { question: QuizLabOrderQuestion; disabled: boolean; onAnswer: (answer: string) => void }) {
  const [chosen, setChosen] = useState<string[]>([])
  function toggle(item: string) {
    if (disabled) return
    setChosen((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])
  }
  return <div>
    <div className="mb-4 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4">
      <p className="text-xs font-black uppercase tracking-[.16em] text-amber-200">Your order</p>
      <div className="mt-3 flex min-h-11 flex-wrap gap-2">{chosen.length ? chosen.map((item, index) => <span key={item} className="rounded-lg bg-amber-200 px-3 py-2 text-xs font-bold text-slate-950">{index + 1}. {item}</span>) : <span className="text-sm text-slate-400">Tap the first step below.</span>}</div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">{question.items.map((item) => {
      const number = chosen.indexOf(item)
      return <button key={item} type="button" disabled={disabled} onClick={() => toggle(item)} className={`min-h-16 rounded-2xl border p-4 text-left font-bold outline-none focus-visible:ring-2 focus-visible:ring-amber-200 ${number >= 0 ? 'border-amber-200 bg-amber-200/15 text-amber-100' : 'border-slate-700 bg-slate-950/45 text-slate-100 hover:border-amber-200/60'}`}>{number >= 0 ? <span className="mr-2 inline-flex size-6 items-center justify-center rounded-full bg-amber-200 text-xs text-slate-950">{number + 1}</span> : null}{item}</button>
    })}</div>
    <div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={disabled || chosen.length !== question.items.length} onClick={() => onAnswer(chosen.join(' > '))} className="min-h-11 rounded-xl bg-amber-300 px-5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">Check my order</button><button type="button" disabled={disabled || chosen.length === 0} onClick={() => setChosen([])} className="min-h-11 rounded-xl border border-slate-600 px-4 text-sm font-bold text-slate-200 disabled:opacity-40">Reset</button></div>
  </div>
}

function LinkBoard({ question, disabled, onAnswer }: { question: QuizLabLinkQuestion; disabled: boolean; onAnswer: (answer: string) => void }) {
  const [matches, setMatches] = useState<Record<string, string>>({})
  const complete = question.pairs.every((pair) => matches[pair.left])
  function submit() {
    onAnswer(question.pairs.map((pair) => `${pair.left} = ${matches[pair.left]}`).join(' | '))
  }
  return <div className="space-y-3">
    {question.pairs.map((pair, index) => <div key={pair.left} className="grid gap-2 rounded-2xl border border-violet-300/15 bg-violet-300/5 p-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
      <span className="font-bold text-slate-100">{index + 1}. {pair.left}</span><Link2 className="hidden size-4 text-violet-300 sm:block" aria-hidden="true" />
      <label className="sr-only" htmlFor={`${question.id}-${index}`}>Match for {pair.left}</label><select id={`${question.id}-${index}`} value={matches[pair.left] ?? ''} disabled={disabled} onChange={(event) => setMatches((current) => ({ ...current, [pair.left]: event.target.value }))} className="min-h-11 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 text-sm font-semibold text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-violet-300"><option value="">Choose its match</option>{question.rightOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
    </div>)}
    <button type="button" disabled={disabled || !complete} onClick={submit} className="min-h-11 rounded-xl bg-violet-300 px-5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">Check all four links</button>
  </div>
}

function QuestionBoard({ question, answered, selected, onAnswer }: { question: QuizLabQuestion; answered: boolean; selected: string | null; onAnswer: (answer: string) => void }) {
  if (question.kind === 'order-the-play') return <OrderBoard key={question.id} question={question} disabled={answered} onAnswer={onAnswer} />
  if (question.kind === 'link-up') return <LinkBoard key={question.id} question={question} disabled={answered} onAnswer={onAnswer} />
  return <ChoiceBoard question={question} disabled={answered} onAnswer={onAnswer} selected={selected} />
}

export function QuizLabGame({ format }: { format: QuizLabFormat }) {
  const { user, refreshProfile } = useAuth()
  const { difficulty, setDifficulty, ready } = useQuizDifficulty(`quiz-lab-${format}`)
  const meta = quizLabFormatById(format)!
  const colors = accentClasses[format]
  const [sessionSeed, setSessionSeed] = useState(1)
  const bankSize = quizLabQuestionBank[format].length
  const difficultyIndex = difficultyIndexes[format]
  const difficultyCounts = useMemo(() => quizDifficultyCounts(difficultyIndex), [difficultyIndex])
  const questions = useMemo(() => sampleQuizSession(
    filterQuizDifficulty(quizLabQuestionBank[format], difficulty, difficultyIndex, (question) => question.id),
    SESSION_SIZE,
    sessionSeed,
  ), [difficulty, difficultyIndex, format, sessionSeed])
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [runKey, setRunKey] = useState(() => createCompletionRunId())
  const question = questions[index]!
  const right = selected === quizLabCorrectAnswer(question)
  const last = index === questions.length - 1
  const xp = quizXp(20 + score * 10 + (score === questions.length ? 40 : 0), difficulty)
  const progress = Math.round(((index + (answered ? 1 : 0)) / questions.length) * 100)
  const FormatIcon = useMemo(() => format === 'order-the-play' ? ListOrdered : format === 'link-up' ? Link2 : format === 'formation-fix' ? Target : ShieldCheck, [format])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const key = `early-shout:quiz-lab-seed:${format}:${difficulty}`
      const stored = Number(window.sessionStorage.getItem(key))
      const nextSeed = Number.isSafeInteger(stored) && stored > 0 ? stored : createQuizSessionSeed()
      window.sessionStorage.setItem(key, String(nextSeed))
      setSessionSeed(nextSeed)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [difficulty, format])

  function answer(value: string) {
    if (answered) return
    setSelected(value)
    setAnswers((current) => [...current, value])
    if (value === quizLabCorrectAnswer(question)) setScore((current) => current + 1)
    setAnswered(true)
  }

  function next() {
    setIndex((current) => current + 1)
    setSelected(null)
    setAnswered(false)
  }

  function startRound() {
    const nextSeed = createQuizSessionSeed()
    window.sessionStorage.setItem(`early-shout:quiz-lab-seed:${format}:${difficulty}`, String(nextSeed))
    setSessionSeed(nextSeed); setIndex(0); setScore(0); setAnswers([]); setSelected(null); setAnswered(false); setSaved(false); setSaving(false); setSaveError(false); setRunKey(createCompletionRunId())
  }

  function restart() {
    startRound()
  }

  function changeDifficulty(nextDifficulty: typeof difficulty) {
    setDifficulty(nextDifficulty)
    setIndex(0); setScore(0); setAnswers([]); setSelected(null); setAnswered(false); setSaved(false); setSaving(false); setSaveError(false); setRunKey(createCompletionRunId())
  }

  async function save() {
    if (!user || saved || saving) return
    setSaving(true); setSaveError(false)
    const quizId = `quiz-lab-${format}`
    const { error } = await saveQuizResult({ quizId, score, total: questions.length, xp, completionKey: buildCompletionKey(quizId, runKey), proof: { kind: 'quiz-lab', format, questionIds: questions.map((item) => item.id), answers, difficulty } })
    if (error) setSaveError(true)
    else { setSaved(true); await refreshProfile() }
    setSaving(false)
  }

  if (!ready || !question) return <div className="flex min-h-64 items-center justify-center rounded-3xl border border-white/10 bg-slate-900/75 text-sm text-slate-300">Building a fresh {meta.title} round…</div>

  return <div className="space-y-5">
    <QuizDifficultyPicker value={difficulty} onChange={changeDifficulty} counts={difficultyCounts} disabled={index > 0 || answered} />
    <section className="overflow-hidden rounded-[1.75rem] border border-slate-700 bg-slate-900/80 shadow-2xl shadow-black/30">
    <div className="border-b border-slate-700 bg-slate-950/55 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3"><span className={`flex size-11 items-center justify-center rounded-xl border ${colors.badge}`}><FormatIcon className="size-5" /></span><div><p className="text-xs font-black uppercase tracking-[.18em] text-slate-400">{meta.skill}</p><h2 className="text-xl font-black text-white">{meta.title}</h2></div></div>
        <div className="text-right"><p className="text-sm font-bold text-white">{index + 1} / {questions.length}</p><p className="text-xs text-slate-400">Score {score}</p></div>
      </div>
      <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-4"><p className="text-xs font-black uppercase tracking-[.16em] text-cyan-200">Fresh difficulty-matched round</p><p className="mt-1 text-sm font-bold text-white">12 {difficulty} questions</p><p className="mt-1 text-xs text-slate-400">Your level is selected from {bankSize} different {meta.title} challenges. Play again for another mix.</p></div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full transition-all duration-500 ${colors.button}`} style={{ width: `${progress}%` }} /></div>
    </div>

    <div className="p-5 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center gap-2"><span className={`rounded-lg border px-2.5 py-1 text-xs font-black ${colors.badge}`}>{question.difficulty}</span><span className="text-xs font-semibold text-slate-400">{meta.instruction}</span></div>
      <h3 className="mb-6 max-w-3xl text-balance text-2xl font-black leading-tight text-white sm:text-3xl">{question.prompt}</h3>
      <QuestionBoard key={question.id} question={question} answered={answered} selected={selected} onAnswer={answer} />

      {answered ? <div className={`mt-6 rounded-2xl border p-5 ${right ? 'border-emerald-300/35 bg-emerald-300/8' : 'border-rose-300/35 bg-rose-300/8'}`} role="status">
        <div className="flex items-start gap-3"><span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${right ? 'bg-emerald-300 text-emerald-950' : 'bg-rose-300 text-rose-950'}`}>{right ? <Check className="size-4" /> : <X className="size-4" />}</span><div><p className="font-black text-white">{right ? 'Nice read.' : 'Not this time.'}</p><p className="mt-1 text-sm leading-relaxed text-slate-300">{question.explanation}</p><p className="mt-3 rounded-xl bg-slate-950/45 px-3 py-2 text-sm text-slate-200"><strong>Remember:</strong> {question.takeaway}</p></div></div>
        <div className="mt-5 flex flex-wrap gap-3">{!last ? <button type="button" onClick={next} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-black ${colors.button}`}>Next challenge <ArrowRight className="size-4" /></button> : <>
          <button type="button" onClick={() => void save()} disabled={!user || saved || saving} className={`min-h-11 rounded-xl px-5 text-sm font-black disabled:opacity-50 ${colors.button}`}>{!user ? 'Sign in to save your XP' : saving ? 'Saving…' : saved ? `Saved · ${xp} XP` : `Finish and save ${xp} XP`}</button>
          <button type="button" onClick={startRound} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-300/45 bg-cyan-300/10 px-4 text-sm font-bold text-cyan-100">Next 12 questions <ArrowRight className="size-4" /></button>
          <button type="button" onClick={restart} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-600 px-4 text-sm font-bold text-slate-100"><RotateCcw className="size-4" /> Play again</button>
        </>}</div>{saveError ? <p className="mt-3 text-sm font-semibold text-rose-200">We could not save that run. Please try again.</p> : null}
      </div> : null}
    </div>
    <div className={`flex flex-wrap items-center justify-between gap-3 border-t p-4 text-xs text-slate-400 ${colors.soft}`}><span className="inline-flex items-center gap-2"><Sparkles className="size-4" /> Original Early Shout challenge</span><span>Answer first. Learn why straight after.</span></div>
    </section>
  </div>
}
