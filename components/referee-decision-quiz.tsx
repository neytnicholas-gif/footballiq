'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BadgeCheck, Flame, RotateCcw, ShieldCheck, Trophy, X } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { formatDayCount } from '@/lib/player-metrics'
import { getRankProgress } from '@/lib/progression'
import { saveQuizResult } from '@/lib/quiz-save'
import { cn } from '@/lib/utils'

type Scenario = {
  id: number
  category: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  title: string
  situation: string
  options: string[]
  answer: string
  explanation: string
  restart: string
  sanction: string
  ifab: string
}

const scenarios: Scenario[] = [
  {
    id: 1,
    category: 'Goalkeeper handling',
    difficulty: 'Easy',
    title: 'Goalkeeper handles a deliberate pass',
    situation:
      'A defender deliberately kicks the ball back to his goalkeeper. The goalkeeper picks it up inside the penalty area.',
    options: ['Play on', 'Indirect free kick', 'Direct free kick', 'Dropped ball'],
    answer: 'Indirect free kick',
    explanation:
      'The goalkeeper cannot handle a ball deliberately kicked to him by a teammate. This is a technical offense by the goalkeeper.',
    restart: 'Indirect free kick to the opponents from where the goalkeeper handled (goal-area positioning exception applies).',
    sanction: 'No card unless it also delays a restart or shows unsporting behavior.',
    ifab: 'Law 12: goalkeeper handling restrictions for deliberate kick from a teammate.',
  },
  {
    id: 2,
    category: 'SPA',
    difficulty: 'Easy',
    title: 'Stopping a promising attack',
    situation:
      'An attacker breaks through midfield with two teammates ahead. A defender pulls his shirt and stops the attack before he can release the pass.',
    options: ['No card', 'Yellow card', 'Red card', 'Second whistle only'],
    answer: 'Yellow card',
    explanation:
      'The tactical hold breaks up a promising attack without meeting all DOGSO criteria. This is unsporting behavior (SPA).',
    restart: 'Direct free kick to attackers from the foul location.',
    sanction: 'Caution (yellow card) for SPA.',
    ifab: 'Law 12: unsporting behavior includes stopping a promising attack by a foul.',
  },
  {
    id: 3,
    category: 'Simulation',
    difficulty: 'Easy',
    title: 'Attacker exaggerates no-contact challenge',
    situation:
      'Inside the penalty area, an attacker throws himself to ground with no contact while appealing loudly for a penalty.',
    options: ['Award penalty', 'Play on only', 'Indirect free kick + yellow to attacker', 'Dropped ball'],
    answer: 'Indirect free kick + yellow to attacker',
    explanation:
      'Attempting to deceive the referee by feigning contact is simulation and a cautionable act.',
    restart: 'Indirect free kick to the defending team from where simulation occurred.',
    sanction: 'Caution (yellow card) to attacker for unsporting behavior (attempt to deceive).',
    ifab: 'Law 12: simulation/attempt to deceive is cautionable and punished with an IFK.',
  },
  {
    id: 4,
    category: 'Handball',
    difficulty: 'Medium',
    title: 'Arm above shoulder blocks cross',
    situation:
      'A defender jumps to block a cross. The ball hits his raised arm clearly above shoulder height, making the body unnaturally bigger.',
    options: ['No handball because ball was crossed', 'Handball: direct free kick', 'Indirect free kick only', 'Dropped ball'],
    answer: 'Handball: direct free kick',
    explanation:
      'An arm above shoulder level that makes the body unnaturally bigger is normally punishable handball unless a specific exemption applies.',
    restart: 'Direct free kick (or penalty if in defender’s own penalty area).',
    sanction: 'Usually no card unless handball is tactical SPA/DOGSO or clearly unsporting.',
    ifab: 'Law 12 handball interpretation: unnaturally bigger body with high arm position.',
  },
  {
    id: 5,
    category: 'Reckless challenge',
    difficulty: 'Medium',
    title: 'Late slide, clear contact, no brutality',
    situation:
      'A defender arrives late and slides through an opponent’s ankle with moderate force, missing the ball.',
    options: ['No foul', 'Direct free kick only', 'Direct free kick + yellow', 'Direct free kick + red'],
    answer: 'Direct free kick + yellow',
    explanation:
      'The challenge is careless-to-reckless with disregard for opponent safety, but not excessive force.',
    restart: 'Direct free kick to the fouled team.',
    sanction: 'Caution (yellow card) for a reckless challenge.',
    ifab: 'Law 12: reckless = caution; excessive force = send-off.',
  },
  {
    id: 6,
    category: 'Advantage',
    difficulty: 'Medium',
    title: 'Advantage with later caution',
    situation:
      'A midfielder is tripped in transition, but the ball runs to his teammate who now attacks 3v2 into open space.',
    options: ['Stop immediately and book now', 'Play advantage, caution at next stoppage', 'Dropped ball', 'Play on with no misconduct'],
    answer: 'Play advantage, caution at next stoppage',
    explanation:
      'Advantage can be applied when there is a clear tactical benefit, while disciplinary action for the original foul is still taken later.',
    restart: 'No immediate restart because advantage is played; restart depends on next natural stoppage.',
    sanction: 'Caution at next stoppage if original foul was SPA/reckless.',
    ifab: 'Law 5 and Law 12: advantage plus delayed disciplinary sanction.',
  },
  {
    id: 7,
    category: 'DOGSO',
    difficulty: 'Medium',
    title: 'Penalty plus card decision',
    situation:
      'A striker is one-on-one with the goalkeeper inside the penalty area. A defender makes no attempt to play the ball and pulls him down from behind.',
    options: ['Penalty only', 'Penalty + yellow', 'Penalty + red', 'Indirect free kick + yellow'],
    answer: 'Penalty + red',
    explanation:
      'Inside the penalty area, DOGSO remains a send-off when there is no genuine attempt to play the ball.',
    restart: 'Penalty kick.',
    sanction: 'Send-off (red card) for DOGSO with no attempt to play the ball.',
    ifab: 'Law 12 DOGSO “double jeopardy” exception does not apply when no ball-playing attempt exists.',
  },
  {
    id: 8,
    category: 'Offside involvement',
    difficulty: 'Hard',
    title: 'Offside player blocks goalkeeper vision',
    situation:
      'At a free kick, an attacker in an offside position stands in front of the goalkeeper and clearly blocks line of sight as a teammate scores from distance.',
    options: ['Goal stands', 'Indirect free kick for offside interference', 'Retake free kick', 'Penalty to defenders'],
    answer: 'Indirect free kick for offside interference',
    explanation:
      'An offside-positioned player who interferes with an opponent by obstructing vision commits an offside offense.',
    restart: 'Indirect free kick to defending team from offside offense location.',
    sanction: 'No card by default.',
    ifab: 'Law 11: interfering with an opponent includes impacting ability to play/see the ball.',
  },
  {
    id: 9,
    category: 'Dissent',
    difficulty: 'Hard',
    title: 'Public protest after caution',
    situation:
      'After being cautioned, a player aggressively applauds the referee, shouts dissenting remarks, and refuses to retreat for the restart.',
    options: ['Verbal warning only', 'Second yellow then red', 'Straight red for violent conduct', 'No action'],
    answer: 'Second yellow then red',
    explanation:
      'Persistent and demonstrative dissent after an initial caution is another cautionable offense, which leads to a second yellow and send-off.',
    restart: 'Restart remains according to original stoppage (for example, free kick).',
    sanction: 'Second caution followed by red card.',
    ifab: 'Law 12: dissent by word/action is cautionable; second caution requires send-off.',
  },
  {
    id: 10,
    category: 'Delaying restart',
    difficulty: 'Hard',
    title: 'Kicking ball away after whistle',
    situation:
      'Defenders concede a free kick near halfway. One defender, frustrated, boots the ball 30 meters away to stop a quick restart.',
    options: ['No card, just ask for ball', 'Yellow card for delaying restart', 'Red card', 'Indirect free kick'],
    answer: 'Yellow card for delaying restart',
    explanation:
      'Deliberately delaying the restart by kicking the ball away is a standard caution.',
    restart: 'Original free kick to attacking team.',
    sanction: 'Caution (yellow card) for delaying the restart of play.',
    ifab: 'Law 12: delaying restart is cautionable unsporting behavior.',
  },
  {
    id: 11,
    category: 'Serious foul play',
    difficulty: 'Hard',
    title: 'Studs high with excessive force',
    situation:
      'A player lunges with straight leg and exposed studs, making forceful contact above the opponent’s ankle while contesting the ball.',
    options: ['Direct free kick only', 'Direct free kick + yellow', 'Direct free kick + red for SFP', 'Indirect free kick'],
    answer: 'Direct free kick + red for SFP',
    explanation:
      'The challenge endangers opponent safety with excessive force while challenging for the ball: serious foul play.',
    restart: 'Direct free kick (or penalty if by defender inside own penalty area).',
    sanction: 'Send-off (red card) for serious foul play.',
    ifab: 'Law 12: serious foul play = challenge for ball using excessive force/endangering safety.',
  },
  {
    id: 12,
    category: 'Violent conduct',
    difficulty: 'Hard',
    title: 'Off-the-ball strike during stoppage',
    situation:
      'Play is stopped for a throw-in. Away from the ball, one player strikes an opponent in the chest with force.',
    options: ['Yellow to both players', 'Red for violent conduct', 'Dropped ball and warning', 'No action if ball not in play'],
    answer: 'Red for violent conduct',
    explanation:
      'Using or attempting excessive force/ brutality against an opponent when not challenging for the ball is violent conduct.',
    restart: 'Because ball was out for throw-in, restart is still the original throw-in.',
    sanction: 'Send-off (red card) for violent conduct.',
    ifab: 'Law 12: violent conduct applies whether ball is in or out of play.',
  },
  {
    id: 13,
    category: 'DOGSO outside area',
    difficulty: 'Hard',
    title: 'Last defender clips attacker outside penalty area',
    situation:
      'An attacker takes a heavy touch beyond the last defender just outside the penalty area. The defender clips his heel and brings him down with no covering defenders.',
    options: ['Direct free kick only', 'Direct free kick + yellow for SPA', 'Direct free kick + red for DOGSO', 'Indirect free kick + red'],
    answer: 'Direct free kick + red for DOGSO',
    explanation:
      'All DOGSO criteria are present (distance, direction, likelihood of control, and defenders). Outside the area there is no double-jeopardy mitigation.',
    restart: 'Direct free kick from foul location.',
    sanction: 'Send-off (red card) for DOGSO.',
    ifab: 'Law 12 DOGSO criteria and disciplinary consequences.',
  },
  {
    id: 14,
    category: 'Second-yellow management',
    difficulty: 'Hard',
    title: 'Advantage after cautionable tactical foul by already-booked player',
    situation:
      'A player already on a yellow shirt-pulls to stop transition, but the attack continues with clear advantage and then ends with a shot over.',
    options: ['No card because advantage was played', 'Second yellow at next stoppage', 'Straight red at next stoppage', 'Only team warning'],
    answer: 'Second yellow at next stoppage',
    explanation:
      'Playing advantage does not cancel misconduct. If the foul is cautionable and the player is already booked, the second caution is still shown at next stoppage.',
    restart: 'Restart follows the natural stoppage that ended advantage (goal kick in this case).',
    sanction: 'Second caution, then red card.',
    ifab: 'Law 5 advantage and Law 12 disciplinary consequences remain in force.',
  },
  {
    id: 15,
    category: 'VAR protocol',
    difficulty: 'Hard',
    title: 'Post-goal review finds attacker handball in APP',
    situation:
      'A goal is scored. During the check, VAR identifies that the scorer controlled the ball with hand immediately before finishing.',
    options: ['Goal stands because handball was accidental', 'Disallow goal and restart with direct free kick to defenders', 'Retake kickoff', 'Dropped ball to goalkeeper'],
    answer: 'Disallow goal and restart with direct free kick to defenders',
    explanation:
      'A goal cannot be awarded if the scoring player commits handball immediately before scoring, even if accidental.',
    restart: 'Direct free kick to defending team from handball offense spot (or penalty if applicable, though here it is attacking handball).',
    sanction: 'Usually no card unless handball was tactical/unsporting beyond the scoring offense.',
    ifab: 'Law 12 attacking handball offense and VAR protocol for reviewing goal incidents in the APP.',
  },
]

export const REFEREE_ARENA_SCENARIO_COUNT = scenarios.length

function calculateRefereeXp(score: number, total: number, bestStreak: number) {
  const perfect = score === total
  const accuracyBonus = Math.round((score / total) * 35)
  const streakBonus = Math.min(bestStreak, 6) * 4
  return 20 + score * 10 + accuracyBonus + streakBonus + (perfect ? 50 : 0)
}

function getLevel(rating: number) {
  if (rating >= 1250) return 'Professional Referee'
  if (rating >= 1150) return 'National Referee'
  if (rating >= 1060) return 'Regional Referee'
  return 'Grassroots Referee'
}

export function RefereeDecisionQuiz() {
  const { user, profile, refreshProfile } = useAuth()
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [finished, setFinished] = useState(false)
  const [rating, setRating] = useState(1000)
  const [correct, setCorrect] = useState(0)
  const [played, setPlayed] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [categoryTotals, setCategoryTotals] = useState<Record<string, { total: number; correct: number }>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [animatedXp, setAnimatedXp] = useState(0)
  const [animatedRatingDelta, setAnimatedRatingDelta] = useState(0)
  const [runStartXp, setRunStartXp] = useState<number | null>(null)

  const scenario = scenarios[index]
  const isCorrect = selected === scenario.answer
  const level = useMemo(() => getLevel(rating), [rating])
  const accuracy = played === 0 ? 0 : Math.round((correct / played) * 100)
  const progress = Math.round(((index + (answered ? 1 : 0)) / scenarios.length) * 100)
  const runComplete = index === scenarios.length - 1 && answered
  const ratingDelta = rating - 1000
  const xpEarned = useMemo(() => calculateRefereeXp(correct, scenarios.length, bestStreak), [correct, bestStreak])
  const accountXp = profile?.xp ?? 0
  const projectedRank = useMemo(() => getRankProgress(accountXp + xpEarned), [accountXp, xpEarned])
  const beforeRank = useMemo(() => getRankProgress(runStartXp ?? accountXp).current, [runStartXp, accountXp])
  const bestCategory = useMemo(() => {
    const entries = Object.entries(categoryTotals)
    if (entries.length === 0) return null
    entries.sort((a, b) => {
      const aAcc = a[1].total === 0 ? 0 : a[1].correct / a[1].total
      const bAcc = b[1].total === 0 ? 0 : b[1].correct / b[1].total
      if (bAcc !== aAcc) return bAcc - aAcc
      if (b[1].correct !== a[1].correct) return b[1].correct - a[1].correct
      return b[1].total - a[1].total
    })
    const [name, stat] = entries[0]
    return {
      name,
      accuracy: stat.total === 0 ? 0 : Math.round((stat.correct / stat.total) * 100),
      correct: stat.correct,
      total: stat.total,
    }
  }, [categoryTotals])

  useEffect(() => {
    if (!finished) return
    if (runStartXp === null) {
      setRunStartXp(accountXp)
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) {
      setAnimatedXp(xpEarned)
      setAnimatedRatingDelta(ratingDelta)
      return
    }
    let frame = 0
    const startedAt = performance.now()
    const duration = 850
    const animate = (now: number) => {
      const elapsed = now - startedAt
      const t = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setAnimatedXp(Math.round(xpEarned * eased))
      setAnimatedRatingDelta(Math.round(ratingDelta * eased))
      if (t < 1) {
        frame = window.requestAnimationFrame(animate)
      }
    }
    frame = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(frame)
  }, [finished, xpEarned, ratingDelta, accountXp, runStartXp])

  useEffect(() => {
    if (!finished || !user || saved || saving) return
    let mounted = true
    const persist = async () => {
      setSaving(true)
      setSaveError('')
      const { error } = await saveQuizResult({
        quizId: 'referee-arena',
        score: correct,
        total: scenarios.length,
        xp: xpEarned,
      })
      if (!mounted) return
      if (error) {
        setSaveError(error.message || 'Result could not be saved right now.')
      } else {
        setSaved(true)
        await refreshProfile()
      }
      if (mounted) {
        setSaving(false)
      }
    }
    void persist()
    return () => {
      mounted = false
    }
  }, [finished, user, saved, saving, correct, xpEarned, refreshProfile])

  function choose(option: string) {
    if (answered) return
    const right = option === scenario.answer
    setSelected(option)
    setAnswered(true)
    setPlayed((current) => current + 1)
    setCategoryTotals((current) => {
      const row = current[scenario.category] ?? { total: 0, correct: 0 }
      return {
        ...current,
        [scenario.category]: {
          total: row.total + 1,
          correct: row.correct + (right ? 1 : 0),
        },
      }
    })
    if (right) {
      setCorrect((current) => current + 1)
      setRating((current) => current + 14)
      setStreak((current) => {
        const next = current + 1
        setBestStreak((best) => Math.max(best, next))
        return next
      })
    } else {
      setRating((current) => Math.max(700, current - 8))
      setStreak(0)
    }
  }

  function next() {
    if (index < scenarios.length - 1) {
      setIndex((current) => current + 1)
      setSelected(null)
      setAnswered(false)
    }
  }

  function restart() {
    setIndex(0)
    setSelected(null)
    setAnswered(false)
    setFinished(false)
    setRating(1000)
    setCorrect(0)
    setPlayed(0)
    setStreak(0)
    setBestStreak(0)
    setCategoryTotals({})
    setSaving(false)
    setSaved(false)
    setSaveError('')
    setAnimatedXp(0)
    setAnimatedRatingDelta(0)
    setRunStartXp(null)
  }

  if (finished) {
    const latestXp = profile?.xp ?? accountXp
    const latestRank = getRankProgress(latestXp)
    const leveledUp = saved && latestRank.current.minXp > beforeRank.minXp

    return (
      <section id="referee" className="relative mx-auto max-w-6xl px-1 py-0 sm:px-2">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_360px]">
          <div className="overflow-hidden rounded-[32px] border border-amber-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(247,212,75,0.16),_transparent_30%),linear-gradient(135deg,_rgba(7,9,18,0.98),_rgba(16,24,42,0.95))] shadow-[0_25px_80px_-36px_rgba(247,212,75,0.55)]">
            <div className="border-b border-white/10 bg-black/20 p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">Referee Arena complete</p>
              <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white">Final report</h3>
              <p className="mt-3 text-white/70">You completed all {scenarios.length} incidents. Keep decisions consistent and protect momentum.</p>
            </div>

            <div className="p-6 sm:p-8">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <ResultTile label="Score" value={`${correct}/${scenarios.length}`} />
                <ResultTile label="Accuracy" value={`${accuracy}%`} />
                <ResultTile label="XP earned" value={`+${animatedXp}`} highlight />
                <ResultTile label="Rating delta" value={`${animatedRatingDelta >= 0 ? '+' : ''}${animatedRatingDelta}`} />
              </div>

              <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-white/60">Current FootballIQ level</p>
                    <p className="mt-1 text-xl font-semibold text-white">{projectedRank.current.emoji} {projectedRank.current.title}</p>
                  </div>
                  <p className="text-sm text-white/70">{projectedRank.next ? `${projectedRank.remaining} XP to ${projectedRank.next.title}` : 'Maximum rank reached'}</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 transition-all duration-700" style={{ width: `${projectedRank.percent}%` }} />
                </div>
                <p className="mt-3 text-sm text-white/70">Current XP: {latestXp.toLocaleString()} • Streak peak this run: {formatDayCount(bestStreak)}</p>
                {bestCategory ? (
                  <p className="mt-1 text-sm text-white/70">Best category: <strong className="text-white">{bestCategory.name}</strong> ({bestCategory.correct}/{bestCategory.total}, {bestCategory.accuracy}%)</p>
                ) : null}
                <p className="mt-1 text-sm text-white/70">Rating breakdown: starts at 1000, +14 for each correct decision, -8 for each incorrect decision.</p>
              </div>

              {leveledUp ? (
                <div className="mt-4 rounded-2xl border border-primary/45 bg-primary/12 px-4 py-3 text-sm font-medium text-primary">
                  Level up confirmed: {beforeRank.title} {'->'} {latestRank.current.title}
                </div>
              ) : null}

              <p className="mt-4 text-sm text-white/70">
                {!user
                  ? 'Sign in to save this run to profile XP, streaks and leaderboards.'
                  : saving
                    ? 'Saving your result...'
                    : saved
                      ? 'Result saved successfully. Profile progression updated.'
                      : saveError
                        ? `Save failed: ${saveError}`
                        : 'Result not saved yet.'}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/daily" className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">
                  Protect today&apos;s streak
                </Link>
                <Button onClick={restart} variant="outline" className="rounded-xl border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
                  <RotateCcw className="size-4" /> Replay Referee Arena
                </Button>
                <Link href="/profile#ratings" className="inline-flex items-center justify-center rounded-xl border border-white/20 px-5 py-3 font-semibold text-white/90 hover:bg-white/10">
                  View profile ratings
                </Link>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-black/20 p-6 backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <ShieldCheck className="size-5" />
                </span>
                <div>
                  <p className="text-sm text-white/60">Current level</p>
                  <p className="font-semibold tracking-tight text-white">{level}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[28px] border border-primary/30 bg-primary/10 p-6">
              <Trophy className="size-6 text-primary" />
              <h3 className="mt-3 font-semibold tracking-tight text-white">Next sharp action</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Take the daily challenge now to protect your streak and turn this run into sustained progression.
              </p>
            </div>
          </aside>
        </div>
      </section>
    )
  }

  return (
    <section id="referee" className="relative mx-auto max-w-6xl px-1 py-0 sm:px-2">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-[32px] border border-amber-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(247,212,75,0.16),_transparent_30%),linear-gradient(135deg,_rgba(7,9,18,0.98),_rgba(16,24,42,0.95))] shadow-[0_25px_80px_-36px_rgba(247,212,75,0.55)]">
          <div className="border-b border-white/10 bg-black/20 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.28em] text-white/60">
                  <span>{scenario.category}</span>
                  <span className="text-primary">•</span>
                  <span>{scenario.difficulty}</span>
                  <span className="text-primary">•</span>
                  <span>Question {index + 1}/{scenarios.length}</span>
                </div>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">{scenario.title}</h3>
              </div>
              <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-center backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">Rating</p>
                <p className="text-2xl font-semibold text-amber-300">{rating}</p>
              </div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-base leading-relaxed text-white/75">
              {scenario.situation}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {scenario.options.map((option) => {
                const picked = selected === option
                const correctAnswer = answered && option === scenario.answer
                const wrongPick = answered && picked && option !== scenario.answer
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => choose(option)}
                    disabled={answered}
                    className={cn(
                      'rounded-[20px] border p-4 text-left font-medium text-white transition-all duration-300',
                      !answered && 'border-white/10 bg-white/8 hover:-translate-y-0.5 hover:border-amber-400/40 hover:bg-white/12',
                      correctAnswer && 'border-primary bg-primary/10 text-primary',
                      wrongPick && 'border-destructive/70 bg-destructive/10 text-destructive',
                      answered && !correctAnswer && !wrongPick && 'border-white/10 bg-white/6 opacity-60',
                    )}
                  >
                    {option}
                  </button>
                )
              })}
            </div>

            {answered && (
              <div className={cn('mt-6 rounded-[24px] border p-5', isCorrect ? 'border-primary/40 bg-primary/10' : 'border-destructive/40 bg-destructive/10')}>
                <div className="flex items-start gap-3">
                  <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full', isCorrect ? 'bg-primary text-primary-foreground' : 'bg-destructive text-white')}>
                    {isCorrect ? <BadgeCheck className="size-4" /> : <X className="size-4" />}
                  </span>
                  <div>
                    <p className="font-semibold tracking-tight text-white">
                      {isCorrect ? 'Correct decision.' : 'Not the best decision.'} Answer: {scenario.answer}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-white/70">{scenario.explanation}</p>
                    <p className="mt-2 text-sm leading-relaxed text-white/70"><strong className="text-white">Restart:</strong> {scenario.restart}</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/70"><strong className="text-white">Disciplinary sanction:</strong> {scenario.sanction}</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/70"><strong className="text-white">IFAB reasoning:</strong> {scenario.ifab}</p>
                  </div>
                </div>
                <div className="mt-5 flex justify-end">
                  {runComplete ? (
                    <Button onClick={() => setFinished(true)} className="rounded-xl glow-green">
                      View final report <ArrowRight className="size-4" />
                    </Button>
                  ) : (
                    <Button onClick={next} className="rounded-xl glow-green">
                      Next scenario <ArrowRight className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[28px] border border-white/10 bg-black/20 p-6 backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <p className="text-sm text-white/60">Current level</p>
                <p className="font-semibold tracking-tight text-white">{level}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">Accuracy</p>
                <p className="text-xl font-semibold text-primary">{accuracy}%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">Streak</p>
                <p className="text-xl font-semibold text-white">{streak}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">Best</p>
                <p className="text-xl font-semibold text-white">{bestStreak}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-6 backdrop-blur">
            <div className="flex items-center gap-2">
              <Flame className="size-5 text-primary" />
              <h3 className="font-semibold tracking-tight text-white">Decision feedback</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Every answer updates score, streak and rating feedback immediately so you can learn and adjust in the next scenario.
            </p>
          </div>

          <div className="rounded-[28px] border border-primary/30 bg-primary/10 p-6">
            <Trophy className="size-6 text-primary" />
            <h3 className="mt-3 font-semibold tracking-tight text-white">Match control mindset</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Focus on positioning, foul profile, advantage judgment and disciplinary consistency across the full set.
            </p>
          </div>
        </aside>
      </div>
    </section>
  )
}

function ResultTile({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn('rounded-[18px] border p-4', highlight ? 'border-primary/45 bg-primary/12' : 'border-white/10 bg-black/20')}>
      <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">{label}</p>
      <p className={cn('mt-2 text-2xl font-semibold', highlight ? 'text-primary' : 'text-white')}>{value}</p>
    </div>
  )
}
