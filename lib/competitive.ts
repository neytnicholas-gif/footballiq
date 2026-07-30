export const COMPETITIVE_MODE_IDS = {
  overall: 'overall',
  footballDuels: 'football-duels',
  refereeDecisions: 'referee-decisions',
  scout: 'scout-mode',
  higherLower: 'higher-lower',
  careerPath: 'career-path',
  whoAmI: 'who-am-i',
} as const

export const leaderboardModes = [
  { id: COMPETITIVE_MODE_IDS.overall, label: 'Overall XP', emoji: '🏆', description: 'Every mode, every challenge, one football career.' },
  { id: COMPETITIVE_MODE_IDS.footballDuels, label: 'Football Duels', emoji: '⚽', description: 'Head-to-head football knowledge and speed.' },
  { id: COMPETITIVE_MODE_IDS.refereeDecisions, label: 'Referee Decisions', emoji: '🟨', description: 'Laws of the game, judgement and match decisions.' },
  { id: COMPETITIVE_MODE_IDS.scout, label: 'Scout IQ', emoji: '🔎', description: 'Player evaluation and scouting judgement.' },
  { id: COMPETITIVE_MODE_IDS.higherLower, label: 'Higher or Lower', emoji: '📈', description: 'Stat comparison streak specialists.' },
  { id: COMPETITIVE_MODE_IDS.careerPath, label: 'Career Path', emoji: '🧭', description: 'Club-history and player-career experts.' },
  { id: COMPETITIVE_MODE_IDS.whoAmI, label: 'Who Am I?', emoji: '🕵️', description: 'Football identity deduction experts.' },
] as const

export type LeaderboardMode = typeof leaderboardModes[number]['id']

export type RankedPlayer = {
  id: string
  username: string
  value: number
  secondary: string
  accuracy?: number
  quizzes?: number
}

const CURRENT_SEASON = {
  id: '2026-beta',
  label: '2026 Beta Season',
  start: '2026-01-01T00:00:00.000Z',
  end: '2026-12-31T23:59:59.999Z',
} as const

export function inferModeFromQuizId(quizId: string) {
  if (quizId.startsWith('daily-')) return 'daily'
  if (quizId.startsWith('referee')) return COMPETITIVE_MODE_IDS.refereeDecisions
  if (quizId.startsWith('would-you-scout')) return COMPETITIVE_MODE_IDS.scout
  if (quizId.startsWith('higher-lower')) return COMPETITIVE_MODE_IDS.higherLower
  if (quizId.startsWith('career-path')) return COMPETITIVE_MODE_IDS.careerPath
  if (quizId.startsWith('who-am-i')) return COMPETITIVE_MODE_IDS.whoAmI
  return COMPETITIVE_MODE_IDS.footballDuels
}

export function seasonMeta(date = new Date()) {
  const start = new Date(CURRENT_SEASON.start)
  const end = new Date(CURRENT_SEASON.end)
  const remainingMs = Math.max(0, end.getTime() - date.getTime())
  const totalMs = Math.max(1, end.getTime() - start.getTime())
  return {
    id: CURRENT_SEASON.id,
    label: CURRENT_SEASON.label,
    start,
    end,
    daysLeft: Math.ceil(remainingMs / 86_400_000),
    progressPercent: Math.max(
      0,
      Math.min(100, Math.round(((date.getTime() - start.getTime()) / totalMs) * 100)),
    ),
  }
}

export function formatLeaderboardValue(value: number, board: string) {
  if (board === 'overall' || board === 'weekly' || board === 'monthly') return `${value.toLocaleString()} XP`
  if (board === 'daily') return `${value.toLocaleString()} pts`
  return `${value.toLocaleString()} rating`
}
