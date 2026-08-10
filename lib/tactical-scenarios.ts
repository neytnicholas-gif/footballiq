export type TacticalScenario = {
  id: string
  category: 'Build-up' | 'Pressing' | 'Transition' | 'Game management' | 'Rest defence' | 'Overloads' | 'Defensive block' | 'Final third' | 'Set pieces'
  difficulty: 'Starter' | 'Sharp' | 'Expert'
  prompt: string
  context: string
  options: string[]
  answer: number
  principle: string
  explanation: string
  alternatives: string
  sourceUrl: string
}

const fifaTacticalSource = 'https://www.fifatrainingcentre.com/en/fwc2022/technical-and-tactical-analysis/controlling-the-game-without-the-ball--the-mid-block-and-compactness.php'

const baseTacticalScenarios: TacticalScenario[] = [
  { id: 'tac-build-001', category: 'Build-up', difficulty: 'Starter', prompt: 'How should you create the clearest route through the first line?', context: 'Your 4-3-3 faces two forwards pressing the centre-backs. The goalkeeper is comfortable in possession and the opposition midfield is holding its shape.', options: ['Ask both full-backs to run beyond the wingers immediately', 'Use the goalkeeper to form a 3v2 and find the free player', 'Hit an early diagonal every time', 'Drop all three midfielders next to the centre-backs'], answer: 1, principle: 'Create a numerical advantage around the ball before progressing.', explanation: 'The goalkeeper can give the first line a 3v2. That should free one player to carry or pass beyond the press without emptying midfield.', alternatives: 'Early diagonals can be useful when the far side is open, but making them automatic becomes predictable. Dropping everyone short removes the next passing line.', sourceUrl: 'https://www.fifatrainingcentre.com/media/native/test/FIFA_Session_Plan_Flores_2-latest.pdf' },
  { id: 'tac-press-001', category: 'Pressing', difficulty: 'Sharp', prompt: 'What is the strongest pressing response?', context: 'The opposing right centre-back receives facing his own goal. His right-back is high, his nearest midfielder is screened, and your left winger can arrive on his outside shoulder.', options: ['Sprint straight at the ball from any angle', 'Hold a passive low block immediately', 'Curve the press to block the full-back pass and force play inside toward cover', 'Send both centre-backs forward to join the press'], answer: 2, principle: 'Pressure should remove an option and guide play toward supporting defenders.', explanation: 'A curved run can press the receiver while closing the easy outside pass. The team can then compress around the predictable inside route.', alternatives: 'A straight press may leave the full-back free. A low block gives up a strong trigger, while advancing centre-backs would expose the last line.', sourceUrl: fifaTacticalSource },
  { id: 'tac-transition-001', category: 'Transition', difficulty: 'Starter', prompt: 'What should the ball-winner look for first?', context: 'You regain possession centrally. The opponent has six players ahead of the ball, your winger is already running into space, and the central forward can pin one centre-back.', options: ['Play backwards regardless of pressure', 'Attack the open space quickly if the first forward pass is secure', 'Wait for every teammate to recover their position', 'Attempt a shot from the halfway line'], answer: 1, principle: 'Exploit temporary disorganisation when a secure forward action is available.', explanation: 'The opponent is least organised immediately after losing the ball. A controlled first forward pass can release the winger before the defensive block resets.', alternatives: 'Keeping the ball remains valid if the forward pass is unsafe. The scenario makes the forward route both available and supported, so delaying wastes the advantage.', sourceUrl: 'https://www.fifatrainingcentre.com/en/fwc2022/physical-analysis/viewing-match-physical-performances-through-a-tactical-lens--why-do-teams-run.php' },
  { id: 'tac-rest-001', category: 'Rest defence', difficulty: 'Expert', prompt: 'Which adjustment best protects the next turnover?', context: 'Your side attacks in a 3-2-5 against two quick forwards. Both holding midfielders have drifted toward the ball, leaving the centre exposed behind the attack.', options: ['Send all three defenders into the box', 'Keep one midfielder central and staggered behind the ball', 'Ask the goalkeeper to stand on the penalty spot', 'Move both wingers into the same half-space'], answer: 1, principle: 'Rest defence needs central cover, access to second balls and control of counter-attacking routes.', explanation: 'A staggered central midfielder protects the direct counter, supports the back three and can compete for a clearance without crowding the attack.', alternatives: 'Adding more attackers increases exposure. Goalkeeper positioning can help depth, but cannot replace central cover in front of the defensive line.', sourceUrl: fifaTacticalSource },
  { id: 'tac-overload-001', category: 'Overloads', difficulty: 'Sharp', prompt: 'How do you turn the wide overload into penetration?', context: 'Your left winger, full-back and number eight have a 3v2 near the touchline. The opposition far-side winger has narrowed and the switch to your right winger is open.', options: ['Keep circulating only within the crowded triangle', 'Force a dribble between both defenders', 'Draw the two defenders toward the ball, then switch quickly to the free winger', 'Return to the goalkeeper and stop the attack'], answer: 2, principle: 'An overload can attract pressure and create a free player elsewhere.', explanation: 'The local 3v2 fixes the near-side defenders. A quick switch then reaches the weak side before the narrowed winger can recover.', alternatives: 'The triangle may still combine through the block, but the clearly free far-side player offers more space and a cleaner forward picture.', sourceUrl: 'https://www.fifatrainingcentre.com/en/fwc2022/fwc2022.php' },
  { id: 'tac-game-001', category: 'Game management', difficulty: 'Expert', prompt: 'What is the best-supported team decision?', context: 'You lead 1-0 with eight minutes left. The opponent has moved to two strikers and is attacking through repeated crosses. Your winger is tiring, but you still need an outlet to prevent constant pressure.', options: ['Remove every forward and defend the penalty area with ten players', 'Keep the same shape regardless of fatigue', 'Add fresh wide defensive support while retaining one forward outlet', 'Press with every player on every restart'], answer: 2, principle: 'Protect the threatened zone without surrendering every route out of pressure.', explanation: 'Fresh wide support helps defend crosses, while one outlet can secure clearances, win fouls and stop the opponent from committing everyone forward.', alternatives: 'A total retreat can invite continuous attacks. An unchanged shape ignores the fatigue described, while an all-out press creates unnecessary late-game space.', sourceUrl: fifaTacticalSource },
]

type TacticalFamily = {
  id: string
  category: TacticalScenario['category']
  principle: string
  sourceUrl: string
  distractors: [string, string, string]
  cases: Array<[string, string, string, string]>
}

const fifaCore = 'https://www.fifatrainingcentre.com/en/game/game-analysis/landing-page-core-principles.php'
const fifaBuild = 'https://www.fifatrainingcentre.com/en/practice/talent-coach-programme/build-and-progress/progressing-through-the-thirds.php'
const fifaCounterPress = 'https://www.fifatrainingcentre.com/en/practice/elite-sessions/transition-to-defending/counter-pressing.php'

const tacticalFamilies: TacticalFamily[] = [
  { id:'build', category:'Build-up', principle:'Create a free player in the first line, then connect beyond the press rather than gathering everyone around the ball.', sourceUrl:fifaBuild, distractors:['Send every midfielder toward the ball','Play the same long pass regardless of pressure','Ask both centre-backs to dribble at the same time'], cases:[
    ['Two forwards press your centre-backs while the goalkeeper is free and your number six is marked.','What is the cleanest first-line solution?','Use the goalkeeper to create a 3v2, then find the free defender','The goalkeeper supplies the extra player without removing a midfielder from the next line.'],
    ['The opponent locks the centre with three narrow midfielders, but both full-backs are free outside.','Where should the build-up go first?','Circulate outside to a free full-back and make the block shift','Using the free width stretches the narrow midfield and can reopen an inside lane.'],
    ['Your number six is followed tightly when dropping between the centre-backs, leaving the number eight free behind the first press.','How should the team exploit the marking?','Use a third-player pass to find the free number eight','The marker’s movement opens the next line; a third-player connection accesses it without forcing the marked receiver.'],
    ['A centre-back receives with time while the opposing winger jumps late and the inside channel opens.','What is the strongest progression?','Carry forward to commit the winger before releasing the inside pass','The carry fixes the late presser and improves the receiving midfielder’s space.'],
  ]},
  { id:'high-press', category:'Pressing', principle:'A high press needs a trigger, curved pressure and connected cover; isolated running only opens passing lanes.', sourceUrl:fifaCore, distractors:['Sprint directly at the ball without screening','Leave the back line deep and disconnected','Send both full-backs to press the goalkeeper'], cases:[
    ['The goalkeeper plays to a centre-back facing their own goal near the touchline.','What is the best pressing trigger response?','Curve the nearest forward’s run to lock play toward the touchline','The curved run removes the easy return and lets the touchline act as an extra defender.'],
    ['A centre-back takes a heavy first touch while your front line is compact and ready.','How should the press react?','Accelerate together, with the nearest player pressing and others locking short exits','A poor touch is valuable only when the unit closes the next passes as well as the ball.'],
    ['The opponent repeatedly finds its number six behind your first two pressers.','What adjustment protects the press?','Ask the near midfielder to screen the six while the forward directs play outside','Screening the pivot removes the central escape and makes the press predictable for supporting players.'],
    ['Your striker presses alone while the midfield remains ten metres too deep.','What is the priority correction?','Move the midfield line forward before launching the next press','Compact distances allow second defenders to contest the next pass and protect space behind the striker.'],
  ]},
  { id:'mid-block', category:'Defensive block', principle:'A mid-block controls central space, keeps distances compact and presses when the ball enters a planned trap.', sourceUrl:fifaCore, distractors:['Follow every opponent man-for-man across the pitch','Keep every line flat and motionless','Allow free central receptions to protect the wings'], cases:[
    ['The opponent circulates between centre-backs without progressing while your 4-4-2 block stays compact.','When should the block jump?','Hold shape until a pass enters the planned wide pressing trap','Pressing from a stable trigger preserves compactness and avoids being moved by harmless circulation.'],
    ['An opposing full-back receives near the touchline with a closed body shape.','How should the near side defend?','Winger presses outside-in while full-back and midfielder cover inside options','The touchline and cover shadows reduce exits and keep the centre protected.'],
    ['The ball moves to the far side and your weak-side winger remains very wide.','What should the weak side do?','Narrow early to protect the centre and far-post channel','Weak-side compactness protects the most dangerous spaces while the block shifts.'],
    ['The opposing number ten drops between your midfield and defence.','What is the best collective response?','Compress the lines and pass responsibility rather than dragging a centre-back far out','Small vertical distances deny turning space without opening a channel behind the defence.'],
  ]},
  { id:'counterpress', category:'Transition', principle:'Counter-press when nearby numbers and cover can close forward routes; otherwise recover shape and protect the centre.', sourceUrl:fifaCounterPress, distractors:['Every player chases the ball from any distance','The back line retreats without pressure on the carrier','The nearest player dives into an uncontrolled tackle'], cases:[
    ['You lose the ball centrally with four team-mates within eight metres and the opponent receives facing their own goal.','What is the strongest reaction?','Counter-press immediately while covering the first forward pass','Numbers, distance and receiver orientation favour an organised attempt to regain.'],
    ['You lose possession near the corner flag with most team-mates ahead of the ball and the opponent can play forward first time.','Should the team counter-press or recover?','Delay the carrier briefly, then recover into a compact shape','Without supporting numbers, a full counter-press is likely to be bypassed; delay protects recovery time.'],
    ['The nearest defender presses after a turnover, but the next midfielder stays beside an opponent rather than covering inside.','What support is missing?','Protect the central escape lane behind the first presser','The first pressure needs cover so one pass cannot eliminate the entire counter-press.'],
    ['Your team regains the ball during a successful counter-press with a free forward lane.','What should happen next?','Attack forward quickly before the opponent reorganises','The regain has created disorganisation; secure forward play can turn it into a chance.'],
  ]},
  { id:'attack-transition', category:'Transition', principle:'After regaining possession, scan forward first, support at different depths and secure the ball when the counter is not viable.', sourceUrl:fifaCore, distractors:['Pass backwards automatically after every regain','Send all runners into the same channel','Shoot immediately from any distance'], cases:[
    ['You regain centrally against an exposed back three; the winger is free outside and the striker pins the middle defender.','What is the first attacking picture?','Release the winger early while supporting inside for the next action','Width stretches the back three and the inside support preserves a second route.'],
    ['A full-back regains near the touchline but is immediately surrounded by three opponents.','What is the safest productive decision?','Secure the first pass inside or backwards, then attack after escaping pressure','The counter is not available if the first receiver cannot protect the ball; retention comes first.'],
    ['Your number eight regains facing forward with two runners making identical central runs.','What improves the transition?','One runner widens while the other threatens depth','Different running lines stretch defenders and create a clearer choice for the ball-carrier.'],
    ['A centre-back intercepts and carries into midfield while the opponent’s midfield retreats.','How should nearby players help?','Run beyond and beside the carrier to force defenders into competing decisions','Layered support creates depth and a secure release rather than leaving the carrier isolated.'],
  ]},
  { id:'rest-defence', category:'Rest defence', principle:'Attacking structure must preserve central cover, pressure on clearances and protection against the opponent’s fastest outlets.', sourceUrl:'https://www.fifatrainingcentre.com/en/fifa-world-cup-2026/building-up-in-a-back-three-and-exploiting-inside-channels.php', distractors:['Commit every defender into the penalty area','Mark only the goalkeeper during attacks','Keep all midfielders on the same horizontal line'], cases:[
    ['Your team attacks with five players high against two fast forwards who stay central.','What is the minimum protective picture?','Keep a connected 3v2 or equivalent cover behind the attack','A spare defender plus central access helps control direct counters and second balls.'],
    ['Both full-backs advance and the number six drifts wide toward the ball.','What positional correction is most urgent?','Restore one central player behind the ball before forcing the next attack','Central protection matters because the first counter pass will target the space the six abandoned.'],
    ['A cross is about to be delivered while two defenders stand unopposed near halfway.','Where should the nearest midfielder position?','Under the ball and goal-side of the opponent’s first outlet','That position supports the second ball and blocks the quickest counter route.'],
    ['The opponent leaves one winger extremely wide for transitions while your far-side full-back attacks the box.','How should the team manage the risk?','Hold a covering player in the winger’s channel or delay the far-side run','Protecting the known outlet prevents one clearance from becoming an uncontested counter.'],
  ]},
  { id:'overload', category:'Overloads', principle:'Use an overload to attract and fix opponents, then exploit the free player locally or on the weak side.', sourceUrl:fifaCore, distractors:['Keep passing inside the crowded area forever','Force the first dribble regardless of cover','Move every attacker toward the ball'], cases:[
    ['Your winger, full-back and eight create a 3v2 outside, and the far winger is isolated against one defender.','How can the overload create the best next advantage?','Draw the near defenders, then switch quickly to the far winger','The local numbers force the block to shift and increase space for the weak-side duel.'],
    ['A full-back overlaps while the winger receives inside and pins the opposing midfielder.','Which action uses the local 2v1?','Release the overlapping full-back after the defender commits inside','The winger fixes the defender, creating the timing window for the outside runner.'],
    ['The opponent doubles your winger, leaving your number eight free at the edge of the area.','What should the winger prioritise?','Set the ball back to the free eight before the double team closes','The extra defender creates a free supporting player; using them escapes pressure with control.'],
    ['Your side has four players around the ball but no player occupying the far side.','What is missing from the attack?','Weak-side width to stretch the block beyond the overload','An overload without opposite width lets the defence compress without conceding another threat.'],
  ]},
  { id:'final-third', category:'Final third', principle:'Create finishing chances by fixing defenders, occupying different lines and matching the delivery to the runners and defensive shape.', sourceUrl:fifaCore, distractors:['Put every attacker on the penalty spot','Cross at the first possible moment without scanning','Keep all runners behind the ball'], cases:[
    ['The winger reaches the byline while the defence retreats toward goal and the number eight arrives late.','Which delivery has the clearest value?','Cut the ball back into the late runner’s path','Retreating defenders protect the goal line; the late runner attacks the space they leave in front.'],
    ['Your striker drops between the lines and a centre-back follows tightly.','How should a wide forward react?','Run into the channel opened behind the tracking centre-back','The striker’s movement fixes and removes a defender, creating depth for the third-player run.'],
    ['A low block protects the six-yard box while your team has clean possession outside.','What improves chance quality?','Use rotations and switches to move the block before choosing the final pass','Moving defenders creates a gap; repeated hopeful crosses play into a settled block’s strength.'],
    ['The ball is wide and the striker attacks the near post while the opposite winger stays outside the box.','What run balances the penalty area?','The far winger attacks the back-post space at a different height','Staggered occupation covers multiple delivery zones and stretches the last line.'],
  ]},
  { id:'set-piece', category:'Set pieces', principle:'Set pieces need role clarity, legal movement, protection against transitions and a delivery matched to the target zone.', sourceUrl:fifaCore, distractors:['Send all ten outfield players into the box','Change every role after the whistle','Ignore the opponent’s counter-attackers'], cases:[
    ['At an attacking corner, the opponent leaves two quick players near halfway.','How should your team balance attack and protection?','Keep enough cover to control both outlets while maintaining box targets','The attacking plan must not allow one clearance to create a numerical counter.'],
    ['Your best aerial target is tightly blocked in a static starting position.','What legal movement can improve access?','Use coordinated decoy and delayed runs without holding defenders','Different timings can free the target while remaining within the Laws.'],
    ['A wide free kick is too far for a reliable direct shot and the defensive line holds high.','What delivery best tests the line?','Attack the space behind with timed runs and a driven service','The high line leaves depth; timing and delivery speed determine whether runners can exploit it.'],
    ['Defending a short corner, one player presses the ball and nobody protects the two-versus-one outside.','What is the immediate correction?','Send a second defender while the block adjusts the near-post zone','The short option creates a local overload that must be matched without abandoning central roles.'],
  ]},
  { id:'substitution', category:'Game management', principle:'Substitutions should solve the actual game-state problem while preserving outlets and role clarity.', sourceUrl:fifaCore, distractors:['Replace the highest-rated player regardless of role','Change formation without telling the players','Remove every attacking outlet when leading'], cases:[
    ['You lead late, the opponent attacks repeatedly down your tired left side, and your striker still holds the ball well.','Which change best addresses the match?','Add fresh left-side defensive support while retaining the striker outlet','The change protects the threatened channel without inviting constant pressure through total retreat.'],
    ['You trail against a narrow low block, but both current wingers keep moving inside.','What profile should the next substitute add?','A player who will hold width and threaten the outside lane','Real width stretches the narrow block and creates crossing or cut-back access.'],
    ['Your high press has lost intensity because the front line is fatigued while midfield remains aggressive.','What substitution has the clearest tactical purpose?','Refresh a forward who can lead and repeat the pressing triggers','Fresh first-line pressure reconnects the existing midfield aggression to the pressing plan.'],
    ['A young player on a caution is repeatedly isolated against a fast winger with no cover.','What is the responsible adjustment?','Provide immediate cover or replace the player before the risk repeats','Game management should address both the tactical mismatch and disciplinary risk.'],
  ]},
  { id:'score-state', category:'Game management', principle:'Manage risk according to score, time, field position and team control rather than using a single rule for every late phase.', sourceUrl:fifaCore, distractors:['Attack with maximum numbers in every scoreline','Take the ball to the corner from the first minute','Defend permanently on the edge of the six-yard box'], cases:[
    ['Level with five minutes left in a knockout match, your team is controlling possession but vulnerable to direct counters.','What is the balanced approach?','Keep attacking with rest-defence cover and choose moments to commit extra runners','Control and protection allow pursuit of the win without turning every attack into a transition gamble.'],
    ['Leading by one in stoppage time, you win possession near the opponent’s corner with support close by.','What is the highest-value choice?','Protect the ball in the corner and force the opponent to take risks','Territory and ball protection reduce the opponent’s remaining attacking time.'],
    ['Trailing by one with ten minutes left, your centre-backs circulate slowly while the opponent’s block is settled.','What must change first?','Increase circulation speed and position more receivers between and beyond lines','Faster movement and higher occupation create more decisions for the settled block without abandoning structure.'],
    ['Leading comfortably, your number six is on a yellow card and the opponent targets transitions through their zone.','What is the prudent game-state decision?','Consider a controlled replacement before fatigue creates a second-card risk','The score reduces the value of accepting avoidable disciplinary and transition risk.'],
  ]},
]

function tacticalOptions(correct: string, distractors: [string, string, string], seed: number) {
  const values = [correct, ...distractors]
  const shift = seed % 4
  const options = [...values.slice(shift), ...values.slice(0, shift)]
  return { options, answer: options.indexOf(correct) }
}

const expandedTacticalScenarios: TacticalScenario[] = tacticalFamilies.flatMap((family, familyIndex) => family.cases.map(([context, prompt, correct, explanation], caseIndex) => {
  const choice = tacticalOptions(correct, family.distractors, familyIndex + caseIndex)
  return {
    id: `tac-${family.id}-${caseIndex + 1}`,
    category: family.category,
    difficulty: (['Starter', 'Sharp', 'Expert'] as const)[(familyIndex + caseIndex) % 3],
    prompt,
    context,
    options: choice.options,
    answer: choice.answer,
    principle: family.principle,
    explanation,
    alternatives: `The other options either ignore the described space, disconnect supporting players or apply a fixed action without reading the game state.`,
    sourceUrl: family.sourceUrl,
  }
}))

const coreTacticalScenarios: TacticalScenario[] = [...baseTacticalScenarios, ...expandedTacticalScenarios]

const tacticalApplicationFrames = [
  {
    id: 'communication',
    context: (value: string) => `Your team has just changed shape and communication is still settling, but the tactical picture remains: ${value}`,
    prompt: (value: string) => `With role clarity under pressure, ${value.charAt(0).toLowerCase()}${value.slice(1)}`,
    explanation: 'The principle remains valid after a shape change; the solution must also be communicated through clear roles and distances.',
  },
  {
    id: 'fatigue',
    context: (value: string) => `Late in the match, execution speed is dropping through fatigue, while the same tactical problem remains: ${value}`,
    prompt: (value: string) => `Which principle-led choice remains strongest under fatigue? ${value}`,
    explanation: 'Fatigue changes the speed and clarity of execution, not the spatial evidence that makes this option the strongest.',
  },
] as const

const contextualTacticalScenarios = tacticalApplicationFrames.flatMap((frame, frameIndex) => coreTacticalScenarios.map((scenario, scenarioIndex) => ({
  ...scenario,
  id: `tac-${frame.id}-${String(scenarioIndex + 1).padStart(3, '0')}`,
  context: frame.context(scenario.context),
  prompt: frame.prompt(scenario.prompt),
  explanation: `${scenario.explanation} ${frame.explanation}`,
  difficulty: (['Starter', 'Sharp', 'Expert'] as const)[(scenarioIndex + frameIndex + 1) % 3],
})))

export const tacticalScenarios: TacticalScenario[] = [...coreTacticalScenarios, ...contextualTacticalScenarios]

export function validateTacticalScenarios(items: TacticalScenario[]) {
  const errors: string[] = []
  const ids = new Set<string>()
  const prompts = new Set<string>()
  for (const item of items) {
    if (ids.has(item.id)) errors.push(`${item.id}: duplicate id`)
    ids.add(item.id)
    const normalized = item.prompt.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    if (prompts.has(normalized)) errors.push(`${item.id}: duplicate prompt`)
    prompts.add(normalized)
    if (item.options.length !== 4) errors.push(`${item.id}: expected four options`)
    if (!Number.isInteger(item.answer) || item.answer < 0 || item.answer >= item.options.length) errors.push(`${item.id}: invalid answer`)
    if (!item.explanation || !item.principle || !item.alternatives) errors.push(`${item.id}: incomplete learning feedback`)
    try { new URL(item.sourceUrl) } catch { errors.push(`${item.id}: invalid source URL`) }
  }
  return errors
}
