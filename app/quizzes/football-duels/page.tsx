'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Dices, Search, Sparkles, Zap } from 'lucide-react'
import { DuelQuiz } from '@/components/duel-quiz'
import { QuizDifficultyPicker, useQuizDifficulty } from '@/components/quiz-difficulty-picker'
import { SiteHeader } from '@/components/site-header'
import {
  buildDailyDuelPack,
  duelPacks,
  getDuelPackDifficulty,
  type DuelCategory,
  type DuelPack,
} from '@/lib/duel-packs'
import { quizDifficulties, quizDifficultyMeta, type QuizDifficulty } from '@/lib/quiz-difficulty'

const categories: Array<'All' | DuelCategory> = ['All', 'League', 'Europe', 'International', 'Trophies']
const packCounts = Object.fromEntries(quizDifficulties.map((difficulty) => [
  difficulty,
  duelPacks.filter((pack) => getDuelPackDifficulty(pack.id) === difficulty).length,
])) as Record<QuizDifficulty, number>

function dailyPack() {
  return buildDailyDuelPack(new Date().toISOString().slice(0, 10))
}

export default function FootballDuelsPage() {
  const { difficulty, setDifficulty, ready } = useQuizDifficulty('football-duels')
  const [selected, setSelected] = useState<DuelPack | null>(null)
  const [category, setCategory] = useState<'All' | DuelCategory>('All')
  const [search, setSearch] = useState('')
  const [completed, setCompleted] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!ready) return
    const frame = window.requestAnimationFrame(() => {
      const firstPack = duelPacks.find((pack) => getDuelPackDifficulty(pack.id) === difficulty)
      setSelected(difficulty === 'normal' ? dailyPack() : (firstPack ?? duelPacks[0]!))
      try {
        const stored = localStorage.getItem('footballiq-duel-completed')
        setCompleted(stored ? JSON.parse(stored) as Record<string, number> : {})
      } catch {
        setCompleted({})
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [difficulty, ready])

  const filtered = useMemo(() => duelPacks.filter((pack) => {
    const categoryMatch = category === 'All' || pack.category === category
    const searchMatch = `${pack.title} ${pack.description}`.toLowerCase().includes(search.toLowerCase())
    return getDuelPackDifficulty(pack.id) === difficulty && categoryMatch && searchMatch
  }), [category, difficulty, search])

  function markComplete(packId: string, score: number) {
    const next = { ...completed, [packId]: Math.max(score, completed[packId] ?? 0) }
    setCompleted(next)
    try { localStorage.setItem('footballiq-duel-completed', JSON.stringify(next)) } catch {}
  }

  function chooseDifficulty(nextDifficulty: QuizDifficulty) {
    setDifficulty(nextDifficulty)
    const nextPack = nextDifficulty === 'normal'
      ? dailyPack()
      : duelPacks.find((pack) => getDuelPackDifficulty(pack.id) === nextDifficulty)
    setSelected(nextPack ?? duelPacks[0]!)
    setCategory('All')
    setSearch('')
  }

  function selectRandomPack() {
    const options = filtered.filter((pack) => pack.id !== selected?.id)
    const fallback = filtered[0] ?? duelPacks.find((pack) => getDuelPackDifficulty(pack.id) === difficulty) ?? duelPacks[0]!
    setSelected(options[Math.floor(Math.random() * options.length)] ?? fallback)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function selectDailyPack() {
    setDifficulty('normal')
    setSelected(dailyPack())
    setCategory('All')
    setSearch('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const selectedDifficulty = selected ? getDuelPackDifficulty(selected.id) : difficulty

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"><Sparkles className="size-3.5" /> Football Duels</div>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">One stat. Two players. <span className="text-primary">No time to overthink.</span></h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">Choose a level, answer fast and get instant feedback. Tougher stat battles earn more XP.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={selectDailyPack} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground"><Zap className="size-5" /> Daily quick play</button>
            <button type="button" onClick={selectRandomPack} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 font-semibold"><Dices className="size-5" /> Random pack</button>
          </div>
        </div>

        <div className="mt-8"><QuizDifficultyPicker value={difficulty} onChange={chooseDifficulty} counts={packCounts} disabled={!ready} /></div>

        <div className="mt-6">
          {selected ? (
            <DuelQuiz key={`${selected.id}-${selectedDifficulty}`} pack={selected} difficulty={selectedDifficulty} onComplete={markComplete} />
          ) : (
            <div role="status" className="rounded-[2rem] border border-border bg-card p-8 text-center sm:p-12">
              <div className="mx-auto size-10 animate-pulse rounded-2xl bg-primary/20" />
              <p className="mt-4 font-semibold">Preparing your Football Duels…</p>
              <p className="mt-1 text-sm text-muted-foreground">Matching questions to your chosen level.</p>
            </div>
          )}
        </div>

        <section className="mt-14 rounded-2xl border border-border bg-card p-6 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-[.25em] text-primary">{quizDifficultyMeta[difficulty].label} pack library</p><h2 className="mt-2 text-3xl font-bold">Master every category</h2><p className="mt-2 text-muted-foreground">Your best score is saved. Every replay shuffles the order and sides.</p></div>
            <div className="rounded-full border border-border bg-background px-4 py-2 text-sm"><strong className="text-primary">{Object.keys(completed).filter((id) => !id.startsWith('daily-duel-')).length}</strong>/{duelPacks.length} packs completed</div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm transition ${category === item ? 'bg-primary font-semibold text-primary-foreground' : 'border border-border bg-background text-muted-foreground hover:text-foreground'}`}>{item}</button>)}</div>
            <label className="flex min-w-64 items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5"><Search className="size-4 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search packs" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" /></label>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((pack) => {
              const best = completed[pack.id]
              const active = selected?.id === pack.id
              const packDifficulty = getDuelPackDifficulty(pack.id)
              return <button key={pack.id} type="button" onClick={() => { setSelected(pack); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className={`group relative overflow-hidden rounded-3xl border p-6 text-left transition duration-300 hover:-translate-y-1 ${active ? 'border-primary bg-primary/10 ring-1 ring-primary/30' : 'border-border bg-background hover:border-primary/50'}`}>
                <div className="flex items-start justify-between gap-4"><span className="text-3xl" aria-hidden="true">{pack.emoji}</span><div className="flex items-center gap-2">{typeof best === 'number' && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"><CheckCircle2 className="size-3.5" /> {best}/10</span>}<span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{quizDifficultyMeta[packDifficulty].label} · {quizDifficultyMeta[packDifficulty].xpMultiplier}× XP</span></div></div>
                <h3 className="mt-5 text-xl font-bold">{pack.title}</h3><p className="mt-2 min-h-12 text-sm leading-relaxed text-muted-foreground">{pack.description}</p>
                <div className="mt-5 flex items-center justify-between"><span className="text-xs text-muted-foreground">10 duels • {pack.category}</span><span className="text-sm font-semibold text-primary transition group-hover:translate-x-1">Play →</span></div>
              </button>
            })}
          </div>
          {!filtered.length && <div className="mt-6 rounded-2xl border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">No {quizDifficultyMeta[difficulty].label.toLowerCase()} packs match those filters. Try another category or search.</div>}
        </section>
      </section>
    </main>
  )
}
