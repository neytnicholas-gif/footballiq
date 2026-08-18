'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, BookOpenCheck, Globe2, Search, ShieldCheck, Users } from 'lucide-react'
import { ChoiceQuiz } from '@/components/choice-quiz'
import { QuizDifficultyPicker, useQuizDifficulty } from '@/components/quiz-difficulty-picker'
import { footballLeagues, getLeagueWorldQuestions } from '@/lib/football-leagues'
import { quizDifficulties, type QuizDifficulty } from '@/lib/quiz-difficulty'

const regions = ['All', 'UEFA', 'CONCACAF', 'CONMEBOL', 'AFC'] as const

export function LeagueWorld() {
  const { difficulty, setDifficulty, ready } = useQuizDifficulty('league-world')
  const [selectedKey, setSelectedKey] = useState('premier-league')
  const [region, setRegion] = useState<(typeof regions)[number]>('All')
  const [search, setSearch] = useState('')
  const selected = footballLeagues.find((league) => league.key === selectedKey) ?? footballLeagues[0]!
  const allQuestions = useMemo(() => getLeagueWorldQuestions(selected.key), [selected.key])
  const difficultyNumber = quizDifficulties.indexOf(difficulty)
  const questionIndexes = useMemo(() => Array.from({ length: 5 }, (_, offset) => difficultyNumber * 5 + offset), [difficultyNumber])
  const questions = useMemo(() => questionIndexes.map((questionIndex) => allQuestions[questionIndex]!), [allQuestions, questionIndexes])
  const difficultyCounts = useMemo(() => Object.fromEntries(quizDifficulties.map((level) => [level, 5])) as Record<QuizDifficulty, number>, [])
  const filtered = useMemo(() => footballLeagues.filter((league) => {
    const regionMatch = region === 'All' || league.confederation === region
    const query = search.trim().toLowerCase()
    const searchMatch = !query || `${league.name} ${league.country}`.toLowerCase().includes(query)
    return regionMatch && searchMatch
  }), [region, search])

  return (
    <div className="space-y-8">
      <section id="play-league" className="overflow-hidden rounded-[1.75rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.18),transparent_36%),linear-gradient(145deg,#071827,#0b2235)] p-5 shadow-xl sm:p-7">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">Now playing</p>
            <h2 className="mt-2 text-3xl font-black text-white">{selected.name}</h2>
            <p className="mt-2 text-sm text-slate-300">Choose a level and answer five focused questions. Play every level to master all 25 clues.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200"><span className="rounded-md bg-cyan-300 px-2 py-1 text-slate-950">{selected.countryCode}</span>{selected.country} · Tier {selected.tier}</span>
        </div>
        {ready ? <div className="space-y-5"><QuizDifficultyPicker value={difficulty} onChange={setDifficulty} counts={difficultyCounts} /><ChoiceQuiz key={`${selected.key}:${difficulty}`} quizId={`league-world-${selected.key}`} title={`${selected.shortName} room`} items={questions} labels={{ nextAction: 'Next question', finishAction: 'Finish and save XP', restartAction: 'Play this room again' }} difficulty={difficulty} answerProof={(answers) => ({ kind: 'choice', answers, questionIndexes, difficulty })} /></div> : <div className="min-h-64 rounded-3xl border border-white/10 bg-slate-900/60" />}
      </section>

      <section className="rounded-[1.75rem] border border-slate-700/70 bg-slate-900/60 p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-emerald-300"><Globe2 className="size-4" /> 24 league rooms</p>
            <h2 className="mt-2 text-3xl font-black text-white">Pick your football world.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">England has all four nationwide divisions. Europe, the Americas, Asia and Australia are here too. Quiz coverage does not change the three-league Player Market.</p>
          </div>
          <Link href="/quizzes/leagues" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-emerald-200"><Users className="size-4" /> Make a quiz league <ArrowRight className="size-4" /></Link>
        </div>

        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filter by football region">
            {regions.map((item) => <button key={item} type="button" onClick={() => setRegion(item)} className={`min-h-10 whitespace-nowrap rounded-full px-4 text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-300 ${region === item ? 'bg-cyan-300 text-slate-950' : 'border border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500'}`}>{item === 'All' ? 'Every region' : item}</button>)}
          </div>
          <label className="flex min-h-11 min-w-64 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-4 text-slate-300 focus-within:border-cyan-300/60"><Search className="size-4" /><span className="sr-only">Search league rooms</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search a league or country" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500" /></label>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((league) => {
            const active = league.key === selected.key
            return <button key={league.key} type="button" onClick={() => { setSelectedKey(league.key); document.getElementById('play-league')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} className={`group min-h-40 rounded-2xl border p-4 text-left outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-cyan-300 ${active ? 'border-cyan-300/70 bg-cyan-300/10 shadow-[0_16px_50px_-35px_rgba(34,211,238,.8)]' : 'border-slate-700/80 bg-slate-950/55 hover:border-slate-500'}`}>
              <div className="flex items-start justify-between gap-3"><span className="rounded-lg bg-white/8 px-2 py-1 text-xs font-black text-slate-200">{league.countryCode}</span>{active ? <ShieldCheck className="size-5 text-cyan-300" /> : <BookOpenCheck className="size-5 text-slate-500 transition group-hover:text-cyan-300" />}</div>
              <h3 className="mt-4 text-lg font-black text-white">{league.name}</h3>
              <p className="mt-1 text-xs text-slate-400">{league.country} · {league.tier === 1 ? 'Top division' : `Tier ${league.tier}`}</p>
              <p className="mt-3 text-xs font-bold text-cyan-300">{active ? 'Playing now' : 'Open 25 questions'} →</p>
            </button>
          })}
        </div>
        {!filtered.length ? <div className="mt-5 rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">No league matches that search. Try the country name.</div> : null}
      </section>
    </div>
  )
}
