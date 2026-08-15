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
  ages: readonly number[]
  trait: string
  evidence: [string, string, string]
  strengths: [string, string, string]
  concerns: [string, string]
  development: string
  missing: string
  calls: readonly ScoutRecommendation[]
}

const contexts = [
  { label:'academy league match against an organised high press', evidence:'actions repeated under coordinated pressure', caveat:'academy performance must still translate to senior speed' },
  { label:'youth international against physically matched opponents', evidence:'traits held up against strong age-group competition', caveat:'the sample covers one tournament rather than a full season' },
  { label:'reserve-team fixture with mixed senior and youth players', evidence:'the player faced greater physical and tactical variation', caveat:'reserve football does not fully reproduce first-team consequences' },
  { label:'first senior start in a lower-division match', evidence:'behaviour appeared in a meaningful senior environment', caveat:'one senior appearance is not enough to establish consistency' },
  { label:'first-team training match played at an aggressive counter-pressing tempo', evidence:'decisions were tested by faster pressure and shorter recovery windows', caveat:'training intensity does not reproduce the emotional cost of a competitive mistake' },
  { label:'senior cup tie while protecting a narrow lead', evidence:'the player had to manage territory, risk and repeated defensive pressure', caveat:'the conservative score state may hide the player’s contribution in a more proactive role' },
  { label:'away fixture on a poor surface against direct play', evidence:'technique and concentration were tested by unpredictable ball movement and second balls', caveat:'one unusual surface should not outweigh the player’s broader technical sample' },
  { label:'possession-dominant match against a compact low block', evidence:'patience, scanning and solutions in reduced space were visible repeatedly', caveat:'the opponent offered little transition threat, so defensive recovery evidence is limited' },
  { label:'second leg of a knockout tie while trailing on aggregate', evidence:'the player operated under urgency without abandoning the team structure', caveat:'the required risk level was different from a normal league fixture' },
  { label:'final thirty minutes as a substitute in an open match', evidence:'the player adapted quickly and influenced a game with stretched distances', caveat:'a substitute sample must not be compared directly with ninety-minute physical output' },
  { label:'first competitive match after returning from injury', evidence:'movement quality and decision speed held up despite an interrupted preparation period', caveat:'physical output may still be deliberately managed during the return-to-play phase' },
  { label:'high-emotion local derby with persistent opponent pressure', evidence:'composure and communication were tested by crowd noise and repeated duels', caveat:'derby intensity can produce behaviour that is not representative of a normal week' },
  { label:'third tournament match in seven days', evidence:'repeat decisions and technical execution were observed under accumulated fatigue', caveat:'fatigue explains some decline but cannot automatically excuse recurring tactical errors' },
  { label:'loan spell appearance in an unfamiliar role and team structure', evidence:'adaptability and transfer of core traits were tested outside the player’s usual system', caveat:'role unfamiliarity makes a definitive ceiling judgement premature' },
  { label:'senior pre-season match against an established first-team group', evidence:'the player’s speed of thought was tested against experienced opponents', caveat:'pre-season intensity and selection priorities differ from competitive football' },
  { label:'promotion play-off with little space and high consequence', evidence:'decision quality was visible under pressure and conservative game management', caveat:'one high-stakes match can exaggerate both positive and negative impressions' },
  { label:'relegation battle in which the team defended for long periods', evidence:'concentration and repeated defensive behaviour could be observed', caveat:'a survival game offers limited evidence of the player’s attacking ceiling' },
  { label:'neutral-venue cup final after a cautious opening phase', evidence:'the player had to manage emotion, territory and changing risk', caveat:'finals often produce unusual tactical choices that should not define the whole report' },
  { label:'match played with ten team-mates after an early sending-off', evidence:'discipline, coverage and decision economy were tested in an overload', caveat:'reduced numbers changed the player’s normal role and available support' },
  { label:'match against ten opponents protecting a deep block', evidence:'patience and solutions against compact space were repeated', caveat:'numerical superiority can inflate possession and suppress transition evidence' },
  { label:'game against a strict man-oriented press', evidence:'movement to create separation and decisions under direct pressure were exposed', caveat:'one pressing scheme does not reveal performance against zonal control' },
  { label:'game against a disciplined zonal mid-block', evidence:'scanning, positioning between lines and circulation choices were visible', caveat:'the moderate tempo offered fewer examples of emergency decision-making' },
  { label:'opponent holding an aggressive defensive line near halfway', evidence:'timing into depth and offside awareness were tested repeatedly', caveat:'large spaces behind the line do not show how the player solves a low block' },
  { label:'opponent defending almost entirely around its own box', evidence:'tight-space technique and patience were tested in crowded zones', caveat:'the player faced little open-field defending or recovery running' },
  { label:'match built around repeated aerial and second-ball contests', evidence:'duel preparation, landing reactions and anticipation were easy to compare', caveat:'a direct game can hide combination quality and structured possession value' },
  { label:'set-piece-heavy match with frequent restarts', evidence:'role discipline and concentration after stoppages were observed often', caveat:'broken rhythm reduced the sample of continuous open play' },
  { label:'end-to-end match with many transition attacks', evidence:'recovery choices and actions at speed appeared in a large sample', caveat:'stretched spacing made progressive actions easier than in settled possession' },
  { label:'slow possession match with few turnovers', evidence:'off-ball patience and contribution to controlled circulation were visible', caveat:'the low transition volume leaves athletic recovery questions unanswered' },
  { label:'hostile away match where communication was difficult', evidence:'composure and non-verbal organisation were tested by noise and pressure', caveat:'the atmosphere may influence behaviour differently from a normal fixture' },
  { label:'quiet training-ground friendly with detailed coach communication', evidence:'response to instruction and positional learning were observable', caveat:'the low emotional pressure means competitive resilience remains untested' },
  { label:'halftime role change after the opponent adjusted its shape', evidence:'learning speed and tactical adaptability could be compared across two roles', caveat:'forty-five minutes in each role is a useful clue rather than a complete role sample' },
  { label:'match captaining a younger and inexperienced team', evidence:'organisation, responsibility and response after mistakes were visible', caveat:'leadership responsibility may reduce the freedom normally available in the player’s role' },
  { label:'first appearance after moving up an age group', evidence:'core traits were tested against older and faster opposition', caveat:'early adaptation difficulty should be separated from long-term capability' },
  { label:'appearance against a noticeably younger opposition group', evidence:'the player was expected to control the match rather than merely survive it', caveat:'physical and experience advantages can make ordinary actions look dominant' },
  { label:'short-notice start after an injury in the warm-up', evidence:'mental readiness and fast role preparation were tested unexpectedly', caveat:'limited preparation can explain communication gaps that need checking in a normal start' },
  { label:'first competitive appearance after joining a new club', evidence:'adaptation to unfamiliar team-mates and terminology was immediately visible', caveat:'new relationships make automatic movements and timing less reliable' },
  { label:'final match before a possible loan decision', evidence:'the player’s readiness for responsibility could be judged against a clear pathway question', caveat:'selection pressure can distort risk-taking and should not be treated as typical behaviour' },
  { label:'wind-affected match with long passes and crosses repeatedly changing flight', evidence:'adjustment of body shape, timing and technique was tested', caveat:'extreme weather is a specialist sample rather than the normal performance baseline' },
  { label:'competitive match on artificial turf', evidence:'touch quality and movement adapted to a faster, more predictable surface', caveat:'surface familiarity can affect confidence and should be checked on natural grass' },
  { label:'hot-weather match with planned physical load management', evidence:'decision quality could be separated from deliberately controlled running volume', caveat:'managed output should not be read as the player’s maximum physical capacity' },
  { label:'knockout match that continued through extra time', evidence:'concentration and choice quality were visible beyond the normal match duration', caveat:'extreme fatigue can reveal resilience but is not a fair baseline for technical speed' },
  { label:'opponent repeatedly targeting the player’s weaker side', evidence:'adaptation and problem-solving were tested through a deliberate opposition plan', caveat:'repeated exposure may overrepresent one limitation relative to the complete role' },
  { label:'second meeting with an opponent that had studied the first match', evidence:'the player had to find new solutions when familiar strengths were blocked', caveat:'team-level tactical changes also shaped the new performance' },
  { label:'match immediately after a public selection setback', evidence:'response, work habits and emotional control could be observed after disappointment', caveat:'one reaction should not be used to make a broad personality judgement' },
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
  const recommended = profile.calls[contextIndex % profile.calls.length]
  const idNumber = 11 + profileIndex * contexts.length + contextIndex
  return {
    id: `scout-${idNumber}`,
    playerCode: `${profile.code}-${String(idNumber).padStart(2, '0')}`,
    age: profile.ages[contextIndex % profile.ages.length],
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
