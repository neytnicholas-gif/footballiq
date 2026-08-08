export type ScoutRecommendation = 'strong-follow' | 'follow' | 'monitor' | 'do-not-pursue'

export type ExpandedScoutScenario = {
  id: string
  playerCode: string
  age: number
  position: string
  difficulty: 'Starter' | 'Sharp' | 'Expert'
  context: string
  observation: string[]
  strengths: string[]
  concerns: string[]
  development: string
  recommended: ScoutRecommendation
  rationale: { observation: string; interpretation: string; missing: string }
  heatmap: number[]
}

type RoleProfile = {
  code: string
  position: string
  ages: [number, number, number, number]
  trait: string
  evidence: [string, string, string]
  strengths: [string, string, string]
  concerns: [string, string]
  development: string
  missing: string
  calls: [ScoutRecommendation, ScoutRecommendation, ScoutRecommendation, ScoutRecommendation]
}

const contexts = [
  { label:'academy league match against an organised high press', evidence:'actions repeated under coordinated pressure', caveat:'academy performance must still translate to senior speed' },
  { label:'youth international against physically matched opponents', evidence:'traits held up against strong age-group competition', caveat:'the sample covers one tournament rather than a full season' },
  { label:'reserve-team fixture with mixed senior and youth players', evidence:'the player faced greater physical and tactical variation', caveat:'reserve football does not fully reproduce first-team consequences' },
  { label:'first senior start in a lower-division match', evidence:'behaviour appeared in a meaningful senior environment', caveat:'one senior appearance is not enough to establish consistency' },
] as const

const profiles: RoleProfile[] = [
  { code:'GK', position:'GK', ages:[16,17,18,19], trait:'proactive goalkeeper', evidence:['claimed crosses beyond the six-yard box','supported build-up as an extra player','recovered quickly after one distribution error'], strengths:['starting position behind a high line','communication before danger develops','varied passing range'], concerns:['decision timing when sweeping','handling after traffic'], development:'Footwork and scanning are improving, but the position demands a longer evidence horizon.', missing:'repeat evidence against direct play, crowded set pieces and sustained pressing', calls:['follow','strong-follow','follow','monitor'] },
  { code:'RCB', position:'RCB', ages:[15,16,18,20], trait:'progressive right centre-back', evidence:['broke the first line with firm passes','defended two large-space transitions','organised the line between actions'], strengths:['forward passing off the back foot','recovery speed','early communication'], concerns:['steps out too aggressively','aerial timing under contact'], development:'Recently moved inside from full-back and is learning when to hold the line.', missing:'aerial volume and decision outcomes against elite pressing forwards', calls:['strong-follow','strong-follow','follow','monitor'] },
  { code:'LCB', position:'LCB', ages:[16,17,19,21], trait:'left-footed cover defender', evidence:['protected depth behind an attacking full-back','switched play accurately under light pressure','won isolation duels without diving in'], strengths:['left-foot balance in build-up','patient 1v1 defending','covering angles'], concerns:['limited front-foot duels','safe passing when pressed'], development:'Reliable defensive base with an unresolved ceiling as a line-breaking passer.', missing:'performance when asked to defend higher and initiate through a compact press', calls:['follow','strong-follow','follow','monitor'] },
  { code:'FB', position:'RB', ages:[15,17,18,20], trait:'two-way full-back', evidence:['timed overlaps around the winger','recovered into the back line after turnovers','defended the outside channel repeatedly'], strengths:['repeat running capacity','support timing','side-on defensive body shape'], concerns:['inside passing speed','final delivery consistency'], development:'Physical output is established; next growth depends on decisions in crowded possession.', missing:'weak-foot use and role fit as an inverted full-back', calls:['follow','strong-follow','follow','monitor'] },
  { code:'DM', position:'DM', ages:[16,17,19,21], trait:'screening midfielder', evidence:['protected central space before transitions','received with frequent shoulder checks','secured the first pass after regains'], strengths:['defensive anticipation','scanning before reception','positional discipline'], concerns:['limited progressive passing','can become passive against runners'], development:'The tactical floor is strong, while the attacking ceiling remains unclear.', missing:'evidence as the lone pivot against an aggressive man-oriented press', calls:['follow','strong-follow','follow','monitor'] },
  { code:'CM', position:'CM', ages:[15,17,18,20], trait:'press-resistant number eight', evidence:['escaped pressure on both sides','connected third-player combinations','arrived near the box without abandoning rest defence'], strengths:['open-body receiving','tempo changes','support at different heights'], concerns:['duel intensity after losses','low shot volume'], development:'Cognitive and technical indicators are ahead of current physical impact.', missing:'repeat performance late in matches and against compact low blocks', calls:['strong-follow','strong-follow','follow','follow'] },
  { code:'AM', position:'AM', ages:[16,17,19,21], trait:'creative attacking midfielder', evidence:['received between compact lines','created chances with disguised passes','counter-pressed immediately after losing possession'], strengths:['pre-reception scanning','final-pass imagination','tight-space manipulation'], concerns:['involvement can disappear','forces central passes when wide release is open'], development:'High-value creative flashes need a more stable involvement level.', missing:'off-ball contribution and chance creation across a larger match sample', calls:['strong-follow','follow','follow','monitor'] },
  { code:'WG', position:'LW', ages:[15,16,18,20], trait:'one-versus-one winger', evidence:['created separation repeatedly on the outside','varied dribble direction after the first duel','recovered to support the full-back'], strengths:['first-step acceleration','duel confidence','repeat sprint intent'], concerns:['final action under pressure','can attack before support arrives'], development:'Rare separation ability justifies patience while end product develops.', missing:'output against defenders who match the player’s speed and show inside', calls:['strong-follow','strong-follow','follow','monitor'] },
  { code:'CF', position:'CF', ages:[15,17,19,21], trait:'linking centre-forward', evidence:['pinned centre-backs before dropping short','connected runners with first-time lay-offs','pressed backwards passes with clear angles'], strengths:['back-to-goal awareness','penalty-area movement','pressing intelligence'], concerns:['limited separation over distance','finishing sample is volatile'], development:'Role intelligence is promising, but recruitment value depends on the required scoring load.', missing:'finishing quality across a full season and output against deeper defences', calls:['follow','strong-follow','follow','monitor'] },
  { code:'ST', position:'ST', ages:[16,17,19,22], trait:'transition striker', evidence:['threatened depth immediately after regains','separated from defenders over the first metres','attacked the far post when play developed wide'], strengths:['channel running','early shot preparation','direct transition threat'], concerns:['low involvement in settled possession','pressing effort drops after repeated sprints'], development:'The transition weapon is clear; broader role value and physical repeatability need testing.', missing:'combination play, defensive intensity and chance quality against low blocks', calls:['strong-follow','follow','follow','do-not-pursue'] },
]

function heatmap(seed: number) {
  return Array.from({ length: 24 }, (_, cell) => (seed * 3 + cell * 2 + Math.floor(cell / 6)) % 6)
}

export const expandedScoutScenarios: ExpandedScoutScenario[] = profiles.flatMap((profile, profileIndex) => contexts.map((context, contextIndex) => {
  const recommended = profile.calls[contextIndex]
  const idNumber = 11 + profileIndex * 4 + contextIndex
  return {
    id: `scout-${idNumber}`,
    playerCode: `${profile.code}-${String(idNumber).padStart(2, '0')}`,
    age: profile.ages[contextIndex],
    position: profile.position,
    difficulty: (['Starter', 'Sharp', 'Expert'] as const)[(profileIndex + contextIndex) % 3],
    context: `${context.label}; evaluation focus: ${profile.trait}`,
    observation: [profile.evidence[0], profile.evidence[1], `${profile.evidence[2]}; ${context.evidence}`],
    strengths: profile.strengths,
    concerns: profile.concerns,
    development: profile.development,
    recommended,
    rationale: {
      observation: `${profile.evidence.join(', ')}.`,
      interpretation: `${profile.trait} indicators support a ${recommended.replaceAll('-', ' ')} decision, with the game context weighted rather than treated as proof on its own.`,
      missing: `${profile.missing}; ${context.caveat}.`,
    },
    heatmap: heatmap(idNumber),
  }
}))

export const scoutScenarioCount = 10 + expandedScoutScenarios.length

export function validateScoutScenarios(items: ExpandedScoutScenario[]) {
  const errors: string[] = []
  const ids = new Set<string>()
  const codes = new Set<string>()
  for (const item of items) {
    if (ids.has(item.id)) errors.push(`${item.id}: duplicate id`)
    if (codes.has(item.playerCode)) errors.push(`${item.id}: duplicate player code`)
    ids.add(item.id); codes.add(item.playerCode)
    if (item.observation.length < 3 || item.strengths.length < 2 || item.concerns.length < 2) errors.push(`${item.id}: insufficient evidence balance`)
    if (!item.rationale.observation || !item.rationale.interpretation || !item.rationale.missing) errors.push(`${item.id}: incomplete rationale`)
    if (!item.rationale.interpretation.toLowerCase().includes('support')) errors.push(`${item.id}: judgement is framed too absolutely`)
    if (item.heatmap.length !== 24) errors.push(`${item.id}: malformed heatmap`)
  }
  return errors
}
