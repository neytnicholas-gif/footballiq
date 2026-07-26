'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, Check, Eye, RotateCcw, TriangleAlert, X } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { saveQuizResult } from '@/lib/quiz-save'
import { cn } from '@/lib/utils'

type ScoutDecision = 'strong-follow' | 'follow' | 'monitor' | 'do-not-pursue'

type ScoutScenario = {
  id: string
  playerCode: string
  age: number
  position: string
  context: string
  observation: string[]
  strengths: string[]
  concerns: string[]
  development: string
  recommended: ScoutDecision
  rationale: {
    observation: string
    interpretation: string
    missing: string
  }
  heatmap: number[]
}

const decisionLabels: Record<ScoutDecision, string> = {
  'strong-follow': 'Strongly follow',
  follow: 'Follow',
  monitor: 'Monitor',
  'do-not-pursue': 'Do not pursue',
}

const scenarios: ScoutScenario[] = [
  {
    id: 'scout-1',
    playerCode: 'SV-11',
    age: 17,
    position: 'RW',
    context: 'U19 top-division match, high press opponent',
    observation: ['8 successful dribbles from 13 attempts', 'Created 4 shot-ending actions', 'Tracked full-back after turnovers'],
    strengths: ['Explosive first step', 'Early crossing decisions', 'High repeat sprint output'],
    concerns: ['Forces low-percentage shots when frustrated', 'Weak-foot use still limited'],
    development: 'Late physical growth spurt in the last year; tactical coaching trending upward.',
    recommended: 'strong-follow',
    rationale: {
      observation: 'Repeated separation against organized pressure and consistent defensive effort.',
      interpretation: 'The repeatable 1v1 profile is high value at this age and competition level.',
      missing: 'Need evidence against low-block opponents and in-game emotional control after errors.',
    },
    heatmap: [0, 2, 4, 5, 2, 0, 1, 3, 5, 4, 2, 0, 0, 2, 3, 4, 3, 1, 0, 1, 2, 3, 2, 1],
  },
  {
    id: 'scout-2',
    playerCode: 'SV-04',
    age: 15,
    position: 'CF',
    context: 'Regional academy league, transition-heavy game state',
    observation: ['Won 11 of 14 physical duels', 'Received only 9 progressive passes', '2 box runs timed well off blind side'],
    strengths: ['Penalty-box movement cues', 'Aerial timing', 'Willing to press center-backs'],
    concerns: ['Limited combination play under pressure', 'Current physical edge may normalize'],
    development: 'Early maturing profile; technical floor still volatile.',
    recommended: 'follow',
    rationale: {
      observation: 'Scoring threat and duel dominance are clear in current context.',
      interpretation: 'Worth following, but projection depends on technical growth when physical gap narrows.',
      missing: 'Need clips against physically matched opponents and tighter defensive blocks.',
    },
    heatmap: [0, 0, 0, 1, 1, 0, 0, 1, 3, 5, 3, 1, 0, 1, 2, 4, 4, 1, 0, 0, 1, 3, 5, 2],
  },
  {
    id: 'scout-3',
    playerCode: 'SV-09',
    age: 16,
    position: 'CB',
    context: 'U17 national cup quarter-final',
    observation: ['Completed 9 line-breaking passes', 'Defended 5 isolation sprints in open field', '1 misread when stepping into midfield'],
    strengths: ['Composure under pressure', 'Passing range off both feet', 'Body orientation before receiving'],
    concerns: ['Occasional overcommit when stepping', 'Can over-dribble in first phase'],
    development: 'Recently transitioned from full-back to center-back role.',
    recommended: 'strong-follow',
    rationale: {
      observation: 'Line-breaking distribution with recovery pace is hard to find at this age.',
      interpretation: 'Profile has first-team pathway upside if stepping decisions stabilize.',
      missing: 'Need longer sample on aerial duels versus direct strikers.',
    },
    heatmap: [4, 4, 3, 1, 0, 0, 5, 4, 2, 1, 0, 0, 4, 3, 2, 1, 0, 0, 3, 2, 1, 0, 0, 0],
  },
  {
    id: 'scout-4',
    playerCode: 'SV-22',
    age: 18,
    position: 'CM',
    context: 'Second-team league fixture, controlled-possession side',
    observation: ['92% pass completion', 'Only 2 progressive carries', 'Received mostly in safe zones'],
    strengths: ['Press resistance with first touch', 'Reliable circulation', 'Defensive positioning discipline'],
    concerns: ['Low vertical risk', 'Few third-man combinations'],
    development: 'Transitioning from youth to senior minutes.',
    recommended: 'monitor',
    rationale: {
      observation: 'Safe and efficient profile without clear game-breaking actions.',
      interpretation: 'Current output suggests a role player floor rather than high-upside trajectory.',
      missing: 'Need matches with increased responsibility and evidence of line-breaking intent.',
    },
    heatmap: [0, 1, 2, 2, 1, 0, 1, 2, 4, 4, 2, 1, 1, 3, 5, 5, 3, 1, 0, 2, 4, 4, 2, 0],
  },
  {
    id: 'scout-5',
    playerCode: 'SV-31',
    age: 17,
    position: 'GK',
    context: 'High-shot-volume league match',
    observation: ['7 saves, 3 from inside box', 'Claimed 1 of 5 high crosses', 'Distribution completion 68% under press'],
    strengths: ['Reflex speed', 'Strong low set position', 'Immediate reset after mistakes'],
    concerns: ['Cross command inconsistency', 'Decision timing outside box'],
    development: 'Converted from futsal background two seasons ago.',
    recommended: 'follow',
    rationale: {
      observation: 'Shot-stopping profile is legitimate and repeatable.',
      interpretation: 'Follow-up is justified, but command actions need major verification.',
      missing: 'Need more data on aerial traffic and build-up quality versus pressing teams.',
    },
    heatmap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 2, 1, 0],
  },
  {
    id: 'scout-6',
    playerCode: 'SV-18',
    age: 14,
    position: 'LW',
    context: 'Academy festival tournament, short turnarounds',
    observation: ['16 progressive passes received between lines', 'Created 3 through-ball chances', 'Avoided contact in final third'],
    strengths: ['First touch direction changes', 'Visual scanning before receive', 'Creative passing windows'],
    concerns: ['Physical confidence in duels', 'Drops intensity late in games'],
    development: 'One of the youngest in competition; technical profile ahead of age band.',
    recommended: 'strong-follow',
    rationale: {
      observation: 'Perception and manipulation skills stand out well above peers.',
      interpretation: 'Technical and cognitive traits justify strong follow despite physical concerns.',
      missing: 'Need maturation tracking and longitudinal conditioning response.',
    },
    heatmap: [0, 3, 5, 4, 2, 0, 0, 2, 4, 5, 3, 1, 0, 2, 3, 4, 3, 1, 0, 1, 2, 3, 2, 1],
  },
  {
    id: 'scout-7',
    playerCode: 'SV-27',
    age: 19,
    position: 'ST',
    context: 'Lower-tier reserve league, dominant team environment',
    observation: ['Scored 2 goals from 6 shots', 'No successful presses in final 20 minutes', 'Limited acceleration over first 5m'],
    strengths: ['Penalty-box timing', 'First-time finishing', 'Back-post awareness'],
    concerns: ['Physical ceiling in transitions', 'Low work rate out of possession'],
    development: 'Older age relative to current league level.',
    recommended: 'monitor',
    rationale: {
      observation: 'Output exists, but context inflates numbers and masks intensity issues.',
      interpretation: 'Monitor for translation to stronger level before stronger recommendation.',
      missing: 'Need test in faster, physically demanding senior environment.',
    },
    heatmap: [0, 0, 0, 0, 1, 0, 0, 1, 2, 3, 4, 2, 0, 1, 2, 4, 5, 3, 0, 0, 1, 2, 4, 3],
  },
  {
    id: 'scout-8',
    playerCode: 'SV-06',
    age: 16,
    position: 'DM',
    context: 'U17 league game with repeated midfield transitions',
    observation: ['Won 9 defensive duels', 'Committed 5 late tackles', 'Received one caution'],
    strengths: ['Ball-winning timing in front foot press', 'Passing security after regains', 'Leadership communication'],
    concerns: ['Discipline under fatigue', 'Can chase duels outside zone'],
    development: 'Strong mentality profile with high emotional intensity.',
    recommended: 'follow',
    rationale: {
      observation: 'Defensive impact and communication are strong positives.',
      interpretation: 'Follow with targeted review of foul profile and game-state control.',
      missing: 'Need evidence on how discipline holds in back-to-back matches.',
    },
    heatmap: [0, 0, 2, 3, 2, 0, 0, 2, 4, 5, 4, 2, 0, 1, 4, 5, 4, 1, 0, 0, 2, 3, 2, 0],
  },
  {
    id: 'scout-9',
    playerCode: 'SV-35',
    age: 18,
    position: 'RB',
    context: 'Second division senior debut',
    observation: ['6 successful defensive actions in channel', '2 underhit passes under pressure', 'Repeated overlap timing with winger'],
    strengths: ['1v1 body shape', 'Timing of support runs', 'Defensive concentration'],
    concerns: ['Passing speed into midfield', 'Limited weak-foot distribution'],
    development: 'First senior starts after strong U19 season.',
    recommended: 'follow',
    rationale: {
      observation: 'Reliable defensive actions translated well to senior pace.',
      interpretation: 'Follow recommendation with focus on build-up speed development.',
      missing: 'Need sample against top-half opponents with sustained high press.',
    },
    heatmap: [0, 0, 0, 2, 4, 4, 0, 0, 1, 3, 5, 5, 0, 0, 1, 3, 5, 4, 0, 0, 1, 2, 3, 3],
  },
  {
    id: 'scout-10',
    playerCode: 'SV-14',
    age: 17,
    position: 'AM',
    context: 'U18 derby, low possession side',
    observation: ['2 final-third touches in first half', 'Created one high-value chance from turnover', 'Limited off-ball scanning under pressure'],
    strengths: ['Set-piece delivery', 'Instinctive final pass in transition', 'Composure in one-v-one finish'],
    concerns: ['Low involvement between actions', 'Inconsistent scanning habits'],
    development: 'High-variance performer with clear moments of quality.',
    recommended: 'monitor',
    rationale: {
      observation: 'Individual quality flashes exist but involvement is inconsistent.',
      interpretation: 'Monitor while testing role fit and decision-making reliability.',
      missing: 'Need larger sample with possession-dominant team context.',
    },
    heatmap: [0, 1, 2, 2, 1, 0, 0, 2, 4, 4, 2, 0, 0, 1, 3, 5, 2, 0, 0, 0, 1, 2, 1, 0],
  },
]

export function ScoutVisionGame() {
  const { user, refreshProfile } = useAuth()
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<ScoutDecision | null>(null)
  const [score, setScore] = useState(0)
  const [saved, setSaved] = useState(false)
  const scenario = scenarios[index]
  const complete = index === scenarios.length - 1 && selected !== null

  const decisionOrder = useMemo(
    () => ['strong-follow', 'follow', 'monitor', 'do-not-pursue'] as ScoutDecision[],
    [],
  )

  function choose(decision: ScoutDecision) {
    if (selected) return
    setSelected(decision)
    if (decision === scenario.recommended) {
      setScore((current) => current + 1)
    }
  }

  function next() {
    if (index === scenarios.length - 1) return
    setIndex((current) => current + 1)
    setSelected(null)
  }

  function restart() {
    setIndex(0)
    setSelected(null)
    setScore(0)
    setSaved(false)
  }

  async function save() {
    if (!user || saved) return
    const xp = 30 + score * 11
    const { error } = await saveQuizResult({
      quizId: 'would-you-scout-v1',
      score,
      total: scenarios.length,
      xp,
    })
    if (!error) {
      setSaved(true)
      await refreshProfile()
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.22em] text-primary">Scout dossier</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              {scenario.playerCode} • {scenario.position} • {scenario.age}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{scenario.context}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/70 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Scenario</p>
            <p className="text-lg font-semibold">
              {index + 1}/{scenarios.length}
            </p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${Math.round(((index + (selected ? 1 : 0)) / scenarios.length) * 100)}%` }}
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <article className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <h3 className="text-sm font-semibold uppercase tracking-[.2em] text-primary">Observed evidence</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {scenario.observation.map((point) => (
              <li key={point} className="rounded-xl border border-border bg-background/60 px-3 py-2">
                {point}
              </li>
            ))}
          </ul>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold">Strengths</h4>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                {scenario.strengths.map((point) => (
                  <li key={point} className="rounded-xl border border-border bg-background/60 px-3 py-2">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Concerns</h4>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                {scenario.concerns.map((point) => (
                  <li key={point} className="rounded-xl border border-border bg-background/60 px-3 py-2">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Development context</p>
            <p className="mt-2 text-sm text-muted-foreground">{scenario.development}</p>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {decisionOrder.map((decision) => {
              const isPicked = selected === decision
              const isRecommended = selected && scenario.recommended === decision
              return (
                <button
                  key={decision}
                  type="button"
                  onClick={() => choose(decision)}
                  disabled={selected !== null}
                  className={cn(
                    'rounded-xl border px-4 py-3 text-left text-sm font-semibold transition',
                    !selected && 'border-border bg-background hover:border-primary/50',
                    isRecommended && 'border-primary bg-primary/10 text-primary',
                    isPicked && !isRecommended && 'border-destructive bg-destructive/10 text-destructive',
                    selected && !isRecommended && !isPicked && 'opacity-60',
                  )}
                >
                  {decisionLabels[decision]}
                </button>
              )
            })}
          </div>

          {selected && (
            <div className="mt-5 rounded-2xl border border-border bg-secondary/40 p-5">
              <p className="font-semibold">
                Recommended decision: {decisionLabels[scenario.recommended]}
              </p>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p className="flex items-start gap-2">
                  <Eye className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    <strong className="text-foreground">Observation:</strong> {scenario.rationale.observation}
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  {selected === scenario.recommended ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  ) : (
                    <X className="mt-0.5 size-4 shrink-0 text-destructive" />
                  )}
                  <span>
                    <strong className="text-foreground">Interpretation:</strong> {scenario.rationale.interpretation}
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-300" />
                  <span>
                    <strong className="text-foreground">Missing information:</strong> {scenario.rationale.missing}
                  </span>
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                {!complete ? (
                  <button
                    type="button"
                    onClick={next}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                  >
                    Next dossier <ArrowRight className="size-4" />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void save()}
                      disabled={!user || saved}
                      className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      {!user ? 'Sign in to save progress' : saved ? 'Progress saved' : 'Finish and save XP'}
                    </button>
                    <button
                      type="button"
                      onClick={restart}
                      className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold"
                    >
                      <RotateCcw className="size-4" />
                      Play again
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </article>

        <aside className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Zone activity</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Simplified touch-intensity map from observed actions.
          </p>
          <div className="mt-4 grid grid-cols-6 gap-1 rounded-2xl border border-border bg-background/70 p-2">
            {scenario.heatmap.map((value, cellIndex) => (
              <div
                key={`${scenario.id}-${cellIndex}`}
                className="aspect-square rounded-sm"
                style={{
                  backgroundColor:
                    value === 0
                      ? 'rgba(255,255,255,0.05)'
                      : `rgba(40,220,150,${Math.min(0.18 + value * 0.14, 0.92)})`,
                }}
              />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span className="rounded-lg border border-border px-2 py-1">0-1 low activity</span>
            <span className="rounded-lg border border-border px-2 py-1">2-3 medium activity</span>
            <span className="rounded-lg border border-border px-2 py-1">4-5 high activity</span>
            <span className="rounded-lg border border-border px-2 py-1">Context dependent</span>
          </div>
          <div className="mt-5 rounded-2xl border border-border bg-background/70 p-4 text-sm">
            <p className="text-muted-foreground">Score</p>
            <p className="mt-1 text-2xl font-bold text-primary">
              {score}/{scenarios.length}
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
