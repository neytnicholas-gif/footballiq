export function friendlyMarketLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '')
  if (/temporarily unavailable|temporarily busy|verified player data/i.test(message)) return message
  if (/network|fetch|timeout|connection/i.test(message)) return 'Verdict XI could not connect to the Market. Please check your connection and try again.'
  return 'This part of the Market could not load. Your roster and budget were not changed. Please try again.'
}
