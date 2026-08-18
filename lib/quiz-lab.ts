import {
  oddOneOutQuestionBank,
  oddOneOutRoundNames,
} from '@/lib/quiz-lab-odd-one-out'
import { formationFixQuestionBank } from '@/lib/quiz-lab-formation-fix'
import { linkUpQuestionBank } from '@/lib/quiz-lab-link-up'
import { orderThePlayQuestionBank } from '@/lib/quiz-lab-order-the-play'
import { QUIZ_LAB_ROUND_COUNT, QUIZ_LAB_ROUND_SIZE, quizLabRoundNames } from '@/lib/quiz-lab-rounds'
import { truthTrapQuestionBank } from '@/lib/quiz-lab-truth-trap'

export type QuizLabFormat = 'odd-one-out' | 'truth-trap' | 'order-the-play' | 'link-up' | 'formation-fix'

type QuizLabBase = {
  id: string
  prompt: string
  explanation: string
  takeaway: string
  difficulty: 'Starter' | 'Sharp' | 'Expert'
}

export type QuizLabChoiceQuestion = QuizLabBase & {
  kind: 'odd-one-out' | 'truth-trap' | 'formation-fix'
  options: string[]
  answer: string
  visual?: 'goal' | 'left' | 'centre' | 'right' | 'half-space' | 'wide' | 'depth'
}

export type QuizLabOrderQuestion = QuizLabBase & {
  kind: 'order-the-play'
  items: string[]
  answer: string[]
}

export type QuizLabLinkQuestion = QuizLabBase & {
  kind: 'link-up'
  pairs: Array<{ left: string; right: string }>
  rightOptions: string[]
}

export type QuizLabQuestion = QuizLabChoiceQuestion | QuizLabOrderQuestion | QuizLabLinkQuestion

export const quizLabFormats = [
  { id: 'odd-one-out', title: 'Odd One Out', shortTitle: 'Odd One Out', description: 'Find the football idea that does not belong with the other three.', instruction: 'Pick the odd tile.', accent: 'cyan', skill: 'Pattern spotting' },
  { id: 'truth-trap', title: 'Truth Trap', shortTitle: 'Truth Trap', description: 'Three statements are solid. One is the trap.', instruction: 'Pick the false statement.', accent: 'rose', skill: 'Careful reading' },
  { id: 'order-the-play', title: 'Order the Play', shortTitle: 'Order the Play', description: 'Put a football decision or team move into the right order.', instruction: 'Tap every step in order.', accent: 'amber', skill: 'Sequences' },
  { id: 'link-up', title: 'Link-Up Board', shortTitle: 'Link-Up', description: 'Match each football role, rule or clue with its partner.', instruction: 'Build all four pairs.', accent: 'violet', skill: 'Connections' },
  { id: 'formation-fix', title: 'Formation Fix', shortTitle: 'Formation Fix', description: 'Read the pitch problem and choose the missing role.', instruction: 'Fix the highlighted zone.', accent: 'emerald', skill: 'Shape reading' },
] as const satisfies ReadonlyArray<{ id: QuizLabFormat; title: string; shortTitle: string; description: string; instruction: string; accent: string; skill: string }>

const oddOneOut: QuizLabChoiceQuestion[] = oddOneOutQuestionBank

const truthTrap: QuizLabChoiceQuestion[] = [
  { id:'trap-01', kind:'truth-trap', difficulty:'Starter', prompt:'Which statement about a throw-in is false?', options:['It uses both hands','It comes from behind and over the head','Both feet must be completely inside the field','Opponents must respect the required distance'], answer:'Both feet must be completely inside the field', explanation:'Part of each foot may be on or outside the touchline, but the feet must meet the Law at release.', takeaway:'Judge the release position, not an invented “inside the field” rule.' },
  { id:'trap-02', kind:'truth-trap', difficulty:'Sharp', prompt:'Which statement about scouting is false?', options:['Context can change how evidence is weighted','Missing evidence should be written down','One match can prove a player’s full ceiling','Role fit can change a recruitment decision'], answer:'One match can prove a player’s full ceiling', explanation:'A single match is only a sample. Projection needs repeated and varied evidence.', takeaway:'Strong conclusions need a strong evidence window.' },
  { id:'trap-03', kind:'truth-trap', difficulty:'Sharp', prompt:'Which statement about pressing is false?', options:['The first presser needs support','The team should protect the pass through the middle','Distances between lines matter','Every player should sprint at the ball independently'], answer:'Every player should sprint at the ball independently', explanation:'Uncoordinated pressure opens simple passes. Pressing works as a connected team action.', takeaway:'One player presses; the team closes the next options.' },
  { id:'trap-04', kind:'truth-trap', difficulty:'Starter', prompt:'Which statement about advantage is false?', options:['It should offer an immediate benefit','Possession alone is not always enough','The referee can return to some misconduct at the next stoppage','It must be played after every foul'], answer:'It must be played after every foul', explanation:'Advantage depends on a real benefit. Sometimes the free kick is better.', takeaway:'Ask what the team gains in the next few seconds.' },
  { id:'trap-05', kind:'truth-trap', difficulty:'Expert', prompt:'Which statement about an offside position is false?', options:['It is judged when a team-mate plays or touches the ball','Position alone is not an offence','A player can interfere with an opponent','Any defender touch always resets offside'], answer:'Any defender touch always resets offside', explanation:'A deflection or deliberate save does not reset offside in the way a deliberate play can.', takeaway:'Read the defender’s action, not contact alone.' },
  { id:'trap-06', kind:'truth-trap', difficulty:'Sharp', prompt:'Which statement about a low block is false?', options:['Width can stretch it','Rotations can move it','Cut-backs can attack space behind its midfield line','Repeated hopeful crosses are always the only answer'], answer:'Repeated hopeful crosses are always the only answer', explanation:'Crosses can work, but a settled block can also be moved with width, switches, rotations and varied box occupation.', takeaway:'Change the picture before forcing the final ball.' },
  { id:'trap-07', kind:'truth-trap', difficulty:'Starter', prompt:'Which goalkeeper statement is false?', options:['Starting position affects sweeping','Communication can prevent danger','Distribution choices matter','Save totals tell the whole story'], answer:'Save totals tell the whole story', explanation:'Save volume depends heavily on team context and shot quality. The full role needs broader evidence.', takeaway:'Count the action, then understand why it happened.' },
  { id:'trap-08', kind:'truth-trap', difficulty:'Sharp', prompt:'Which statement about a counter-attack is false?', options:['The first forward pass can matter','Runners should use different lanes','The ball carrier should scan before releasing','Every runner should crowd the ball'], answer:'Every runner should crowd the ball', explanation:'Crowding the ball removes width and depth. Different lanes make defenders choose.', takeaway:'Fast attacks still need spacing.' },
  { id:'trap-09', kind:'truth-trap', difficulty:'Expert', prompt:'Which referee statement is false?', options:['A careless foul does not automatically need a card','A reckless challenge requires a caution','Excessive force can require a sending-off','Every physical challenge is a foul'], answer:'Every physical challenge is a foul', explanation:'Football permits fair physical contact. The referee judges the nature and consequence of the challenge.', takeaway:'Contact alone is not the decision.' },
  { id:'trap-10', kind:'truth-trap', difficulty:'Starter', prompt:'Which mini-league statement is false?', options:['A clear scoring rule helps everyone','Players should know the time window','A join code can connect friends','The owner should secretly change results'], answer:'The owner should secretly change results', explanation:'Rules and results should stay transparent. Owners choose the format, not the winners.', takeaway:'Friendly competition still needs trusted rules.' },
  { id:'trap-11', kind:'truth-trap', difficulty:'Sharp', prompt:'Which statement about receiving between the lines is false?', options:['Scanning before the pass helps','Body shape can open the next action','Support around the receiver matters','Standing still behind a marker guarantees space'], answer:'Standing still behind a marker guarantees space', explanation:'A receiver must move into a visible passing lane and prepare for pressure.', takeaway:'Arrive where the passer can see you.' },
  { id:'trap-12', kind:'truth-trap', difficulty:'Expert', prompt:'Which statement about substitutions is false?', options:['A change should solve the actual match problem','Role clarity matters after the change','Game state affects risk','The highest-rated player must always come on'], answer:'The highest-rated player must always come on', explanation:'The best substitution is the profile that solves the current problem, not automatically the biggest name or rating.', takeaway:'Choose the role the match needs.' },
]

const orderThePlay: QuizLabOrderQuestion[] = [
  { id:'order-01', kind:'order-the-play', difficulty:'Starter', prompt:'Build the referee’s clean decision sequence.', items:['Set the restart','Observe what happened','Choose any card','Identify the offence'], answer:['Observe what happened','Identify the offence','Choose any card','Set the restart'], explanation:'The referee first sees the action, identifies the offence, handles discipline and then manages the restart.', takeaway:'Observe → offence → sanction → restart.' },
  { id:'order-02', kind:'order-the-play', difficulty:'Sharp', prompt:'Put a scouting report into a sensible order.', items:['Record the evidence','Make a recommendation','State what is still unknown','Explain what the evidence may mean'], answer:['Record the evidence','Explain what the evidence may mean','State what is still unknown','Make a recommendation'], explanation:'Observation should come before interpretation, uncertainty and the final recommendation.', takeaway:'Evidence first; judgement last.' },
  { id:'order-03', kind:'order-the-play', difficulty:'Sharp', prompt:'Order a simple high-press trap.', items:['Team squeezes behind the press','Show play toward the chosen side','First player presses on the trigger','Nearest team-mates close short exits'], answer:['Show play toward the chosen side','First player presses on the trigger','Nearest team-mates close short exits','Team squeezes behind the press'], explanation:'The team shapes the pass, jumps together, removes exits and stays compact behind it.', takeaway:'A press is a chain, not a solo sprint.' },
  { id:'order-04', kind:'order-the-play', difficulty:'Starter', prompt:'Order the steps after winning the ball for a counter-attack.', items:['Attack the exposed space','Secure the first touch','Scan for pressure and runners','Choose pass or carry'], answer:['Secure the first touch','Scan for pressure and runners','Choose pass or carry','Attack the exposed space'], explanation:'Control and information come before the decision and final acceleration.', takeaway:'Win it, see it, choose it, attack it.' },
  { id:'order-05', kind:'order-the-play', difficulty:'Expert', prompt:'Order a safe substitution process.', items:['Explain the new role','Check the match problem','Review the effect after the change','Choose the profile that solves it'], answer:['Check the match problem','Choose the profile that solves it','Explain the new role','Review the effect after the change'], explanation:'Diagnose first, choose the right profile, communicate clearly and then check whether the change worked.', takeaway:'A substitution is a solution, not just a new player.' },
  { id:'order-06', kind:'order-the-play', difficulty:'Sharp', prompt:'Order the build-up steps against a high press.', items:['Play through or around the free route','Create width and depth','Find where the spare player is','Move the ball to draw pressure'], answer:['Create width and depth','Find where the spare player is','Move the ball to draw pressure','Play through or around the free route'], explanation:'The shape creates choices, scanning finds the spare, circulation moves the press and the team uses the opening.', takeaway:'Shape → scan → draw → escape.' },
  { id:'order-07', kind:'order-the-play', difficulty:'Starter', prompt:'Order the way to answer a hard quiz fairly.', items:['Read every option','Choose the best answer','Read the explanation','Read the full question'], answer:['Read the full question','Read every option','Choose the best answer','Read the explanation'], explanation:'A careful read comes before the choice, and feedback finishes the learning loop.', takeaway:'Question → choices → answer → why.' },
  { id:'order-08', kind:'order-the-play', difficulty:'Expert', prompt:'Order the response to a lost ball in midfield.', items:['Decide whether to press or recover','Protect the centre','Nearest player delays the attack','Team regains compact spacing'], answer:['Nearest player delays the attack','Protect the centre','Decide whether to press or recover','Team regains compact spacing'], explanation:'Immediate delay buys time, central protection removes the quickest threat, and the team can then press or recover together.', takeaway:'Delay first; recover as one team.' },
  { id:'order-09', kind:'order-the-play', difficulty:'Sharp', prompt:'Order a corner-kick routine before delivery.', items:['Attack assigned zones','Check counter-attack cover','Confirm each player’s role','Deliver on the movement cue'], answer:['Confirm each player’s role','Check counter-attack cover','Deliver on the movement cue','Attack assigned zones'], explanation:'Roles and protection must be clear before the cue starts the delivery and runs.', takeaway:'Clarity before movement.' },
  { id:'order-10', kind:'order-the-play', difficulty:'Starter', prompt:'Order a fair player comparison.', items:['Make the judgement','Compare the same role and level','Collect enough actions','Note the match context'], answer:['Note the match context','Compare the same role and level','Collect enough actions','Make the judgement'], explanation:'Context and comparable samples make the final judgement more useful.', takeaway:'Compare like with like.' },
  { id:'order-11', kind:'order-the-play', difficulty:'Expert', prompt:'Order the way a team should manage a one-goal lead late on.', items:['Use safe moments to keep the ball','Protect central counter routes','Read the opponent’s new risk','Keep one useful outlet'], answer:['Read the opponent’s new risk','Protect central counter routes','Keep one useful outlet','Use safe moments to keep the ball'], explanation:'The team reads the threat, protects the fastest route, keeps an escape and uses possession to reduce pressure.', takeaway:'Control space and the ball, not just the penalty box.' },
  { id:'order-12', kind:'order-the-play', difficulty:'Sharp', prompt:'Order the steps for checking a possible head injury.', items:['Restart only when it is safe and correct','Stop play for serious concern','Allow medical assessment','Notice the signs and player reaction'], answer:['Notice the signs and player reaction','Stop play for serious concern','Allow medical assessment','Restart only when it is safe and correct'], explanation:'Player safety begins with recognition and a prompt stoppage before assessment and the correct restart.', takeaway:'Safety comes before match flow.' },
]

const linkUp: QuizLabLinkQuestion[] = [
  { id:'link-01', kind:'link-up', difficulty:'Starter', prompt:'Match each role to its main reference point.', pairs:[{left:'Goalkeeper',right:'Goal and penalty area'},{left:'Centre-back',right:'Last defensive line'},{left:'Number six',right:'Space in front of the defence'},{left:'Centre-forward',right:'Highest attacking line'}], rightOptions:['Highest attacking line','Space in front of the defence','Goal and penalty area','Last defensive line'], explanation:'Each role starts with a different line or space, even though players move during the match.', takeaway:'Know the home position before reading the movement.' },
  { id:'link-02', kind:'link-up', difficulty:'Sharp', prompt:'Match the referee word to its meaning.', pairs:[{left:'Careless',right:'Foul without an automatic card'},{left:'Reckless',right:'Yellow-card challenge'},{left:'Excessive force',right:'Red-card challenge'},{left:'Advantage',right:'Let play continue for a real benefit'}], rightOptions:['Let play continue for a real benefit','Red-card challenge','Foul without an automatic card','Yellow-card challenge'], explanation:'The words describe different levels of risk or a decision to let useful play continue.', takeaway:'The exact word changes the decision.' },
  { id:'link-03', kind:'link-up', difficulty:'Starter', prompt:'Match the restart to what normally sends the ball out.', pairs:[{left:'Throw-in',right:'Ball crosses the touchline'},{left:'Goal kick',right:'Attack last touches over the goal line'},{left:'Corner kick',right:'Defence last touches over the goal line'},{left:'Kick-off',right:'A goal or half begins'}], rightOptions:['A goal or half begins','Defence last touches over the goal line','Ball crosses the touchline','Attack last touches over the goal line'], explanation:'The last touch and the boundary crossed determine these common restarts.', takeaway:'Touchline or goal line—then ask who touched it last.' },
  { id:'link-04', kind:'link-up', difficulty:'Sharp', prompt:'Match the scouting section to the question it answers.', pairs:[{left:'Observation',right:'What happened?'},{left:'Interpretation',right:'What might it mean?'},{left:'Missing evidence',right:'What do we still need?'},{left:'Recommendation',right:'What should the club do next?'}], rightOptions:['What should the club do next?','What happened?','What do we still need?','What might it mean?'], explanation:'A clear report separates what the scout saw from meaning, uncertainty and action.', takeaway:'Do not hide opinion inside observation.' },
  { id:'link-05', kind:'link-up', difficulty:'Expert', prompt:'Match the attacking movement to the space it threatens.', pairs:[{left:'Overlap',right:'Outside the ball carrier'},{left:'Underlap',right:'Inside the ball carrier'},{left:'Run in behind',right:'Space beyond the last line'},{left:'Drop short',right:'Space in front of the last line'}], rightOptions:['Space in front of the last line','Outside the ball carrier','Space beyond the last line','Inside the ball carrier'], explanation:'The run label describes the route relative to the ball carrier or defensive line.', takeaway:'Different routes move different defenders.' },
  { id:'link-06', kind:'link-up', difficulty:'Sharp', prompt:'Match the pressing action to its job.', pairs:[{left:'First press',right:'Force the next pass'},{left:'Cover shadow',right:'Block a passing lane while pressing'},{left:'Squeeze up',right:'Reduce space behind the press'},{left:'Recovery run',right:'Protect goal-side space after the press breaks'}], rightOptions:['Reduce space behind the press','Force the next pass','Protect goal-side space after the press breaks','Block a passing lane while pressing'], explanation:'Pressing works because several connected jobs happen at the same time.', takeaway:'Pressure, block, squeeze, recover.' },
  { id:'link-07', kind:'link-up', difficulty:'Starter', prompt:'Match the competition to its country.', pairs:[{left:'Premier League',right:'England'},{left:'La Liga',right:'Spain'},{left:'Ligue 1',right:'France'},{left:'Bundesliga',right:'Germany'}], rightOptions:['Germany','France','England','Spain'], explanation:'These are the highest national divisions in England, Spain, France and Germany.', takeaway:'Four familiar rooms, four different countries.' },
  { id:'link-08', kind:'link-up', difficulty:'Expert', prompt:'Match the offside idea to the example.', pairs:[{left:'Position only',right:'No involvement in play'},{left:'Interfering with play',right:'Touches a team-mate’s pass'},{left:'Interfering with an opponent',right:'Blocks the goalkeeper’s view'},{left:'Gaining an advantage',right:'Plays a rebound from the post'}], rightOptions:['Plays a rebound from the post','No involvement in play','Blocks the goalkeeper’s view','Touches a team-mate’s pass'], explanation:'An attacker in an offside position is penalised only when one of the involvement conditions is met.', takeaway:'Find the involvement after checking the position.' },
  { id:'link-09', kind:'link-up', difficulty:'Sharp', prompt:'Match the game state to the clearest priority.', pairs:[{left:'Leading late',right:'Protect central routes and keep an outlet'},{left:'Trailing late',right:'Increase useful attacking occupation'},{left:'Level and in control',right:'Attack without losing rest defence'},{left:'Down to ten players',right:'Protect compactness and choose pressing moments'}], rightOptions:['Increase useful attacking occupation','Protect compactness and choose pressing moments','Attack without losing rest defence','Protect central routes and keep an outlet'], explanation:'Score, time and player numbers change the best balance of risk and control.', takeaway:'The same formation can need a different priority.' },
  { id:'link-10', kind:'link-up', difficulty:'Starter', prompt:'Match the quiz habit to its benefit.', pairs:[{left:'Read the explanation',right:'Learn why the answer works'},{left:'Replay later',right:'Practise retrieval again'},{left:'Try a harder room',right:'Add useful difficulty'},{left:'Join a mini league',right:'Compare under shared rules'}], rightOptions:['Compare under shared rules','Add useful difficulty','Learn why the answer works','Practise retrieval again'], explanation:'Good quiz habits combine feedback, spaced retrieval, challenge and social play.', takeaway:'A score is useful; learning why is better.' },
  { id:'link-11', kind:'link-up', difficulty:'Expert', prompt:'Match the defensive body shape to its purpose.', pairs:[{left:'Side-on',right:'See ball and runner'},{left:'Goal-side',right:'Protect the route toward goal'},{left:'Open stance in midfield',right:'Receive and play forward'},{left:'Low balanced stance',right:'React in a one-versus-one'}], rightOptions:['React in a one-versus-one','Protect the route toward goal','Receive and play forward','See ball and runner'], explanation:'Body shape gives the player information and makes the next movement easier.', takeaway:'Position the body for what might happen next.' },
  { id:'link-12', kind:'link-up', difficulty:'Sharp', prompt:'Match the evidence problem to the safer scouting response.', pairs:[{left:'Only one match watched',right:'Collect a larger sample'},{left:'Role changed at halftime',right:'Separate evidence by role'},{left:'Opponent was much weaker',right:'Test against matched opposition'},{left:'Player returning from injury',right:'Check the return-to-play context'}], rightOptions:['Check the return-to-play context','Collect a larger sample','Test against matched opposition','Separate evidence by role'], explanation:'The response should directly reduce the uncertainty in the evidence.', takeaway:'Name the uncertainty, then plan the next observation.' },
]

const formationFix: QuizLabChoiceQuestion[] = [
  { id:'shape-01', kind:'formation-fix', difficulty:'Starter', visual:'goal', prompt:'Your back four is set, but nobody protects the space straight in front of the centre-backs. Which role is missing?', options:['Holding midfielder','Touchline winger','Second striker','Overlapping full-back'], answer:'Holding midfielder', explanation:'A holding midfielder can screen central passes and support the first pass after a regain.', takeaway:'Protect the space before danger reaches the back line.' },
  { id:'shape-02', kind:'formation-fix', difficulty:'Sharp', visual:'wide', prompt:'Your winger keeps moving inside and the opponent’s full-back can stay narrow. Which role restores width?', options:['Outside full-back run','Second holding midfielder','Deep centre-forward','Narrow number ten'], answer:'Outside full-back run', explanation:'An outside run occupies the touchline lane and forces the defender to make a new choice.', takeaway:'If one player comes inside, another can hold the outside.' },
  { id:'shape-03', kind:'formation-fix', difficulty:'Sharp', visual:'depth', prompt:'The opponent presses high and every midfielder comes short. What is missing?', options:['A run beyond the last line','Another player beside the ball','A slower square pass','Both full-backs standing still'], answer:'A run beyond the last line', explanation:'Depth stretches the press and can create room for players who want the ball short.', takeaway:'A team needs options to feet and beyond.' },
  { id:'shape-04', kind:'formation-fix', difficulty:'Starter', visual:'centre', prompt:'Both full-backs attack at once and the centre is empty after losing the ball. Which role best repairs the shape?', options:['A midfielder holding behind the attack','Another player in the penalty box','A winger on each touchline only','A striker dropping into the same space'], answer:'A midfielder holding behind the attack', explanation:'A holding player protects the centre and supports the centre-backs during transition.', takeaway:'Rest defence begins while your team is attacking.' },
  { id:'shape-05', kind:'formation-fix', difficulty:'Expert', visual:'half-space', prompt:'A low block protects the middle. Your winger is wide and striker is pinned. Which role can arrive in the inside channel?', options:['A number eight making a timed half-space run','The goalkeeper joining the box','Both centre-backs overlapping','The winger leaving the entire side empty'], answer:'A number eight making a timed half-space run', explanation:'A timed run between the full-back and centre-back adds a new threat without crowding the striker.', takeaway:'Arrive at a different height and angle.' },
  { id:'shape-06', kind:'formation-fix', difficulty:'Sharp', visual:'left', prompt:'Your left-back is isolated two-versus-one. What support is missing first?', options:['A recovering left winger or near midfielder','The right winger crossing the whole pitch','The striker standing offside','The goalkeeper taking a corner position'], answer:'A recovering left winger or near midfielder', explanation:'The nearest wide or midfield support should help match the overload while the team shifts across.', takeaway:'Solve the nearest overload, then rebalance.' },
  { id:'shape-07', kind:'formation-fix', difficulty:'Starter', visual:'goal', prompt:'Crosses arrive freely and nobody attacks the first contact in front of goal. Which role must take responsibility?', options:['Near-side centre-back','Far winger waiting at halfway','Attacking number ten','Corner taker'], answer:'Near-side centre-back', explanation:'The near-side centre-back normally attacks the dangerous first contact while team-mates cover nearby zones.', takeaway:'Defend the first danger before the second ball.' },
  { id:'shape-08', kind:'formation-fix', difficulty:'Expert', visual:'centre', prompt:'Your number six is pressed from behind and both number eights stand on the same line. What movement fixes the picture?', options:['One number eight drops or moves to a new angle','Both eights stand even closer together','The centre-backs stop offering passes','The striker returns to the goalkeeper'], answer:'One number eight drops or moves to a new angle', explanation:'A different height creates a new passing lane and can free the pivot through a third-player action.', takeaway:'Different heights beat one flat line.' },
  { id:'shape-09', kind:'formation-fix', difficulty:'Sharp', visual:'right', prompt:'The right winger receives with no player outside and two defenders can trap the ball. What support is missing?', options:['An overlap or safe bounce option','A second ball carrier in the same spot','The left centre-back beside the winger','Every midfielder inside the penalty area'], answer:'An overlap or safe bounce option', explanation:'Outside movement or a secure return pass gives the winger a route away from the trap.', takeaway:'Give the ball carrier two exits.' },
  { id:'shape-10', kind:'formation-fix', difficulty:'Starter', visual:'centre', prompt:'Your team presses, but a simple pass keeps finding the opponent’s midfielder alone. Which role needs correcting?', options:['The player screening the central pass','The far corner taker','The substitute goalkeeper','The deepest striker only'], answer:'The player screening the central pass', explanation:'Pressure on the ball must be connected to cover of the easiest central option.', takeaway:'Press the ball and block the next pass.' },
  { id:'shape-11', kind:'formation-fix', difficulty:'Expert', visual:'depth', prompt:'You lead late and clearances keep returning because every attacker drops into your box. What role is missing?', options:['A forward outlet who can hold or chase the ball','Another defender on the goal line','A second goalkeeper','A winger marking the referee'], answer:'A forward outlet who can hold or chase the ball', explanation:'One useful outlet can relieve pressure, win territory and stop the opponent restarting every attack immediately.', takeaway:'Defending a lead still needs a way out.' },
  { id:'shape-12', kind:'formation-fix', difficulty:'Sharp', visual:'half-space', prompt:'Your striker drops short, but nobody attacks the space they leave behind. Which role should react?', options:['An opposite winger or midfielder running beyond','The goalkeeper moving into midfield','Both full-backs dropping to the corner flags','The nearest player standing beside the striker'], answer:'An opposite winger or midfielder running beyond', explanation:'The short movement can pull a defender out; a second runner should threaten the newly opened depth.', takeaway:'One player comes short so another can go long.' },
]

// Kept temporarily as a migration reference for the original twelve-question
// rooms. The live banks below use the expanded, validated 240-item libraries.
void truthTrap
void orderThePlay
void linkUp
void formationFix

export const quizLabQuestionBank: Record<QuizLabFormat, QuizLabQuestion[]> = {
  'odd-one-out': oddOneOut,
  'truth-trap': truthTrapQuestionBank,
  'order-the-play': orderThePlayQuestionBank,
  'link-up': linkUpQuestionBank,
  'formation-fix': formationFixQuestionBank,
}

export function quizLabFormatById(format: string) {
  return quizLabFormats.find((item) => item.id === format)
}

export function quizLabCorrectAnswer(question: QuizLabQuestion) {
  if (question.kind === 'order-the-play') return question.answer.join(' > ')
  if (question.kind === 'link-up') return question.pairs.map((pair) => `${pair.left} = ${pair.right}`).join(' | ')
  return question.answer
}

export function quizLabDifficultyText(question: QuizLabQuestion) {
  if (question.kind === 'order-the-play') return `${question.prompt} ${question.items.join(' ')}`
  if (question.kind === 'link-up') return `${question.prompt} ${question.pairs.map((pair) => `${pair.left} ${pair.right}`).join(' ')}`
  return `${question.prompt} ${question.options.join(' ')}`
}

export function quizLabQuestionFamilyId(question: QuizLabQuestion) {
  const match = /^(.*?)-(\d+)$/.exec(question.id)
  if (!match) return question.id
  const questionNumber = Number(match[2])
  const familyCount = QUIZ_LAB_ROUND_COUNT * 3
  return `${match[1]}-${((questionNumber - 1) % familyCount) + 1}`
}

export function quizLabRoundCount(format: QuizLabFormat) {
  const count = quizLabQuestionBank[format].length / QUIZ_LAB_ROUND_SIZE
  if (!Number.isSafeInteger(count)) throw new Error(`${format} does not split into complete Quiz Lab rounds.`)
  return count
}

export function quizLabRoundName(format: QuizLabFormat, round: number) {
  if (format === 'odd-one-out') return oddOneOutRoundNames[round - 1] ?? `Odd One Out Round ${round}`
  return quizLabRoundNames[round - 1] ?? `${quizLabFormatById(format)?.title ?? 'Quiz Lab'} Round ${round}`
}

export function getQuizLabRound(format: QuizLabFormat, round = 1) {
  const bank = quizLabQuestionBank[format]
  const roundCount = quizLabRoundCount(format)
  if (!Number.isSafeInteger(round) || round < 1 || round > roundCount) {
    throw new Error(`${quizLabFormatById(format)?.title ?? 'Quiz Lab'} round is outside the available range.`)
  }
  const start = (round - 1) * QUIZ_LAB_ROUND_SIZE
  return bank.slice(start, start + QUIZ_LAB_ROUND_SIZE)
}

export function validateQuizLab() {
  const errors: string[] = []
  const ids = new Set<string>()
  for (const format of quizLabFormats) {
    const questions = quizLabQuestionBank[format.id]
    if (questions.length !== QUIZ_LAB_ROUND_COUNT * QUIZ_LAB_ROUND_SIZE) errors.push(`${format.id}: expected exactly 240 questions`)
    for (const question of questions) {
      if (ids.has(question.id)) errors.push(`${question.id}: duplicate id`)
      ids.add(question.id)
      if (!question.explanation || !question.takeaway) errors.push(`${question.id}: missing feedback`)
      if (question.kind === 'order-the-play' && (question.items.length !== 4 || question.answer.length !== 4 || new Set(question.answer).size !== 4)) errors.push(`${question.id}: invalid sequence`)
      if (question.kind === 'link-up' && (question.pairs.length !== 4 || question.rightOptions.length !== 4 || new Set(question.rightOptions).size !== 4)) errors.push(`${question.id}: invalid links`)
      if ((question.kind === 'odd-one-out' || question.kind === 'truth-trap' || question.kind === 'formation-fix') && (question.options.length !== 4 || new Set(question.options).size !== 4 || !question.options.includes(question.answer))) errors.push(`${question.id}: invalid choices`)
    }
  }
  return errors
}
