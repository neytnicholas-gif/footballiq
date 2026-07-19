export const leaderboardModes = [
  { id: 'overall', label: 'Overall XP', emoji: '🏆', description: 'Every mode, every challenge, one football career.' },
  { id: 'football-duels', label: 'Football Duels', emoji: '⚽', description: 'Head-to-head football knowledge and speed.' },
  { id: 'referee-decisions', label: 'Referee Decisions', emoji: '🟨', description: 'Laws of the game, judgement and match decisions.' },
  { id: 'scout-mode', label: 'Scout IQ', emoji: '🔎', description: 'Player evaluation and scouting judgement.' },
  { id: 'higher-lower', label: 'Higher or Lower', emoji: '📈', description: 'Stat comparison streak specialists.' },
  { id: 'career-path', label: 'Career Path', emoji: '🧭', description: 'Club-history and player-career experts.' },
  { id: 'who-am-i', label: 'Who Am I?', emoji: '🕵️', description: 'Football identity deduction experts.' },
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
  if (quizId.startsWith('referee')) return 'referee-decisions'
  if (quizId.startsWith('would-you-scout')) return 'scout-mode'
  if (quizId.startsWith('higher-lower')) return 'higher-lower'
  if (quizId.startsWith('career-path')) return 'career-path'
  if (quizId.startsWith('who-am-i')) return 'who-am-i'
  return 'football-duels'
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
