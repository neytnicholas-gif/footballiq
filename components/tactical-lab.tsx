'use client'

import { useState } from 'react'
import { ArrowRight, Check, RotateCcw, X } from 'lucide-react'
import { tacticalScenarios } from '@/lib/tactical-scenarios'
import { cn } from '@/lib/utils'

export function TacticalLab() {
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const scenario = tacticalScenarios[index]
  const complete = index === tacticalScenarios.length - 1 && selected !== null

  function choose(option: number) {
    if (selected !== null) return
    setSelected(option)
    if (option === scenario.answer) setScore((value) => value + 1)
  }

  function next() { setIndex((value) => value + 1); setSelected(null) }
  function restart() { setIndex(0); setSelected(null); setScore(0) }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="rounded-3xl border border-white/10 bg-slate-900/75 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300">{scenario.category} · {scenario.difficulty}</p><h2 className="mt-2 text-2xl font-black text-white">{scenario.prompt}</h2></div>
          <p className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300" aria-label={`Scenario ${index + 1} of ${tacticalScenarios.length}`}>{index + 1}/{tacticalScenarios.length}</p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-cyan-300 transition-all" style={{ width: `${((index + (selected !== null ? 1 : 0)) / tacticalScenarios.length) * 100}%` }} /></div>
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
          <p className="flex items-center gap-2 font-bold text-white">{selected === scenario.answer ? <Check className="size-5 text-emerald-300" /> : <X className="size-5 text-rose-300" />}{selected === scenario.answer ? 'Strong decision' : 'A stronger option was available'}</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-300"><strong className="text-cyan-200">Principle:</strong> {scenario.principle}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{scenario.explanation}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-400"><strong>Why not the alternatives?</strong> {scenario.alternatives}</p>
          <div className="mt-5 flex flex-wrap gap-3">{!complete ? <button type="button" onClick={next} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950">Next decision <ArrowRight className="size-4" /></button> : <><p className="mr-auto self-center font-bold text-white">Final score: {score}/{tacticalScenarios.length}</p><button type="button" onClick={restart} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-bold"><RotateCcw className="size-4" /> Try again</button></>}</div>
        </div>}
      </article>
    </div>
  )
}
