'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Search } from 'lucide-react'
import { DuelQuiz } from '@/components/duel-quiz'
import { duelPacks, type DuelCategory, type DuelPack } from '@/lib/duel-packs'

const categories: Array<'All' | DuelCategory> = ['All', 'League', 'Europe', 'International', 'Trophies']

export function DuelHub() {
  const [selected, setSelected] = useState<DuelPack>(duelPacks[0])
  const [category, setCategory] = useState<'All' | DuelCategory>('All')
  const [search, setSearch] = useState('')
  const [completed, setCompleted] = useState<Record<string, number>>({})

  const filtered = useMemo(() => {
    return duelPacks.filter((pack) => {
      const categoryMatch = category === 'All' || pack.category === category
      const query = `${pack.title} ${pack.description}`.toLowerCase()
      return categoryMatch && query.includes(search.toLowerCase())
    })
  }, [category, search])

  function markComplete(packId: string, score: number) {
    setCompleted((current) => ({ ...current, [packId]: Math.max(score, current[packId] ?? 0) }))
  }

  return (
    <div className="space-y-6">
      <DuelQuiz key={selected.id} pack={selected} onComplete={markComplete} />

      <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Pack library</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">Choose your stat battle</h2>
            <p className="mt-1 text-sm text-muted-foreground">Every pack contains 10 questions with shuffled order.</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Completed packs: <strong className="text-foreground">{Object.keys(completed).length}</strong>/{duelPacks.length}
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`rounded-full px-4 py-2 text-sm ${category === item ? 'bg-primary font-semibold text-primary-foreground' : 'border border-border bg-background text-muted-foreground'}`}
              >
                {item}
              </button>
            ))}
          </div>

          <label className="flex min-w-64 items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search packs"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((pack) => {
            const isActive = selected.id === pack.id
            const best = completed[pack.id]
            return (
              <button
                key={pack.id}
                type="button"
                onClick={() => setSelected(pack)}
                className={`rounded-2xl border p-4 text-left transition ${isActive ? 'border-primary bg-primary/10' : 'border-border bg-background hover:border-primary/40'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-2xl">{pack.emoji}</span>
                  {typeof best === 'number' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      <CheckCircle2 className="size-3.5" /> {best}/10
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-3 text-lg font-semibold tracking-tight">{pack.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{pack.description}</p>
                <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">
                  {pack.category} • {pack.difficulty}
                </p>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
