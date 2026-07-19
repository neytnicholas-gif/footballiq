'use client'

import { useState } from 'react'
import { SiteHeader } from '@/components/site-header'
import { DuelQuiz } from '@/components/duel-quiz'
import { duelPacks } from '@/lib/duel-packs'

export default function FootballDuelsPage() {
  const [selectedId, setSelectedId] = useState(duelPacks[0].id)
  const selected = duelPacks.find((p) => p.id === selectedId) ?? duelPacks[0]
  return <main className="min-h-screen bg-background"><SiteHeader /><section className="mx-auto max-w-7xl px-4 py-12 sm:px-6"><p className="text-sm uppercase tracking-widest text-primary">Football Duels</p><h1 className="mt-3 text-4xl font-semibold">Pick a quiz pack</h1><div className="mt-7 flex gap-3 overflow-x-auto pb-3">{duelPacks.map((pack) => <button key={pack.id} onClick={() => setSelectedId(pack.id)} className={`whitespace-nowrap rounded-xl border px-4 py-3 text-sm ${pack.id === selectedId ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'}`}>{pack.title}</button>)}</div><div className="mt-5"><DuelQuiz key={selected.id} pack={selected} /></div><p className="mt-4 text-xs text-muted-foreground">Statistics are scoped to the competition named in each pack. Review the supplied starter dataset before large-scale public launch.</p></section></main>
}
