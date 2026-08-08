export type RefereeScenario = {
  id: string
  category: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  title: string
  situation: string
  options: string[]
  answer: string
  explanation: string
  principle: string
  sourceUrl: string
}

type RefereeFamily = {
  id: string
  category: string
  title: string
  principle: string
  sourceUrl: string
  distractors: [string, string, string]
  cases: Array<[string, string, string]>
}

const law = (slug: string) => `https://www.theifab.com/laws/latest/${slug}/`

const openingScenarios: RefereeScenario[] = [
  { id: 'ref-001', category: 'Restart', difficulty: 'Easy', title: 'Goalkeeper handles a deliberate pass', situation: 'A defender deliberately kicks the ball to their goalkeeper, who handles it inside the penalty area without any intervening touch.', options: ['Play on', 'Indirect free kick', 'Direct free kick', 'Dropped ball'], answer: 'Indirect free kick', explanation: 'A goalkeeper may not handle a ball deliberately kicked to them by a team-mate. The restart is an indirect free kick, subject to the goal-area restart position.', principle: 'Goalkeeper handling restrictions create indirect-free-kick offences.', sourceUrl: law('fouls-and-misconduct') },
  { id: 'ref-002', category: 'Disciplinary', difficulty: 'Medium', title: 'Stopping a promising attack', situation: 'A defender pulls back an attacker in midfield and clearly stops a promising attack. Advantage is not played.', options: ['No card', 'Yellow card', 'Red card', 'Dropped ball'], answer: 'Yellow card', explanation: 'Stopping a promising attack is unsporting behaviour and normally requires a caution when advantage is not applied.', principle: 'SPA is normally punished with a caution; DOGSO has a higher threshold.', sourceUrl: law('fouls-and-misconduct') },
  { id: 'ref-003', category: 'DOGSO', difficulty: 'Hard', title: 'Penalty plus card decision', situation: 'A striker is one-on-one inside the penalty area. A defender makes no attempt to play or challenge for the ball and pulls the striker down.', options: ['Penalty only', 'Penalty and yellow card', 'Penalty and red card', 'Indirect free kick'], answer: 'Penalty and red card', explanation: 'The foul denies an obvious goalscoring opportunity and is not a genuine attempt to play or challenge for the ball, so the defender is sent off.', principle: 'The penalty-area DOGSO reduction does not cover holding, pulling or other no-ball challenges.', sourceUrl: law('fouls-and-misconduct') },
  { id: 'ref-004', category: 'Advantage', difficulty: 'Medium', title: 'Advantage or whistle?', situation: 'A midfielder is fouled, but the ball immediately reaches a team-mate with space and several attackers ahead of the ball.', options: ['Stop play immediately', 'Play advantage', 'Award a dropped ball', 'Caution the fouled player'], answer: 'Play advantage', explanation: 'The non-offending team has an immediate and credible attacking benefit, so the referee should consider advantage.', principle: 'Advantage is based on the benefit available in the next few seconds, not merely possession.', sourceUrl: law('the-referee') },
  { id: 'ref-005', category: 'Handball', difficulty: 'Hard', title: 'Arm makes the body bigger', situation: 'A defender jumps to block a cross. The ball hits an arm held well away from the body without a justifiable link to the movement.', options: ['No offence', 'Direct free kick or penalty for handball', 'Indirect free kick', 'Dropped ball'], answer: 'Direct free kick or penalty for handball', explanation: 'The arm position makes the body unnaturally bigger, so the contact meets the handball-offence criteria.', principle: 'Handball depends on deliberate action or an unjustifiably enlarged body position, not contact alone.', sourceUrl: law('fouls-and-misconduct') },
]

const families: RefereeFamily[] = [
  { id:'offside', category:'Offside', title:'Offside involvement', principle:'Position alone is not an offence; involvement through play, interference or gaining advantage is required.', sourceUrl:law('offside'), distractors:['Award a direct free kick','Award a dropped ball','Caution the attacker automatically'], cases:[
    ['An attacker in an offside position leaves the ball for an onside team-mate and does not challenge or block an opponent.','Play on','The player does not become involved in active play, so there is no offside offence.'],
    ['A shot rebounds from the goalpost to an attacker who was in an offside position when the shot was taken.','Indirect free kick for offside','The attacker gains an advantage from the rebound after being in an offside position.'],
    ['An offside attacker clearly blocks the goalkeeper’s line of vision as a team-mate shoots into goal.','Indirect free kick for offside interference','Blocking the goalkeeper’s vision is interference with an opponent, so the goal cannot stand.'],
  ]},
  { id:'deliberate-play', category:'Offside', title:'Defender touch and offside', principle:'A deliberate play can reset offside; a deliberate save or deflection does not.', sourceUrl:law('offside'), distractors:['Always penalise offside','Award a penalty kick','Restart with a dropped ball'], cases:[
    ['A defender has time and control to deliberately pass the ball but miskicks it to an attacker who had been in an offside position.','Play on after the deliberate play','A controlled attempt to play the ball resets the attacker’s offside status even when the execution is poor.'],
    ['A close-range shot deflects accidentally from a defender to an attacker who was already in an offside position.','Indirect free kick for offside','A deflection is not a deliberate play and does not reset offside.'],
    ['A defender dives to block a shot heading toward goal and the ball reaches an offside attacker.','Indirect free kick for offside after a deliberate save','A deliberate save does not reset offside.'],
  ]},
  { id:'handball', category:'Handball', title:'Handball judgement', principle:'Judge deliberate movement and whether the arm makes the body unnaturally bigger.', sourceUrl:law('fouls-and-misconduct'), distractors:['Indirect free kick','Dropped ball','Automatic red card'], cases:[
    ['The ball strikes a defender’s arm held close to the torso after a short-distance deflection, with no movement toward the ball.','Play on; no handball offence','The arm does not make the body unnaturally bigger and there is no deliberate action.'],
    ['An attacker deliberately controls the ball with a hand before passing to a team-mate.','Direct free kick for handball','Deliberately touching the ball with the hand or arm is an offence regardless of what follows.'],
    ['The scorer accidentally handles the ball and immediately scores in the opponents’ goal.','Disallow the goal and award a direct free kick','A player who accidentally handles and then scores immediately commits an attacking handball offence.'],
  ]},
  { id:'challenge', category:'Fouls', title:'Challenge severity', principle:'Careless means a foul only, reckless requires a caution, and excessive force requires a sending-off.', sourceUrl:law('fouls-and-misconduct'), distractors:['Play on','Indirect free kick only','Dropped ball'], cases:[
    ['A player mistimes a trip through lack of attention but does not act recklessly.','Direct free kick with no card required for carelessness','A careless direct-free-kick offence does not itself require a disciplinary sanction.'],
    ['A player lunges with disregard for the danger to an opponent but does not use excessive force.','Direct free kick and yellow card for a reckless challenge','A reckless challenge requires a caution.'],
    ['A player tackles with excessive force and endangers the safety of an opponent while challenging for the ball.','Direct free kick and red card for serious foul play','Excessive force or endangering safety is serious foul play.'],
  ]},
  { id:'violent', category:'Misconduct', title:'Violent conduct', principle:'Excessive force away from a legitimate challenge for the ball is violent conduct.', sourceUrl:law('fouls-and-misconduct'), distractors:['Yellow card only','No action because the ball is elsewhere','Dropped ball with no card'], cases:[
    ['During a stoppage, a player deliberately strikes an opponent in the face with more than negligible force.','Red card for violent conduct','A deliberate strike to the head or face away from a challenge is violent conduct unless the force is negligible.'],
    ['A substitute in the technical area throws a bottle forcefully at an opposing player on the field.','Send off the substitute for violent conduct','Violent conduct applies to substitutes and thrown objects as well as players.'],
    ['Two team-mates fight and one punches the other while the ball is in play elsewhere.','Stop play and send off the player for violent conduct','Violent conduct can be committed against any person, including a team-mate.'],
  ]},
  { id:'dogso', category:'DOGSO', title:'Obvious opportunity denied', principle:'DOGSO considers distance, direction, control and the number/location of defenders.', sourceUrl:law('fouls-and-misconduct'), distractors:['No card in every case','Automatic yellow card only','Dropped ball'], cases:[
    ['Outside the penalty area, a defender carelessly trips an attacker moving directly toward goal with control and no covering defender.','Direct free kick and red card for DOGSO','The foul denies an obvious goalscoring opportunity outside the penalty area.'],
    ['Inside the penalty area, a defender makes a genuine attempt to challenge for the ball but fouls an attacker and denies an obvious opportunity.','Penalty kick and yellow card','For a penalty-area DOGSO offence involving a genuine attempt to play or challenge for the ball, the player is cautioned.'],
    ['A defender fouls an attacker far from goal while two covering defenders are well placed between the attacker and goal.','Direct free kick; assess SPA rather than DOGSO','The covering defenders and distance mean the opportunity is not obviously a goalscoring one.'],
  ]},
  { id:'advantage', category:'Advantage', title:'Applying advantage', principle:'Advantage should create a real, immediate benefit and may affect later disciplinary action.', sourceUrl:law('the-referee'), distractors:['Always stop play','Award a dropped ball','End the match'], cases:[
    ['A reckless foul occurs, but the fouled team immediately has a clear attack. The referee applies advantage and the move ends at the next stoppage.','Allow advantage, then caution the offender','The referee may apply advantage and return to caution for the reckless offence at the next stoppage.'],
    ['A defender commits DOGSO, but the attacker stays up and immediately scores.','Award the goal and apply the current DOGSO advantage sanction','A realised advantage resulting in a goal changes the disciplinary outcome under the current Law.'],
    ['A player is fouled in their own penalty area and retains the ball while surrounded with no useful passing option.','Stop play and award the free kick','Mere possession is not a useful advantage when the team is under immediate pressure.'],
  ]},
  { id:'keeper', category:'Goalkeeper', title:'Goalkeeper control', principle:'Goalkeeper handling has specific time, release and team-mate-pass restrictions.', sourceUrl:law('fouls-and-misconduct'), distractors:['Penalty kick','Automatic red card','Play on indefinitely'], cases:[
    ['A goalkeeper controls the ball with the hands for more than eight seconds, and the referee has completed the visible five-second countdown.','Award a corner kick to the opponents','Under the current Law, holding beyond eight seconds after the countdown is punished with a corner kick.'],
    ['After releasing the ball from the hands, a goalkeeper handles it again before another player touches it.','Indirect free kick','A goalkeeper may not handle the ball again after release until it has touched another player.'],
    ['A team-mate heads the ball normally to the goalkeeper, who catches it inside the penalty area.','Play on','The deliberate-kick restriction does not prohibit a genuine header to the goalkeeper.'],
  ]},
  { id:'penalty', category:'Penalty kick', title:'Penalty procedure', principle:'Penalty offences depend on who infringes and whether the ball enters the goal.', sourceUrl:law('the-penalty-kick'), distractors:['Always award a goal','Always record a miss','Dropped ball'], cases:[
    ['The penalty taker clearly stops at the end of the run-up to feint after completing the approach, then scores.','Disallow the goal, caution the kicker and award an indirect free kick','Illegal feinting after the run-up is completed is an offence by the kicker.'],
    ['The goalkeeper moves forward early with both feet and saves the penalty, materially affecting the kick.','Retake the penalty and apply the required goalkeeper sanction','A goalkeeper offence that affects a missed or saved kick requires a retake.'],
    ['The kicker accidentally touches the ball twice because the standing foot slips, and the ball enters the goal.','Retake the penalty','The current Law distinguishes an accidental immediate double touch from a deliberate second touch.'],
  ]},
  { id:'free-kick', category:'Free kicks', title:'Free-kick restart', principle:'Free kicks require the ball to be stationary and opponents to respect the required distance.', sourceUrl:law('free-kicks'), distractors:['Award a throw-in','Award a corner kick','Drop the ball'], cases:[
    ['A player takes a quick free kick while an opponent who is still retreating intercepts it without deliberately preventing the restart.','Play on','A team choosing a quick free kick accepts the position of opponents who had no time to retreat.'],
    ['An opponent deliberately stands over the ball and kicks it away to delay a free kick.','Caution for delaying the restart','Deliberately preventing or delaying a restart is a cautionable offence.'],
    ['A direct free kick is kicked straight into the opponents’ goal without another touch.','Award a goal','A goal may be scored directly against the opponents from a direct free kick.'],
  ]},
  { id:'throw', category:'Throw-in', title:'Throw-in procedure', principle:'A legal throw uses both hands, comes from behind and over the head, and is delivered from the correct place.', sourceUrl:law('the-throw-in'), distractors:['Indirect free kick','Dropped ball','Penalty kick'], cases:[
    ['The thrower lifts one foot completely off the ground before releasing the ball.','Award the throw-in to the opponents','Part of each foot must remain on or outside the touchline and on the ground at release.'],
    ['A player takes a legal throw-in and the ball enters the opponents’ goal without touching anyone.','Award a goal kick','A goal cannot be scored directly from a throw-in into the opponents’ goal.'],
    ['An opponent stands one metre from the throw-in location and blocks the thrower.','Caution the opponent and require the two-metre distance','Opponents must stand at least two metres from the point of the throw-in.'],
  ]},
  { id:'goal-corner', category:'Restarts', title:'Goal and corner kicks', principle:'Goal kicks and corner kicks are in play when kicked and clearly move; direct-goal rules differ by target goal.', sourceUrl:law('the-goal-kick'), distractors:['Dropped ball','Penalty kick','Indirect free kick to the taker'], cases:[
    ['A goal kick is kicked directly into the opponents’ goal.','Award a goal','A goal may be scored directly against the opponents from a goal kick.'],
    ['A corner kick is kicked directly into the opponents’ goal.','Award the goal from the corner kick','A goal may be scored directly against the opponents from a corner kick.'],
    ['A corner kick travels directly into the taker’s own goal without touching another player.','Award a corner kick to the opponents','A direct own goal cannot be scored from a corner kick.'],
  ]},
  { id:'dropped-ball', category:'Dropped ball', title:'Dropped-ball restart', principle:'Dropped balls are uncontested and returned according to where play stopped and who last touched the ball.', sourceUrl:law('the-start-and-restart-of-play'), distractors:['Contest the ball between two players','Award an indirect free kick','Award a throw-in'], cases:[
    ['Play is stopped inside the penalty area for a serious injury with the defending goalkeeper in possession.','Drop the ball for the defending goalkeeper','When play is stopped in the penalty area, the dropped ball is for the defending goalkeeper.'],
    ['Outside the penalty area, the referee stops play for an injury while one team clearly has possession.','Drop the ball for that team at the last-touch location','Outside the penalty area, the ball is dropped for the team that last touched it.'],
    ['A dropped ball enters the opponents’ goal without touching at least two players.','Award a goal kick','A dropped ball must touch at least two players before a goal can be scored.'],
  ]},
  { id:'extra-person', category:'Players and officials', title:'Extra person interference', principle:'Unauthorised entrants are sanctioned according to identity, interference and restart location.', sourceUrl:law('the-players'), distractors:['Ignore all outside interference','Send off the captain','Always restart with a dropped ball'], cases:[
    ['A substitute enters without permission and interferes with an opponent while the ball is in play.','Stop play, caution the substitute and award the appropriate direct free kick or penalty','A substitute who enters without permission and interferes commits misconduct and a direct-free-kick offence.'],
    ['A team official enters the field and deliberately stops an opponent’s pass.','Stop play, send off the team official and award a direct free kick or penalty','A team official who enters and interferes is sent off; the restart is a direct free kick or penalty.'],
    ['An outside agent enters the field and touches the ball with no team involvement.','Stop play and restart with a dropped ball','Interference by an outside agent normally results in a dropped ball.'],
  ]},
  { id:'var', category:'VAR', title:'VAR protocol', principle:'VAR only assists in match-changing categories after a referee decision or serious missed incident.', sourceUrl:'https://www.theifab.com/laws/latest/video-assistant-referee-var-protocol/', distractors:['VAR may review any throw-in','Players may demand an on-field review','VAR replaces the referee’s final decision'], cases:[
    ['The VAR sees a possible clear penalty error after the referee has waved play on.','VAR may check and recommend a review','Penalty or no-penalty incidents are reviewable after an initial decision, including play on.'],
    ['A team disputes whether a routine midfield foul should have been a yellow card.','No VAR intervention for a routine caution decision','A normal caution decision outside a reviewable incident is not one of the VAR categories.'],
    ['The referee reviews a factual offside in the attacking phase before a goal.','The referee may use VAR information to correct the goal decision','Goal or no-goal reviews include reviewable attacking-phase offences such as offside.'],
  ]},
]

function rotateOptions(correct: string, distractors: [string, string, string], seed: number) {
  const options = [correct, ...distractors]
  const shift = seed % options.length
  return [...options.slice(shift), ...options.slice(0, shift)]
}

const generatedScenarios = families.flatMap((family, familyIndex) => family.cases.map(([situation, answer, explanation], caseIndex) => ({
  id: `ref-${String(6 + familyIndex * 3 + caseIndex).padStart(3, '0')}`,
  category: family.category,
  difficulty: (['Easy', 'Medium', 'Hard'] as const)[(familyIndex + caseIndex) % 3],
  title: `${family.title}: case ${caseIndex + 1}`,
  situation,
  options: rotateOptions(answer, family.distractors, familyIndex + caseIndex),
  answer,
  explanation,
  principle: family.principle,
  sourceUrl: family.sourceUrl,
})))

export const refereeScenarios: RefereeScenario[] = [...openingScenarios, ...generatedScenarios]

export function validateRefereeScenarios(items: RefereeScenario[]) {
  const errors: string[] = []
  const ids = new Set<string>()
  const prompts = new Set<string>()
  const optionSets = new Set<string>()
  for (const item of items) {
    if (ids.has(item.id)) errors.push(`${item.id}: duplicate id`)
    ids.add(item.id)
    const prompt = item.situation.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    if (prompts.has(prompt)) errors.push(`${item.id}: duplicate situation`)
    prompts.add(prompt)
    if (item.options.length !== 4 || new Set(item.options).size !== 4) errors.push(`${item.id}: options must be four distinct choices`)
    if (!item.options.includes(item.answer)) errors.push(`${item.id}: answer is not in options`)
    const optionSet = [...item.options].sort().join('|').toLowerCase()
    if (optionSets.has(optionSet)) errors.push(`${item.id}: duplicate option set`)
    optionSets.add(optionSet)
    if (!item.explanation || !item.principle) errors.push(`${item.id}: missing learning feedback`)
    try { new URL(item.sourceUrl) } catch { errors.push(`${item.id}: invalid source URL`) }
  }
  if (items.length !== 50) errors.push(`expected 50 referee scenarios, received ${items.length}`)
  return errors
}
