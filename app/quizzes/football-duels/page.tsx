'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Dices, Search, Sparkles, Zap } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { DuelQuiz } from '@/components/duel-quiz'
import { duelPacks, type DuelCategory, type DuelPack, type DuelQuestion } from '@/lib/duel-packs'

const categories: Array<'All' | DuelCategory> = ['All', 'League', 'Europe', 'International', 'Trophies']

function seededShuffle<T>(items: T[], seed: number) {
  const copy = [...items]
  let value = seed || 1
  for (let i = copy.length - 1; i > 0; i -= 1) {
    value = (value * 9301 + 49297) % 233280
    const j = Math.floor((value / 233280) * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function buildDailyQuickPlay(): DuelPack {
  const date = new Date().toISOString().slice(0, 10)
  const seed = Number(date.replaceAll('-', ''))
  const pool: DuelQuestion[] = duelPacks.flatMap((pack) =>
    pack.questions.map((question) => ({ ...question, statLabel: pack.statLabel })),
  )
  return {
    id: `daily-duel-${date}`,
    title: 'Daily Quick Play',
    shortTitle: 'Quick Play',
    description: 'Ten mixed duels. Same challenge for everyone today.',
    statLabel: 'stat',
    category: 'League',
    difficulty: 'Sharp',
    emoji: '⚡',
    questions: seededShuffle(pool, seed).slice(0, 10),
  }
}

export default function FootballDuelsPage() {
  const quickPlay = useMemo(() => buildDailyQuickPlay(), [])
  const [selected, setSelected] = useState<DuelPack>(quickPlay)
  const [category, setCategory] = useState<'All' | DuelCategory>('All')
  const [search, setSearch] = useState('')
  const [completed, setCompleted] = useState<Record<string, number>>({})

  useEffect(() => {
    try {
      const stored = localStorage.getItem('footballiq-duel-completed')
      setCompleted(stored ? JSON.parse(stored) as Record<string, number> : {})
    } catch { setCompleted({}) }
  }, [])

  const filtered = useMemo(() => duelPacks.filter((pack) => {
    const categoryMatch = category === 'All' || pack.category === category
    const searchMatch = `${pack.title} ${pack.description}`.toLowerCase().includes(search.toLowerCase())
    return categoryMatch && searchMatch
  }), [category, search])

  function markComplete(packId: string, score: number) {
    const next = { ...completed, [packId]: Math.max(score, completed[packId] ?? 0) }
    setCompleted(next)
    try { localStorage.setItem('footballiq-duel-completed', JSON.stringify(next)) } catch {}
  }

  function selectRandomPack() {
    const options = duelPacks.filter((pack) => pack.id !== selected.id)
    setSelected(options[Math.floor(Math.random() * options.length)] ?? duelPacks[0])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"><Sparkles className="size-3.5" /> Football Duels V2</div>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">One stat. Two players. <span className="text-primary">No time to overthink.</span></h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">Answer, get instant feedback and move straight on. Build combos, earn XP and climb from Football Fan to Legend.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => { setSelected(buildDailyQuickPlay()); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground"><Zap className="size-5" /> Daily quick play</button>
            <button onClick={selectRandomPack} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 font-semibold"><Dices className="size-5" /> Random pack</button>
          </div>
        </div>

        <div className="mt-8"><DuelQuiz key={`${selected.id}-${selected.questions[0]?.left.name}`} pack={selected} onComplete={markComplete} /></div>

        <section className="mt-14 border-t border-border pt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-[.25em] text-primary">Pack library</p><h2 className="mt-2 text-3xl font-bold">Master every category</h2><p className="mt-2 text-muted-foreground">Your best score is saved. Every replay shuffles the order and sides.</p></div>
            <div className="rounded-full border border-border bg-card px-4 py-2 text-sm"><strong className="text-primary">{Object.keys(completed).filter((id) => !id.startsWith('daily-duel-')).length}</strong>/{duelPacks.length} packs played</div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm transition ${category === item ? 'bg-primary font-semibold text-primary-foreground' : 'border border-border bg-card text-muted-foreground hover:text-foreground'}`}>{item}</button>)}</div>
            <label className="flex min-w-64 items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5"><Search className="size-4 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search packs" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" /></label>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((pack) => {
              const best = completed[pack.id]
              const active = selected.id === pack.id
              return <button key={pack.id} onClick={() => { setSelected(pack); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className={`group relative overflow-hidden rounded-3xl border p-6 text-left transition duration-300 hover:-translate-y-1 ${active ? 'border-primary bg-primary/10 ring-1 ring-primary/30' : 'border-border bg-card hover:border-primary/50'}`}>
                <div className="flex items-start justify-between gap-4"><span className="text-3xl">{pack.emoji}</span><div className="flex items-center gap-2">{typeof best === 'number' && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"><CheckCircle2 className="size-3.5" /> {best}/10</span>}<span className="rounded-full border border-border px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">{pack.difficulty}</span></div></div>
                <h3 className="mt-5 text-xl font-bold">{pack.title}</h3><p className="mt-2 min-h-12 text-sm leading-relaxed text-muted-foreground">{pack.description}</p>
                <div className="mt-5 flex items-center justify-between"><span className="text-xs text-muted-foreground">10 duels • {pack.category}</span><span className="text-sm font-semibold text-primary transition group-hover:translate-x-1">Play →</span></div>
              </button>
            })}
          </div>
        </section>
      </section>
    </main>
  )
}
