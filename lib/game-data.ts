import { refereeScenarios } from './referee-scenarios'
import { expandedScoutScenarios } from './scout-scenario-expansion'
import { higherLowerDecks as duelHigherLowerDecks } from './duel-packs'
import { careerQuestionBank, whoAmIQuestionBank } from './player-knowledge-bank'

export type HigherLowerItem = { name: string; value: number; detail: string }
export type WhoAmIQuestion = { answer: string; aliases?: string[]; clues: string[] }
export type CareerQuestion = { answer: string; aliases?: string[]; clubs: string[]; hint: string }
export type RefereeQuestion = { id?: string; scenario: string; options: string[]; answer: number; explanation: string; difficulty?: 'Easy' | 'Medium' | 'Hard' }
export type ScoutDecision = 'Strongly follow' | 'Follow' | 'Monitor' | 'Do not pursue'
export type ScoutQaVerdict = 'launch-ready' | 'needs improvement' | 'replace'

export type ScoutQuestion = {
  id: string
  title: string
  profile: string[]
  summary: string
  strongestDecision: ScoutDecision
  defensibleAlternative?: ScoutDecision
  confidence: 'Low' | 'Medium' | 'High'
  observation: string
  interpretation: string
  strengths: string
  concerns: string
  missingInformation: string
  alternativeView: string
  recommendedAction: string
  nextScoutingStep: string
  confidenceReason: string
  weakerAlternatives: string
  qaVerdict: ScoutQaVerdict
  qaConcern: string
  qaRevision: string
  difficulty?: 'Starter' | 'Sharp' | 'Expert'
}

const legacyHigherLowerItems: HigherLowerItem[] = [
  { name: 'Thierry Henry', value: 175, detail: 'Premier League goals' },
  { name: 'Frank Lampard', value: 177, detail: 'Premier League goals' },
  { name: 'Sergio Agüero', value: 184, detail: 'Premier League goals' },
  { name: 'Wayne Rooney', value: 208, detail: 'Premier League goals' },
  { name: 'Harry Kane', value: 213, detail: 'Premier League goals' },
  { name: 'Mohamed Salah', value: 157, detail: 'Premier League goals in the starter dataset' },
  { name: 'Robin van Persie', value: 144, detail: 'Premier League goals' },
  { name: 'Raheem Sterling', value: 123, detail: 'Premier League goals in the starter dataset' },
  { name: 'Son Heung-min', value: 120, detail: 'Premier League goals in the starter dataset' },
  { name: 'Cristiano Ronaldo', value: 103, detail: 'Premier League goals' },
  { name: 'Olivier Giroud', value: 90, detail: 'Premier League goals' },
  { name: 'Carlos Tevez', value: 84, detail: 'Premier League goals' },
  { name: 'Luis Suárez', value: 69, detail: 'Premier League goals' },
  { name: 'David Silva', value: 60, detail: 'Premier League goals' },
]

const legacyWhoAmIQuestions: WhoAmIQuestion[] = [
  { answer: 'Kevin De Bruyne', clues: ['I am Belgian.', 'I played for Wolfsburg before becoming a Premier League star.', 'I am known for elite chance creation and crossing.', 'I became a central figure at Manchester City.'] },
  { answer: 'Didier Drogba', clues: ['I represented an African national team.', 'I played in France before moving to England.', 'I scored in a Champions League final.', 'I became a Chelsea icon.'] },
  { answer: 'Luka Modrić', clues: ['I am a midfielder from Croatia.', 'I played for Tottenham before moving to Spain.', 'I won the Ballon d’Or in 2018.', 'I became a Real Madrid legend.'] },
  { answer: 'Andrés Iniesta', clues: ['I came through La Masia.', 'I was a small, technical midfielder.', 'I scored the winning goal in a World Cup final.', 'I spent most of my career at Barcelona.'] },
  { answer: 'Virgil van Dijk', clues: ['I am a Dutch centre-back.', 'I played in Scotland and for Southampton.', 'I joined Liverpool for a record fee for a defender at the time.', 'I captained my national team.'] },
  { answer: 'Robert Lewandowski', clues: ['I am Polish.', 'I starred for both Dortmund and Bayern Munich.', 'I once scored five goals in nine minutes.', 'I later joined Barcelona.'] },
  { answer: 'Eden Hazard', clues: ['I am Belgian.', 'I won Ligue 1 before moving to England.', 'I was known for dribbling from the left.', 'My best club years came at Chelsea.'] },
  { answer: 'Sergio Ramos', clues: ['I am Spanish.', 'I began as a right-back before becoming a centre-back.', 'I scored a famous late equaliser in a Champions League final.', 'I captained Real Madrid.'] },
  { answer: 'Mohamed Salah', clues: ['I am Egyptian.', 'I played for Basel and Roma.', 'My first spell in England was not my breakthrough.', 'I became a prolific Liverpool forward.'] },
  { answer: 'Manuel Neuer', clues: ['I am German.', 'I started at Schalke.', 'I changed expectations of a goalkeeper’s role outside the box.', 'I became a Bayern Munich captain.'] },
]

const legacyCareerQuestions: CareerQuestion[] = [
  { answer: 'Zlatan Ibrahimović', clubs: ['Malmö', 'Ajax', 'Juventus', 'Inter', 'Barcelona', 'Milan', 'PSG', 'Manchester United', 'LA Galaxy'], hint: 'Swedish striker' },
  { answer: 'Nicolas Anelka', clubs: ['PSG', 'Arsenal', 'Real Madrid', 'Liverpool', 'Manchester City', 'Fenerbahçe', 'Bolton', 'Chelsea'], hint: 'French forward' },
  { answer: 'Arjen Robben', clubs: ['Groningen', 'PSV', 'Chelsea', 'Real Madrid', 'Bayern Munich'], hint: 'Dutch winger' },
  { answer: 'Cesc Fàbregas', clubs: ['Arsenal', 'Barcelona', 'Chelsea', 'Monaco', 'Como'], hint: 'Spanish midfielder' },
  { answer: 'Samuel Eto’o', clubs: ['Real Madrid', 'Mallorca', 'Barcelona', 'Inter', 'Anzhi', 'Chelsea', 'Everton'], hint: 'Cameroonian striker' },
  { answer: 'Ángel Di María', clubs: ['Rosario Central', 'Benfica', 'Real Madrid', 'Manchester United', 'PSG', 'Juventus'], hint: 'Argentine winger' },
  { answer: 'Yaya Touré', clubs: ['Beveren', 'Metalurh Donetsk', 'Olympiacos', 'Monaco', 'Barcelona', 'Manchester City'], hint: 'Ivorian midfielder' },
  { answer: 'Thierry Henry', clubs: ['Monaco', 'Juventus', 'Arsenal', 'Barcelona', 'New York Red Bulls'], hint: 'French forward' },
  { answer: 'Xabi Alonso', clubs: ['Real Sociedad', 'Liverpool', 'Real Madrid', 'Bayern Munich'], hint: 'Spanish midfielder' },
  { answer: 'Edinson Cavani', clubs: ['Danubio', 'Palermo', 'Napoli', 'PSG', 'Manchester United', 'Valencia', 'Boca Juniors'], hint: 'Uruguayan striker' },
]

export const legacyRefereeQuestions: RefereeQuestion[] = [
  { id: 'legacy-ref-01', scenario: 'A defender deliberately handles the ball on the goal line and prevents a certain goal. What is the correct decision?', options: ['Penalty only', 'Penalty and yellow card', 'Penalty and red card', 'Indirect free kick'], answer: 2, explanation: 'Deliberately denying a goal by handball is a sending-off offence, with a penalty if it occurs inside the penalty area.' },
  { scenario: 'An attacker is fouled in the penalty area while attempting to play the ball. The defender makes a genuine attempt to challenge for it and denies an obvious goal-scoring opportunity.', options: ['Penalty and red card', 'Penalty and yellow card', 'Penalty only', 'Indirect free kick and yellow card'], answer: 1, explanation: 'For a genuine attempt to play/challenge for the ball inside the penalty area, DOGSO is generally reduced from red to yellow.' },
  { scenario: 'A player removes their shirt while celebrating a goal.', options: ['No action', 'Verbal warning', 'Yellow card', 'Red card'], answer: 2, explanation: 'Removing the shirt during a goal celebration is a mandatory caution.' },
  { scenario: 'A goalkeeper controls the ball with the hands for too long under the current competition rules used by this quiz.', options: ['Play on forever', 'Direct free kick', 'Indirect free kick or the competition’s current restart sanction', 'Penalty kick'], answer: 2, explanation: 'The sanction depends on the applicable edition/competition implementation; the key principle is that the keeper cannot retain hand control indefinitely.' },
  { scenario: 'A substitute enters the field without permission and interferes with play.', options: ['Play on', 'Stop play, caution the substitute and restart as required', 'Send off the captain', 'Only warn the coach'], answer: 1, explanation: 'Unauthorised entry is misconduct. Interference requires play to be stopped and the correct disciplinary and restart action taken.' },
  { scenario: 'A player uses excessive force in a tackle and endangers the safety of an opponent.', options: ['No card', 'Yellow card', 'Red card', 'Drop ball only'], answer: 2, explanation: 'Serious foul play involving excessive force or endangering safety is a sending-off offence.' },
  { scenario: 'The ball accidentally touches an attacker’s hand and immediately goes to a teammate who scores.', options: ['Always disallow', 'Always allow', 'Judge under the current handball law; accidental contact by the non-scorer is not automatically an offence', 'Award an indirect free kick'], answer: 2, explanation: 'Accidental handball by a teammate is not automatically punished solely because a goal follows; the actual handball criteria still matter.' },
  { scenario: 'A defender carelessly trips an opponent outside the penalty area.', options: ['Direct free kick, no card automatically required', 'Indirect free kick and yellow', 'Penalty', 'Red card'], answer: 0, explanation: 'A careless trip is a direct-free-kick offence. Careless alone does not require a card.' },
  { scenario: 'A player commits a reckless tackle.', options: ['No card', 'Yellow card', 'Red card in every case', 'Only a warning'], answer: 1, explanation: 'Reckless challenges require a caution.' },
  { scenario: 'Two players from the same team collide and one suffers a serious head injury while play continues.', options: ['Always wait until the ball is out', 'Stop play immediately for serious injury', 'Award a free kick', 'Send off the other player'], answer: 1, explanation: 'The referee should stop play for a serious injury, especially a suspected head injury, even when no offence occurred.' },
]

void legacyHigherLowerItems
void legacyWhoAmIQuestions
void legacyCareerQuestions

export const higherLowerDecks: Array<{ id: string; title: string; statLabel: string; items: HigherLowerItem[] }> = duelHigherLowerDecks
export const higherLowerItems: HigherLowerItem[] = higherLowerDecks.flatMap((deck) => deck.items)
export const whoAmIQuestions: WhoAmIQuestion[] = whoAmIQuestionBank
export const careerQuestions: CareerQuestion[] = careerQuestionBank

export const refereeQuestions: RefereeQuestion[] = refereeScenarios.map((scenario) => ({
  id: scenario.id,
  scenario: scenario.situation,
  options: scenario.options,
  answer: scenario.options.indexOf(scenario.answer),
  explanation: `${scenario.explanation} Principle: ${scenario.principle}`,
  difficulty: scenario.difficulty,
}))

const baseScoutQuestions: ScoutQuestion[] = [
  {
    id: 'SV-01',
    title: 'The explosive winger',
    profile: ['17 years old', 'Repeatedly beats the full-back 1v1', 'Creates separation but final ball is inconsistent', 'Tracks back with good intensity', 'Decision-making drops when rushed'],
    summary: 'Elite separation flashes with clear end-product volatility.',
    strongestDecision: 'Strongly follow',
    defensibleAlternative: 'Follow',
    confidence: 'High',
    observation: 'The winger creates repeated 1v1 separation and still contributes in defensive transition.',
    interpretation: 'The dribbling base and repeatability signal scalable upside if decision quality improves.',
    strengths: 'Explosive separation, repeatable duel wins, and visible willingness to recover defensively.',
    concerns: 'Final action is inconsistent and speed of decisions declines under pressure.',
    missingInformation: 'No evidence yet on final-third output against top academy defenders or after fatigue.',
    alternativeView: 'A standard Follow call is defensible if your model weights current output over projection.',
    recommendedAction: 'Strongly follow, with explicit monitoring of final-ball quality under pressure.',
    nextScoutingStep: 'Re-observe in two higher-intensity fixtures and code final-third actions by decision quality.',
    confidenceReason: 'Multiple repeatable indicators were present, not one-off highlights.',
    weakerAlternatives: 'Monitor and Do not pursue are weaker because they underweight rare separation traits at this age.',
    qaVerdict: 'launch-ready',
    qaConcern: 'Could include opposition quality context.',
    qaRevision: 'Add opponent level and game state notes to improve transferability.',
  },
  {
    id: 'SV-02',
    title: 'The early-maturing striker',
    profile: ['15 years old', 'Physically dominates smaller defenders', 'Limited combination play', 'Most chances come from transitions', 'Movement in the box is promising'],
    summary: 'Goal threat exists, but physical maturity may be masking technical limits.',
    strongestDecision: 'Monitor',
    defensibleAlternative: 'Follow',
    confidence: 'Medium',
    observation: 'The striker wins many duels through physical advantage and shows useful box movement patterns.',
    interpretation: 'Current output may be maturity-driven rather than fully skill-driven.',
    strengths: 'Timing in the box and transition threat are positive early indicators.',
    concerns: 'Combination play and technical speed under pressure are underdeveloped.',
    missingInformation: 'No evidence against physically matched peers or in possession-heavy phases.',
    alternativeView: 'Follow can be justified if your club has a strong technical development pathway.',
    recommendedAction: 'Monitor until performance is tested in stronger physical and tactical contexts.',
    nextScoutingStep: 'Track actions in reduced-space possessions and vs age-matched centre-backs.',
    confidenceReason: 'Signals are mixed and context-sensitive.',
    weakerAlternatives: 'Strongly follow is weaker because projection is uncertain; Do not pursue may be premature at 15.',
    qaVerdict: 'needs improvement',
    qaConcern: 'Risk of binary framing around physicality.',
    qaRevision: 'Add clips or notes about first-touch and release quality under contact.',
  },
  {
    id: 'SV-03',
    title: 'The progressive centre-back',
    profile: ['16 years old', 'Breaks lines with passes', 'Defends large spaces calmly', 'Occasionally overcommits when stepping out', 'Communicates consistently'],
    summary: 'High-upside defender profile with manageable stepping risk.',
    strongestDecision: 'Strongly follow',
    defensibleAlternative: 'Follow',
    confidence: 'High',
    observation: 'Line-breaking passes, space defending, and communication were all repeatedly visible.',
    interpretation: 'The player already shows traits that usually translate to higher-level possession teams.',
    strengths: 'Progressive distribution, composure in wide spaces, and vocal organisation.',
    concerns: 'Step timing can become over-aggressive and expose depth behind.',
    missingInformation: 'No evidence yet under sustained press from elite forwards.',
    alternativeView: 'Follow remains defensible if your environment values conservative defensive profiles first.',
    recommendedAction: 'Strongly follow, with a focus plan around stepping triggers and recovery support.',
    nextScoutingStep: 'Rewatch against higher press and log outcomes after stepping out of line.',
    confidenceReason: 'Three core indicators repeated across phases rather than isolated actions.',
    weakerAlternatives: 'Monitor is weaker because the profile already passes key projection thresholds.',
    qaVerdict: 'launch-ready',
    qaConcern: 'Needs explicit mention of aerial profile.',
    qaRevision: 'Add aerial duel context in future version.',
  },
  {
    id: 'SV-04',
    title: 'The safe midfielder',
    profile: ['18 years old', 'Very high pass completion', 'Rarely receives on the half-turn', 'Few progressive actions', 'Positionally disciplined'],
    summary: 'Stable circulation player with uncertain progression ceiling.',
    strongestDecision: 'Monitor',
    defensibleAlternative: 'Follow',
    confidence: 'Medium',
    observation: 'Pass completion is high but progression volume and body orientation variety are low.',
    interpretation: 'Reliability is present, but role value may depend heavily on team context.',
    strengths: 'Positional discipline and ball security in low-risk circulation zones.',
    concerns: 'Limited progressive output and low evidence of pressure-breaking reception profile.',
    missingInformation: 'No evidence from games requiring vertical risk and tempo control under pressure.',
    alternativeView: 'Follow is defensible for clubs specifically recruiting low-variance controllers.',
    recommendedAction: 'Monitor while collecting role-fit evidence in higher-intensity matches.',
    nextScoutingStep: 'Code half-turn receptions, line-break attempts, and pressure exits in next sample.',
    confidenceReason: 'Indicators are coherent but ceiling remains unclear.',
    weakerAlternatives: 'Strongly follow overstates ceiling certainty; Do not pursue may ignore tactical role fit.',
    qaVerdict: 'launch-ready',
    qaConcern: 'May be interpreted as anti-possession midfielder bias.',
    qaRevision: 'Add examples where this profile succeeds at senior level.',
  },
  {
    id: 'SV-05',
    title: 'The high-volume goalkeeper',
    profile: ['17 years old', 'Makes many saves', 'Team concedes many shots', 'Strong reactions', 'Distribution under pressure is inconsistent'],
    summary: 'Shot-stopping upside with unresolved distribution reliability.',
    strongestDecision: 'Follow',
    defensibleAlternative: 'Monitor',
    confidence: 'Medium',
    observation: 'Reaction saves are frequent but occur in a team context that inflates save volume.',
    interpretation: 'Core reflex ability is promising, yet complete goalkeeper profile remains unproven.',
    strengths: 'Reaction speed and repeated intervention in live defensive phases.',
    concerns: 'Distribution and pressure execution are inconsistent in restart and build phases.',
    missingInformation: 'No clean sample on high-line claim decisions, crossing control, and passing range.',
    alternativeView: 'Monitor is defensible if your model prioritises full profile balance over peak reactions.',
    recommendedAction: 'Follow, with mandatory follow-up on distribution and command actions.',
    nextScoutingStep: 'Track 15+ distribution actions under press and all high-ball decisions.',
    confidenceReason: 'Positive and risk signals are both meaningful, so confidence is moderate.',
    weakerAlternatives: 'Strongly follow is weaker because distribution risk remains material.',
    qaVerdict: 'needs improvement',
    qaConcern: 'Could overvalue save count without clear context cues.',
    qaRevision: 'Add explicit reminder that save volume is team-shape dependent.',
  },
  {
    id: 'SV-06',
    title: 'The late-developing full-back',
    profile: ['18 years old', 'Average pace', 'Excellent timing when overlapping', 'Reliable 1v1 defender', 'Consistently scans before receiving'],
    summary: 'High game-intelligence full-back profile despite average raw speed.',
    strongestDecision: 'Strongly follow',
    defensibleAlternative: 'Follow',
    confidence: 'High',
    observation: 'Scanning habits, overlap timing, and 1v1 defence were consistently repeatable.',
    interpretation: 'Game intelligence and timing compensate for non-elite sprint profile.',
    strengths: 'Perception before reception, timing quality, and duel reliability.',
    concerns: 'Recovery pace against extreme transition teams may be capped.',
    missingInformation: 'No sample yet against top-tier pace wingers in open field.',
    alternativeView: 'Follow remains defensible if your model strongly weights athletic ceiling.',
    recommendedAction: 'Strongly follow and benchmark against high-pace opposition next.',
    nextScoutingStep: 'Observe transition defending and repeated high-speed recovery actions.',
    confidenceReason: 'Multiple transferable cognitive traits were observed repeatedly.',
    weakerAlternatives: 'Monitor and Do not pursue underweight high-transfer intelligence indicators.',
    qaVerdict: 'launch-ready',
    qaConcern: 'Needs stronger context on team tactical style.',
    qaRevision: 'Add team structure note to avoid over-generalization.',
  },
  {
    id: 'SV-07',
    title: 'The highlight-reel number 10',
    profile: ['16 years old', 'Two spectacular assists', 'Low involvement for long periods', 'Does not press consistently', 'Technical ceiling appears high'],
    summary: 'High-ceiling flashes with concerning consistency and work-rate profile.',
    strongestDecision: 'Monitor',
    defensibleAlternative: 'Follow',
    confidence: 'Medium',
    observation: 'Top-end creative actions are present but involvement and pressing are inconsistent.',
    interpretation: 'Talent is real, but role sustainability is currently uncertain.',
    strengths: 'Creativity and execution quality in high-impact moments.',
    concerns: 'Off-ball contribution and consistency across full match cycles are weak.',
    missingInformation: 'No repeated sample showing high involvement against tactical mid-blocks.',
    alternativeView: 'Follow is defensible for clubs that can absorb low out-of-possession output in development phases.',
    recommendedAction: 'Monitor while gathering evidence on repeatability and off-ball engagement.',
    nextScoutingStep: 'Track touches, pressing actions, and off-ball support over three matches.',
    confidenceReason: 'High variance profile with incomplete consistency evidence.',
    weakerAlternatives: 'Strongly follow is weaker due low repeatability evidence; Do not pursue is too final for 16-year upside.',
    qaVerdict: 'launch-ready',
    qaConcern: 'Could be read as anti-flair bias without context.',
    qaRevision: 'Add note that role-specific tolerance for volatility differs by club model.',
  },
  {
    id: 'SV-08',
    title: 'The dominant ball-winner',
    profile: ['17 years old', 'Wins many duels', 'Often arrives late', 'Receives frequent cautions', 'Simple but secure passing'],
    summary: 'Defensive aggression profile with disciplinary and timing risk.',
    strongestDecision: 'Monitor',
    defensibleAlternative: 'Follow',
    confidence: 'Medium',
    observation: 'Duel win volume is high, but late arrivals and cautions are recurrent.',
    interpretation: 'Ball-winning intent is clear, yet risk management and timing are not stable enough.',
    strengths: 'Competitive edge, willingness to engage, and secure simple circulation.',
    concerns: 'Disciplinary profile and mistimed interventions can become structural liabilities.',
    missingInformation: 'No evidence yet of adaptation to stricter refereeing or higher tactical tempo.',
    alternativeView: 'Follow is defensible if coaching environment is proven at behaviour refinement.',
    recommendedAction: 'Monitor and reassess after targeted work on tackle timing and foul profile.',
    nextScoutingStep: 'Log foul type, tackle timing, and recovery behaviour in next sample window.',
    confidenceReason: 'Clear strengths and clear liabilities coexist.',
    weakerAlternatives: 'Strongly follow overstates readiness; Do not pursue ignores development upside.',
    qaVerdict: 'needs improvement',
    qaConcern: 'Could encourage subjective interpretations of aggression.',
    qaRevision: 'Add a simple behaviour coding guide for cautions and foul context.',
  },
  {
    id: 'SV-09',
    title: 'The small technical winger',
    profile: ['14 years old', 'Excellent first touch', 'Avoids contact', 'Sees through passes early', 'Struggles to sustain intensity'],
    summary: 'High technical-perceptual upside with early physical and intensity constraints.',
    strongestDecision: 'Follow',
    defensibleAlternative: 'Strongly follow',
    confidence: 'Medium',
    observation: 'Technical first-touch and early pass vision are clear; intensity and contact tolerance lag.',
    interpretation: 'At this age, perception and touch are significant long-term value markers.',
    strengths: 'First touch quality and anticipatory pass vision beyond peer baseline.',
    concerns: 'Contact avoidance and intensity sustainability can limit current game impact.',
    missingInformation: 'No longitudinal evidence on physical confidence trend across a season.',
    alternativeView: 'Strongly follow is defensible in clubs that heavily prioritize technical ceiling at 14.',
    recommendedAction: 'Follow with patience-focused development plan rather than early rejection.',
    nextScoutingStep: 'Track repeated actions after contact and intensity stability late in matches.',
    confidenceReason: 'Projection is positive, but maturity trajectory is still uncertain.',
    weakerAlternatives: 'Monitor may undershoot clear upside; Do not pursue is too definitive at this age.',
    qaVerdict: 'launch-ready',
    qaConcern: 'Could benefit from stronger long-term development framing.',
    qaRevision: 'Add explicit reminder that U14 timelines are non-linear.',
  },
  {
    id: 'SV-10',
    title: 'The productive older youth',
    profile: ['19 years old', 'Scores regularly at a lower youth level', 'Limited acceleration', 'Good penalty-box timing', 'Has not yet faced senior football'],
    summary: 'Productive finisher profile with uncertain translation to senior intensity.',
    strongestDecision: 'Follow',
    defensibleAlternative: 'Monitor',
    confidence: 'Medium',
    observation: 'Consistent youth-level scoring and penalty-box timing are present, but acceleration is limited.',
    interpretation: 'The profile may translate if movement intelligence compensates for raw speed deficit.',
    strengths: 'Box timing and repeatable scoring actions at current level.',
    concerns: 'Pace ceiling and untested senior adaptation are meaningful uncertainty points.',
    missingInformation: 'No evidence in senior duels, transition demands, or reduced-space finishing vs adults.',
    alternativeView: 'Monitor is defensible if your recruitment model demands proof at senior speed first.',
    recommendedAction: 'Follow toward a controlled senior-level test before stronger commitment.',
    nextScoutingStep: 'Schedule observation in senior minutes and benchmark chance conversion under pressure.',
    confidenceReason: 'Output is real, but context translation is still open.',
    weakerAlternatives: 'Strongly follow may overstate certainty; Do not pursue can miss a role-fit striker profile.',
    qaVerdict: 'needs improvement',
    qaConcern: 'Needs clearer baseline for what counts as lower youth level.',
    qaRevision: 'Specify competition tier to improve judgement consistency.',
  },
]

const recommendationLabel: Record<string, ScoutDecision> = {
  'strong-follow': 'Strongly follow',
  follow: 'Follow',
  monitor: 'Monitor',
  'do-not-pursue': 'Do not pursue',
}

export const scoutQuestions: ScoutQuestion[] = [
  ...baseScoutQuestions,
  ...expandedScoutScenarios.map((scenario) => ({
    id: scenario.playerCode,
    title: `${scenario.position} dossier: ${scenario.playerCode}`,
    profile: [`${scenario.age} years old`, scenario.context, ...scenario.observation],
    summary: scenario.rationale.interpretation,
    strongestDecision: recommendationLabel[scenario.recommended],
    confidence: (scenario.difficulty === 'Starter' ? 'High' : scenario.difficulty === 'Sharp' ? 'Medium' : 'Low') as ScoutQuestion['confidence'],
    observation: scenario.rationale.observation,
    interpretation: scenario.rationale.interpretation,
    strengths: scenario.strengths.join('; '),
    concerns: scenario.concerns.join('; '),
    missingInformation: scenario.rationale.missing,
    alternativeView: 'A neighbouring recommendation can be defensible when a club weights role fit, development capacity or risk differently.',
    recommendedAction: `${recommendationLabel[scenario.recommended]} and collect the missing evidence before escalating commitment.`,
    nextScoutingStep: scenario.rationale.missing,
    confidenceReason: `The ${scenario.difficulty.toLowerCase()} scenario contains useful evidence but remains context-dependent.`,
    weakerAlternatives: 'More absolute decisions are weaker because the evidence is a bounded observation sample rather than complete proof.',
    qaVerdict: 'launch-ready' as const,
    qaConcern: 'Synthetic fictional dossier; never present it as a real player report.',
    qaRevision: 'Retain context, uncertainty and missing-evidence language in every version.',
    difficulty: scenario.difficulty,
  })),
]
