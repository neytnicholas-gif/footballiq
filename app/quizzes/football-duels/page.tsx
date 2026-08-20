'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Dices, LockKeyhole, Search, Sparkles, TimerReset, Trophy, X, Zap } from 'lucide-react'
import { DuelQuiz } from '@/components/duel-quiz'
import { QuizDifficultyPicker, useQuizDifficulty } from '@/components/quiz-difficulty-picker'
import { SiteHeader } from '@/components/site-header'
import {
  buildDailyDuelPack,
  coreDuelPacks,
  duelPacks,
  DUEL_CORE_PACKS_PER_THEME,
  DUEL_RESERVE_PACKS_PER_THEME,
  getDuelPackDifficulty,
  getDuelReserveNumber,
  getDuelThemeId,
  isDuelReservePack,
  reserveDuelPacks,
  type DuelCategory,
  type DuelPack,
} from '@/lib/duel-packs'
import { quizDifficulties, quizDifficultyMeta, type QuizDifficulty } from '@/lib/quiz-difficulty'
import { getDuelThemeProgress, hasCompletedDuelPack } from '@/lib/duel-progression'

const categories: Array<'All' | DuelCategory> = ['All', 'League', 'Europe', 'International', 'Trophies']
const corePackCounts = Object.fromEntries(quizDifficulties.map((difficulty) => [
  difficulty,
  coreDuelPacks.filter((pack) => getDuelPackDifficulty(pack.id) === difficulty).length,
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
  const [unlockNotice, setUnlockNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!ready) return
    const timeout = window.setTimeout(() => {
      const firstPack = coreDuelPacks.find((pack) => getDuelPackDifficulty(pack.id) === difficulty)
      setSelected(firstPack ?? coreDuelPacks[0]!)
      try {
        const stored = localStorage.getItem('footballiq-duel-completed')
        setCompleted(stored ? JSON.parse(stored) as Record<string, number> : {})
      } catch {
        setCompleted({})
      }
    })
    return () => window.clearTimeout(timeout)
  }, [difficulty, ready])

  const filteredCore = useMemo(() => coreDuelPacks.filter((pack) => {
    const categoryMatch = category === 'All' || pack.category === category
    const searchMatch = `${pack.title} ${pack.description} ${pack.category}`.toLowerCase().includes(search.trim().toLowerCase())
    return getDuelPackDifficulty(pack.id) === difficulty && categoryMatch && searchMatch
  }), [category, difficulty, search])
  const filteredReserve = useMemo(() => reserveDuelPacks.filter((pack) => {
    const categoryMatch = category === 'All' || pack.category === category
    const searchMatch = `${pack.title} ${pack.description} ${pack.category}`.toLowerCase().includes(search.trim().toLowerCase())
    return getDuelPackDifficulty(pack.id) === difficulty && categoryMatch && searchMatch
  }), [category, difficulty, search])

  const difficultyThemes = useMemo(() => {
    const seen = new Set<string>()
    return coreDuelPacks.filter((pack) => {
      const themeId = getDuelThemeId(pack.id)
      if (getDuelPackDifficulty(pack.id) !== difficulty || seen.has(themeId)) return false
      seen.add(themeId)
      return true
    })
  }, [difficulty])

  function markComplete(packId: string, score: number) {
    const themeId = getDuelThemeId(packId)
    const wasComplete = hasCompletedDuelPack(completed, packId)
    const coreBefore = getDuelThemeProgress(completed, themeId).coreCompleted
    const next = { ...completed, [packId]: Math.max(score, completed[packId] ?? 0) }
    setCompleted(next)
    if (!wasComplete && !isDuelReservePack(packId) && coreBefore === DUEL_CORE_PACKS_PER_THEME - 1) {
      const theme = coreDuelPacks.find((pack) => getDuelThemeId(pack.id) === themeId)
      setUnlockNotice(theme?.title ?? 'Your Extra Time packs')
    }
    try { localStorage.setItem('footballiq-duel-completed', JSON.stringify(next)) } catch {}
  }

  function chooseDifficulty(nextDifficulty: QuizDifficulty) {
    setDifficulty(nextDifficulty)
    const nextPack = coreDuelPacks.find((pack) => getDuelPackDifficulty(pack.id) === nextDifficulty)
    setSelected(nextPack ?? coreDuelPacks[0]!)
    setCategory('All')
    setSearch('')
    setUnlockNotice(null)
  }

  function choosePack(pack: DuelPack) {
    if (isDuelReservePack(pack.id) && !getDuelThemeProgress(completed, getDuelThemeId(pack.id)).reserveUnlocked) return
    setSelected(pack)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function selectRandomPack() {
    const unlocked = duelPacks.filter((pack) => {
      const categoryMatch = category === 'All' || pack.category === category
      const searchMatch = `${pack.title} ${pack.description} ${pack.category}`.toLowerCase().includes(search.trim().toLowerCase())
      const filterMatch = getDuelPackDifficulty(pack.id) === difficulty && categoryMatch && searchMatch
      return filterMatch && (!isDuelReservePack(pack.id) || getDuelThemeProgress(completed, getDuelThemeId(pack.id)).reserveUnlocked)
    })
    const options = unlocked.filter((pack) => pack.id !== selected?.id)
    const fallback = unlocked[0] ?? coreDuelPacks.find((pack) => getDuelPackDifficulty(pack.id) === difficulty) ?? coreDuelPacks[0]!
    choosePack(options[Math.floor(Math.random() * options.length)] ?? fallback)
  }

  function selectDailyPack() {
    setDifficulty('normal')
    setSelected(dailyPack())
    setCategory('All')
    setSearch('')
    setUnlockNotice(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function showTheme(pack: DuelPack) {
    setCategory(pack.category)
    setSearch(pack.title.split(' · ')[0] ?? pack.title)
    document.getElementById('duel-library')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const selectedDifficulty = selected ? getDuelPackDifficulty(selected.id) : difficulty
  const coreCompletedAtThisLevel = useMemo(() => coreDuelPacks.filter((pack) => (
    getDuelPackDifficulty(pack.id) === difficulty && hasCompletedDuelPack(completed, pack.id)
  )).length, [completed, difficulty])
  const reserveCompletedAtThisLevel = useMemo(() => reserveDuelPacks.filter((pack) => (
    getDuelPackDifficulty(pack.id) === difficulty && hasCompletedDuelPack(completed, pack.id)
  )).length, [completed, difficulty])

  const nextPack = useMemo(() => {
    if (!selected || selected.id.startsWith('daily-duel-')) return null
    const themeId = getDuelThemeId(selected.id)
    const coreRemaining = coreDuelPacks.find((pack) => (
      getDuelThemeId(pack.id) === themeId && pack.id !== selected.id && !hasCompletedDuelPack(completed, pack.id)
    ))
    if (coreRemaining) return coreRemaining
    if (!getDuelThemeProgress(completed, themeId).reserveUnlocked) return null
    return reserveDuelPacks.find((pack) => (
      getDuelThemeId(pack.id) === themeId && pack.id !== selected.id && !hasCompletedDuelPack(completed, pack.id)
    )) ?? null
  }, [completed, selected])

  return (
    <main className="min-h-screen bg-[#07111f] text-slate-100">
      <SiteHeader />
      <section className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-200"><Sparkles className="size-3.5" /> Football Duels</div>
            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">One stat. Two players. <span className="text-emerald-300">No time to overthink.</span></h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-300">Finish ten core packs in a stat theme to unlock its three Extra Time packs. Every reserve duel is a new match-up.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={selectDailyPack} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-6 font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-200"><Zap className="size-5" /> Daily quick play</button>
            <button type="button" onClick={selectRandomPack} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-900/70 px-6 font-bold text-white transition hover:border-slate-400 hover:bg-slate-800"><Dices className="size-5" /> Random unlocked pack</button>
          </div>
        </div>

        {unlockNotice && (
          <div role="status" aria-live="polite" className="relative mt-7 overflow-hidden rounded-3xl border border-amber-300/35 bg-[radial-gradient(circle_at_right,rgba(251,191,36,.2),transparent_45%),linear-gradient(120deg,rgba(16,185,129,.16),rgba(15,23,42,.92))] p-5 shadow-2xl sm:p-6">
            <button type="button" onClick={() => setUnlockNotice(null)} aria-label="Dismiss unlock message" className="absolute right-4 top-4 rounded-full border border-white/10 bg-slate-950/40 p-2 text-slate-300 hover:text-white"><X className="size-4" /></button>
            <div className="flex items-start gap-4 pr-10"><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-300 text-slate-950"><Trophy className="size-6" /></span><div><p className="text-xs font-black uppercase tracking-[.2em] text-amber-200">Extra Time unlocked</p><h2 className="mt-1 text-2xl font-black text-white">You mastered {unlockNotice}.</h2><p className="mt-1 text-sm leading-6 text-slate-300">Three new packs are waiting in the vault below. They use match-ups you have not played in this theme.</p></div></div>
          </div>
        )}

        <div className="mt-8"><QuizDifficultyPicker value={difficulty} onChange={chooseDifficulty} counts={corePackCounts} disabled={!ready} /></div>

        <div className="mt-6">
          {selected ? (
            <DuelQuiz key={`${selected.id}-${selectedDifficulty}`} pack={selected} difficulty={selectedDifficulty} onComplete={markComplete} nextPackLabel={nextPack?.title} onNextPack={nextPack ? () => choosePack(nextPack) : undefined} />
          ) : (
            <div role="status" className="rounded-[2rem] border border-slate-700 bg-slate-900/70 p-8 text-center sm:p-12"><div className="mx-auto size-10 animate-pulse rounded-2xl bg-emerald-300/20" /><p className="mt-4 font-semibold">Preparing your Football Duels…</p><p className="mt-1 text-sm text-slate-400">Matching questions to your chosen level.</p></div>
          )}
        </div>

        <section className="mt-12 rounded-[2rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.1),transparent_30rem),linear-gradient(145deg,rgba(15,23,42,.94),rgba(8,31,43,.96))] p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.22em] text-cyan-300">Your route to Extra Time</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">Master this level’s two stat themes</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">A pack counts as complete when you reach the result screen. Your best score stays saved on this device.</p></div><div className="rounded-2xl border border-slate-700 bg-slate-950/55 px-4 py-3 text-sm"><strong className="text-emerald-300">{coreCompletedAtThisLevel}</strong>/{corePackCounts[difficulty]} core <span className="mx-2 text-slate-600">•</span> <strong className="text-amber-200">{reserveCompletedAtThisLevel}</strong>/{difficultyThemes.length * DUEL_RESERVE_PACKS_PER_THEME} Extra Time</div></div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {difficultyThemes.map((pack) => {
              const themeId = getDuelThemeId(pack.id)
              const progress = getDuelThemeProgress(completed, themeId)
              const coreDone = progress.coreCompleted
              const reserveDone = progress.reserveCompleted
              const unlocked = progress.reserveUnlocked
              return <button key={themeId} type="button" onClick={() => showTheme(pack)} className="rounded-2xl border border-slate-700 bg-slate-950/45 p-5 text-left outline-none transition hover:-translate-y-0.5 hover:border-cyan-300/45 focus-visible:ring-2 focus-visible:ring-cyan-300"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="text-2xl" aria-hidden="true">{pack.emoji}</span><div><h3 className="font-black text-white">{pack.title}</h3><p className="mt-0.5 text-xs text-slate-400">{pack.statLabel}</p></div></div><span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${unlocked ? 'border-amber-300/30 bg-amber-300/10 text-amber-100' : 'border-slate-600 bg-slate-900 text-slate-300'}`}>{unlocked ? `${reserveDone}/3 Extra Time` : `${DUEL_CORE_PACKS_PER_THEME - coreDone} to unlock`}</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full transition-all duration-500 ${unlocked ? 'bg-amber-300' : 'bg-emerald-300'}`} style={{ width: `${coreDone / DUEL_CORE_PACKS_PER_THEME * 100}%` }} /></div><div className="mt-2 flex items-center justify-between text-xs"><span className="text-slate-400">{coreDone}/{DUEL_CORE_PACKS_PER_THEME} core packs</span><span className="font-bold text-cyan-200">View theme →</span></div></button>
            })}
          </div>
        </section>

        <section id="duel-library" className="mt-8 scroll-mt-24 rounded-[2rem] border border-slate-700 bg-slate-900/65 p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.22em] text-emerald-300">{quizDifficultyMeta[difficulty].label} core library</p><h2 className="mt-2 text-3xl font-black">Build your football memory</h2><p className="mt-2 text-slate-400">Ten core sets per theme. Every replay shuffles the question order and sides.</p></div><div className="rounded-full border border-slate-700 bg-slate-950/55 px-4 py-2 text-sm"><strong className="text-emerald-300">{coreCompletedAtThisLevel}</strong>/{corePackCounts[difficulty]} completed</div></div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`min-h-10 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${category === item ? 'bg-emerald-300 text-slate-950' : 'border border-slate-700 bg-slate-950/55 text-slate-300 hover:border-slate-500 hover:text-white'}`}>{item}</button>)}</div><label className="flex min-h-11 min-w-64 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/55 px-4 py-2.5 focus-within:border-cyan-300"><Search className="size-4 text-slate-400" /><span className="sr-only">Search Football Duel packs</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search packs or categories" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500" /></label></div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{filteredCore.map((pack) => <PackCard key={pack.id} pack={pack} best={completed[pack.id]} active={selected?.id === pack.id} locked={false} onChoose={() => choosePack(pack)} />)}</div>
          {!filteredCore.length && <div className="mt-6 rounded-2xl border border-dashed border-slate-600 bg-slate-950/45 p-8 text-center text-sm text-slate-400">No {quizDifficultyMeta[difficulty].label.toLowerCase()} core packs match those filters. Try another category or search.</div>}
        </section>

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-amber-300/20 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,.12),transparent_25rem),linear-gradient(145deg,rgba(15,23,42,.96),rgba(31,24,18,.88))] p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.22em] text-amber-200"><TimerReset className="size-4" /> Extra Time vault</p><h2 className="mt-2 text-3xl font-black text-white">Three reserve packs for every theme</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Complete all ten core packs in a theme once. Its three reserve packs then stay unlocked on this device.</p></div><span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-xs font-black text-amber-100">30 mastery packs</span></div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{filteredReserve.map((pack) => { const locked = !getDuelThemeProgress(completed, getDuelThemeId(pack.id)).reserveUnlocked; return <PackCard key={pack.id} pack={pack} best={completed[pack.id]} active={selected?.id === pack.id} locked={locked} onChoose={() => choosePack(pack)} /> })}</div>
          {!filteredReserve.length && <div className="mt-6 rounded-2xl border border-dashed border-amber-300/20 bg-slate-950/35 p-8 text-center text-sm text-slate-400">No Extra Time packs match those filters.</div>}
        </section>
      </section>
    </main>
  )
}

function PackCard({ pack, best, active, locked, onChoose }: { pack: DuelPack; best?: number; active: boolean; locked: boolean; onChoose: () => void }) {
  const reserveNumber = getDuelReserveNumber(pack.id)
  const packDifficulty = getDuelPackDifficulty(pack.id)
  return (
    <button type="button" disabled={locked} onClick={onChoose} aria-label={locked ? `${pack.title} is locked. Complete the ten core packs in this theme to unlock it.` : `Play ${pack.title}`} className={`group relative min-h-60 overflow-hidden rounded-3xl border p-6 text-left outline-none [contain-intrinsic-size:0_240px] [content-visibility:auto] transition duration-300 focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed ${locked ? 'border-slate-700/70 bg-slate-950/35 opacity-75' : active ? 'border-emerald-300/60 bg-emerald-300/10 ring-1 ring-emerald-300/25' : reserveNumber ? 'border-amber-300/25 bg-amber-300/[.06] hover:-translate-y-1 hover:border-amber-200/50' : 'border-slate-700 bg-slate-950/45 hover:-translate-y-1 hover:border-emerald-300/45'}`}>
      <div className="flex items-start justify-between gap-4"><span className="text-3xl" aria-hidden="true">{locked ? '🔒' : pack.emoji}</span><div className="flex flex-wrap items-center justify-end gap-2">{typeof best === 'number' && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-300/10 px-2.5 py-1 text-xs font-bold text-emerald-200"><CheckCircle2 className="size-3.5" /> {best}/10</span>}{reserveNumber ? <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-100">Extra Time {reserveNumber}</span> : <span className="rounded-full border border-slate-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{quizDifficultyMeta[packDifficulty].xpMultiplier}× XP</span>}</div></div>
      <h3 className="mt-5 text-xl font-black text-white">{pack.title}</h3><p className="mt-2 min-h-12 text-sm leading-relaxed text-slate-400">{locked ? `Finish all ${DUEL_CORE_PACKS_PER_THEME} core ${pack.title.split(' · ')[0]} packs to open this reserve set.` : pack.description}</p>
      <div className="mt-5 flex items-center justify-between"><span className="text-xs text-slate-500">10 new duels • {pack.category}</span><span className={`text-sm font-bold transition ${locked ? 'inline-flex items-center gap-1 text-slate-500' : reserveNumber ? 'text-amber-200 group-hover:translate-x-1' : 'text-emerald-300 group-hover:translate-x-1'}`}>{locked ? <><LockKeyhole className="size-3.5" /> Locked</> : 'Play →'}</span></div>
    </button>
  )
}
