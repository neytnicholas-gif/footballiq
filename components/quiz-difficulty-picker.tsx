'use client'

import { useEffect, useState } from 'react'
import { Gauge, Sparkles } from 'lucide-react'
import { quizDifficulties, quizDifficultyMeta, type QuizDifficulty } from '@/lib/quiz-difficulty'

export function useQuizDifficulty(storageKey: string) {
  const [difficulty, setDifficultyState] = useState<QuizDifficulty>('normal')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const stored = window.localStorage.getItem(`early-shout:quiz-difficulty:${storageKey}`)
      if (stored && quizDifficulties.includes(stored as QuizDifficulty)) setDifficultyState(stored as QuizDifficulty)
      setReady(true)
    })
    return () => window.clearTimeout(timeout)
  }, [storageKey])

  function setDifficulty(value: QuizDifficulty) {
    setDifficultyState(value)
    window.localStorage.setItem(`early-shout:quiz-difficulty:${storageKey}`, value)
  }

  return { difficulty, setDifficulty, ready }
}

export function QuizDifficultyPicker({ value, onChange, counts, disabled = false }: {
  value: QuizDifficulty
  onChange: (difficulty: QuizDifficulty) => void
  counts?: Partial<Record<QuizDifficulty, number>>
  disabled?: boolean
}) {
  return (
    <section className="rounded-[1.5rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.12),transparent_38%),linear-gradient(145deg,#0b1728,#0b2030)] p-4 text-slate-100 shadow-lg sm:p-5" aria-labelledby="difficulty-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-cyan-300"><Gauge className="size-4" /> Choose your level</p>
          <h2 id="difficulty-heading" className="mt-1 text-xl font-black text-white">How tough should this round be?</h2>
          <p className="mt-1 text-sm text-slate-400">Harder questions earn more XP. You can change level before a new round.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-xs font-bold text-amber-100"><Sparkles className="size-3.5" /> Up to 1.5× XP</span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-5" role="group" aria-label="Quiz difficulty">
        {quizDifficulties.map((difficulty) => {
          const meta = quizDifficultyMeta[difficulty]
          const selected = difficulty === value
          return <button key={difficulty} type="button" aria-pressed={selected} disabled={disabled} onClick={() => onChange(difficulty)} className={`min-h-24 rounded-2xl border p-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-55 ${selected ? `${meta.tone} -translate-y-0.5 shadow-[0_12px_32px_-22px_rgba(34,211,238,.9)]` : 'border-slate-700 bg-slate-950/55 text-slate-300 hover:border-slate-500 hover:bg-slate-900'}`}>
            <span className="block text-sm font-black">{meta.label}</span>
            <span className="mt-1 block text-[11px] leading-4 opacity-80">{meta.shortCopy}</span>
            <span className="mt-2 block text-[11px] font-black">{meta.xpMultiplier}× XP{typeof counts?.[difficulty] === 'number' ? ` · ${counts[difficulty]} available` : ''}</span>
          </button>
        })}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400"><strong className="text-slate-200">{quizDifficultyMeta[value].label}:</strong> {quizDifficultyMeta[value].learningCopy}</p>
    </section>
  )
}
