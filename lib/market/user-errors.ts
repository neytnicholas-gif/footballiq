export function friendlyMarketLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '')
  if (/temporarily unavailable|temporarily busy|verified player data/i.test(message)) return message
  if (/network|fetch|timeout|connection/i.test(message)) return 'Early Shout could not connect to the Market. Please check your connection and try again.'
  return 'This part of the Market could not load. Your roster and budget were not changed. Please try again.'
}

export function friendlyMarketLeagueError(
  error: unknown,
  action: 'load' | 'create' | 'join' | 'leave' | 'delete',
) {
  const message = error instanceof Error ? error.message : String(error ?? '')
  if (/network|fetch|timeout|connection|temporarily busy/i.test(message)) {
    return 'The friends-league service could not connect. Nothing changed—check your connection and try again.'
  }
  if (/not authenticated|auth_required|jwt/i.test(message)) return 'Sign in again before changing a friends league.'
  if (/league_name_invalid|between 3 and 40/i.test(message)) return 'Use a league name between 3 and 40 characters.'
  if (/score_mode_invalid/i.test(message)) return 'Choose one of the three available scoring rules.'
  if (/league code not found|league_not_found(?!_or_not_owner)/i.test(message)) return 'That invite code does not match an open friends league.'
  if (/owners cannot leave/i.test(message)) return 'League owners cannot leave. Delete the league if you want to close it for everyone.'
  if (/not_owner|permission denied/i.test(message)) return 'Only the league owner can delete that league.'

  const fallback: Record<typeof action, string> = {
    load: 'Your friends leagues could not load. Refresh the page and try again.',
    create: 'That league could not be created. Nothing changed—please try again.',
    join: 'You could not join that league. Check the invite code and try again.',
    leave: 'You are still in that league. Please try leaving again.',
    delete: 'That league was not deleted. Please try again.',
  }
  return fallback[action]
}
