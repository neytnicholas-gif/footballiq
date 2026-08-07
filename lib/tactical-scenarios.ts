export type TacticalScenario = {
  id: string
  category: 'Build-up' | 'Pressing' | 'Transition' | 'Game management' | 'Rest defence' | 'Overloads'
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

export const tacticalScenarios: TacticalScenario[] = [
  { id: 'tac-build-001', category: 'Build-up', difficulty: 'Starter', prompt: 'How should you create the clearest route through the first line?', context: 'Your 4-3-3 faces two forwards pressing the centre-backs. The goalkeeper is comfortable in possession and the opposition midfield is holding its shape.', options: ['Ask both full-backs to run beyond the wingers immediately', 'Use the goalkeeper to form a 3v2 and find the free player', 'Hit an early diagonal every time', 'Drop all three midfielders next to the centre-backs'], answer: 1, principle: 'Create a numerical advantage around the ball before progressing.', explanation: 'The goalkeeper can give the first line a 3v2. That should free one player to carry or pass beyond the press without emptying midfield.', alternatives: 'Early diagonals can be useful when the far side is open, but making them automatic becomes predictable. Dropping everyone short removes the next passing line.', sourceUrl: 'https://www.fifatrainingcentre.com/media/native/test/FIFA_Session_Plan_Flores_2-latest.pdf' },
  { id: 'tac-press-001', category: 'Pressing', difficulty: 'Sharp', prompt: 'What is the strongest pressing response?', context: 'The opposing right centre-back receives facing his own goal. His right-back is high, his nearest midfielder is screened, and your left winger can arrive on his outside shoulder.', options: ['Sprint straight at the ball from any angle', 'Hold a passive low block immediately', 'Curve the press to block the full-back pass and force play inside toward cover', 'Send both centre-backs forward to join the press'], answer: 2, principle: 'Pressure should remove an option and guide play toward supporting defenders.', explanation: 'A curved run can press the receiver while closing the easy outside pass. The team can then compress around the predictable inside route.', alternatives: 'A straight press may leave the full-back free. A low block gives up a strong trigger, while advancing centre-backs would expose the last line.', sourceUrl: fifaTacticalSource },
  { id: 'tac-transition-001', category: 'Transition', difficulty: 'Starter', prompt: 'What should the ball-winner look for first?', context: 'You regain possession centrally. The opponent has six players ahead of the ball, your winger is already running into space, and the central forward can pin one centre-back.', options: ['Play backwards regardless of pressure', 'Attack the open space quickly if the first forward pass is secure', 'Wait for every teammate to recover their position', 'Attempt a shot from the halfway line'], answer: 1, principle: 'Exploit temporary disorganisation when a secure forward action is available.', explanation: 'The opponent is least organised immediately after losing the ball. A controlled first forward pass can release the winger before the defensive block resets.', alternatives: 'Keeping the ball remains valid if the forward pass is unsafe. The scenario makes the forward route both available and supported, so delaying wastes the advantage.', sourceUrl: 'https://www.fifatrainingcentre.com/en/fwc2022/physical-analysis/viewing-match-physical-performances-through-a-tactical-lens--why-do-teams-run.php' },
  { id: 'tac-rest-001', category: 'Rest defence', difficulty: 'Expert', prompt: 'Which adjustment best protects the next turnover?', context: 'Your side attacks in a 3-2-5 against two quick forwards. Both holding midfielders have drifted toward the ball, leaving the centre exposed behind the attack.', options: ['Send all three defenders into the box', 'Keep one midfielder central and staggered behind the ball', 'Ask the goalkeeper to stand on the penalty spot', 'Move both wingers into the same half-space'], answer: 1, principle: 'Rest defence needs central cover, access to second balls and control of counter-attacking routes.', explanation: 'A staggered central midfielder protects the direct counter, supports the back three and can compete for a clearance without crowding the attack.', alternatives: 'Adding more attackers increases exposure. Goalkeeper positioning can help depth, but cannot replace central cover in front of the defensive line.', sourceUrl: fifaTacticalSource },
  { id: 'tac-overload-001', category: 'Overloads', difficulty: 'Sharp', prompt: 'How do you turn the wide overload into penetration?', context: 'Your left winger, full-back and number eight have a 3v2 near the touchline. The opposition far-side winger has narrowed and the switch to your right winger is open.', options: ['Keep circulating only within the crowded triangle', 'Force a dribble between both defenders', 'Draw the two defenders toward the ball, then switch quickly to the free winger', 'Return to the goalkeeper and stop the attack'], answer: 2, principle: 'An overload can attract pressure and create a free player elsewhere.', explanation: 'The local 3v2 fixes the near-side defenders. A quick switch then reaches the weak side before the narrowed winger can recover.', alternatives: 'The triangle may still combine through the block, but the clearly free far-side player offers more space and a cleaner forward picture.', sourceUrl: 'https://www.fifatrainingcentre.com/en/fwc2022/fwc2022.php' },
  { id: 'tac-game-001', category: 'Game management', difficulty: 'Expert', prompt: 'What is the best-supported team decision?', context: 'You lead 1-0 with eight minutes left. The opponent has moved to two strikers and is attacking through repeated crosses. Your winger is tiring, but you still need an outlet to prevent constant pressure.', options: ['Remove every forward and defend the penalty area with ten players', 'Keep the same shape regardless of fatigue', 'Add fresh wide defensive support while retaining one forward outlet', 'Press with every player on every restart'], answer: 2, principle: 'Protect the threatened zone without surrendering every route out of pressure.', explanation: 'Fresh wide support helps defend crosses, while one outlet can secure clearances, win fouls and stop the opponent from committing everyone forward.', alternatives: 'A total retreat can invite continuous attacks. An unchanged shape ignores the fatigue described, while an all-out press creates unnecessary late-game space.', sourceUrl: fifaTacticalSource },
]

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
