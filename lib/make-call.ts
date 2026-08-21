export const MAKE_CALL_ACTIONS = ['start', 'bench', 'sell'] as const

export type MakeCallAction = (typeof MAKE_CALL_ACTIONS)[number]
export type MakeCallAssignments = Partial<Record<MakeCallAction, string>>

export type MakeCallPlayer = {
  id: string
  stable_player_id: string
  display_name: string
  short_name: string
  club_name: string
  position_label: string
  initials: string
  accent_from: string
  accent_to: string
}

export type MakeCallResults = {
  sample_size: number
  start_counts: Record<string, number>
  bench_counts: Record<string, number>
  sell_counts: Record<string, number>
  exact_count: number
}

export type MakeCallSnapshot = {
  matchup: null | {
    id: string
    slug: string
    prompt: string
    players: MakeCallPlayer[]
  }
  vote?: null | {
    start_player_id: string
    bench_player_id: string
    sell_player_id: string
  }
  results?: MakeCallResults | null
  xp?: { daily_total: number; daily_cap: number }
  xp_awarded_now?: number
}

export function assignmentIsComplete(assignments: MakeCallAssignments) {
  const values = MAKE_CALL_ACTIONS.map((action) => assignments[action])
  return values.every((value): value is string => typeof value === 'string' && value.length > 0)
    && new Set(values).size === MAKE_CALL_ACTIONS.length
}

/**
 * Assigning an occupied action swaps the two players when possible. This makes
 * correcting a call a single tap instead of forcing the player to clear fields.
 */
export function assignMakeCallPlayer(
  assignments: MakeCallAssignments,
  action: MakeCallAction,
  playerId: string,
): MakeCallAssignments {
  const next = { ...assignments }
  const previousPlayer = next[action]
  const previousAction = MAKE_CALL_ACTIONS.find((candidate) => next[candidate] === playerId)

  if (previousPlayer === playerId) {
    delete next[action]
    return next
  }

  if (previousAction && previousAction !== action) {
    if (previousPlayer) next[previousAction] = previousPlayer
    else delete next[previousAction]
  }
  next[action] = playerId
  return next
}

/** Largest-remainder rounding: displayed values always total exactly 100. */
export function exactPercentageDistribution(
  counts: Record<string, number>,
  orderedIds: string[],
) {
  const safeCounts = orderedIds.map((id) => Math.max(0, Number(counts[id]) || 0))
  const total = safeCounts.reduce((sum, value) => sum + value, 0)
  if (total === 0) return Object.fromEntries(orderedIds.map((id) => [id, 0]))

  const raw = safeCounts.map((value) => (value / total) * 100)
  const rounded = raw.map(Math.floor)
  let remaining = 100 - rounded.reduce((sum, value) => sum + value, 0)
  const order = raw
    .map((value, index) => ({ index, remainder: value - rounded[index]! }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
  for (const item of order) {
    if (remaining <= 0) break
    rounded[item.index] = rounded[item.index]! + 1
    remaining -= 1
  }
  return Object.fromEntries(orderedIds.map((id, index) => [id, rounded[index]!]))
}

export function makeCallPercentages(results: MakeCallResults, players: MakeCallPlayer[]) {
  const ids = players.map((player) => player.id)
  return {
    start: exactPercentageDistribution(results.start_counts, ids),
    bench: exactPercentageDistribution(results.bench_counts, ids),
    sell: exactPercentageDistribution(results.sell_counts, ids),
    exact: results.sample_size > 0 ? Math.round((results.exact_count / results.sample_size) * 100) : 0,
  }
}

export function makeCallVerdict(input: {
  assignments: MakeCallAssignments
  results: MakeCallResults
  players: MakeCallPlayer[]
}) {
  const percentages = makeCallPercentages(input.results, input.players)
  if (percentages.exact >= 35) return { title: 'The popular call', copy: 'Plenty of the Early Shout crowd saw it your way.' }
  if (percentages.exact <= 10) return { title: 'Bold choice', copy: 'You read this trio differently from most of the crowd.' }
  const startId = input.assignments.start
  const leadingStart = input.players
    .map((player) => ({ id: player.id, value: percentages.start[player.id] ?? 0 }))
    .sort((a, b) => b.value - a.value)[0]?.id
  if (startId && leadingStart && startId !== leadingStart) {
    return { title: 'Against the crowd', copy: 'Your starter was not the obvious pick—and that is the fun of the call.' }
  }
  return { title: 'Football mastermind—or chaos?', copy: 'A call with enough logic to start a proper football argument.' }
}

export function makeCallSampleLabel(sampleSize: number) {
  if (sampleSize < 10) return `Early results — based on ${sampleSize} ${sampleSize === 1 ? 'call' : 'calls'}.`
  return `Based on ${sampleSize.toLocaleString('en-GB')} completed calls.`
}

export function makeCallShareText(assignments: MakeCallAssignments, players: MakeCallPlayer[], url: string) {
  const name = (action: MakeCallAction) => players.find((player) => player.id === assignments[action])?.short_name ?? 'someone'
  const destination = url ? `: ${url}` : '.'
  return `I’m starting ${name('start')}, benching ${name('bench')} and selling ${name('sell')}. Make your call on Early Shout${destination}`
}

export function shuffleMakeCallPlayers(players: MakeCallPlayer[], seed: number) {
  const result = [...players]
  let state = seed >>> 0 || 1
  for (let index = result.length - 1; index > 0; index -= 1) {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    const target = (state >>> 0) % (index + 1)
    ;[result[index], result[target]] = [result[target]!, result[index]!]
  }
  return result
}
