'use client'

import { useState } from 'react'
import { whoAmIQuestions } from '@/lib/game-data'
import { useAuth } from '@/components/auth-provider'
import { buildCompletionKey, saveQuizResult } from '@/lib/quiz-save'

export function WhoAmIGame() {
  const { user, refreshProfile } = useAuth()
  const [index, setIndex] = useState(0)
  const [clues, setClues] = useState(1)
  const [guess, setGuess] = useState('')
  const [score, setScore] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [runKey] = useState(0)
  const q = whoAmIQuestions[index]
  const last = index === whoAmIQuestions.length - 1

  function submit() {
    if (revealed || !guess.trim()) return
    const ok = guess.trim().toLowerCase() === q.answer.toLowerCase()
    if (ok) setScore((s) => s + (5 - clues))
    setRevealed(true)
  }
  function next() { setIndex((i) => i + 1); setClues(1); setGuess(''); setRevealed(false) }
  async function save() {
    if (!user || saved || saving) return
    setSaving(true)
    setSaveError('')
    const { error } = await saveQuizResult({
      quizId: 'who-am-i-1',
      score,
      total: whoAmIQuestions.length,
      xp: 20 + score * 3,
      completionKey: buildCompletionKey('who-am-i-1', runKey),
    })
    if (!error) {
      setSaved(true)
      await refreshProfile()
    } else {
      setSaveError(error.message ?? 'Could not save this result.')
    }
    setSaving(false)
  }

  return <div className="rounded-3xl border border-border bg-card p-6 sm:p-8"><div className="flex justify-between"><p className="text-sm text-muted-foreground">Player {index + 1} of {whoAmIQuestions.length}</p><p className="font-semibold text-primary">{score} points</p></div><div className="mt-6 space-y-3">{q.clues.slice(0, clues).map((c, i) => <div key={c} className="rounded-2xl border border-border bg-background p-4"><span className="mr-3 text-primary">Clue {i + 1}</span>{c}</div>)}</div>{!revealed && <><div className="mt-5 flex gap-3"><input aria-label="Player name guess" name="player-name-guess" autoComplete="off" value={guess} onChange={(e) => setGuess(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="Type the player name" className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"/><button type="button" onClick={submit} className="rounded-xl bg-primary px-5 py-3 text-primary-foreground">Guess</button></div>{clues < 4 && <button type="button" onClick={() => setClues((c) => c + 1)} className="mt-3 text-sm text-primary">Reveal another clue (-1 point)</button>}</>}{revealed && <div className="mt-6 rounded-2xl bg-secondary/40 p-5"><p className="text-sm text-muted-foreground">Answer</p><h2 className="mt-1 text-3xl font-semibold">{q.answer}</h2><div className="mt-4">{!last ? <button type="button" onClick={next} className="rounded-xl bg-primary px-5 py-3 text-primary-foreground">Next player</button> : <button type="button" onClick={() => void save()} disabled={!user || saved || saving} className="rounded-xl bg-primary px-5 py-3 text-primary-foreground disabled:opacity-50">{!user ? 'Sign in to save' : saved ? 'Saved' : saving ? 'Saving…' : 'Finish and save XP'}</button>}</div>{last && (saveError ? <p className="mt-3 text-sm text-destructive">{saveError}</p> : <p className="mt-3 text-sm text-muted-foreground">{!user ? 'Result shown locally. Sign in to save XP and progression.' : saved ? 'XP and progression saved.' : saving ? 'Saving result…' : 'Save this run to persist progression.'}</p>)}</div>}</div>

}
