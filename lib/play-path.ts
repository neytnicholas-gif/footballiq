export type PlayInterest = 'market' | 'tactics' | 'referee' | 'scouting' | 'quick-games' | 'predictions' | 'daily'

export type PlayInterestProfile = Record<PlayInterest, number>

export const emptyPlayInterestProfile = (): PlayInterestProfile => ({
  market: 0,
  tactics: 0,
  referee: 0,
  scouting: 0,
  'quick-games': 0,
  predictions: 0,
  daily: 0,
})

export function playInterestForPath(pathname: string): PlayInterest | null {
  if (pathname === '/market' || pathname.startsWith('/market/')) return 'market'
  if (pathname === '/predictions' || pathname.startsWith('/predictions/')) return 'predictions'
  if (pathname === '/daily') return 'daily'
  if (/^\/quizzes\/tactical-lab(?:\/|$)/.test(pathname)) return 'tactics'
  if (/^\/quizzes\/referee-decisions(?:\/|$)/.test(pathname)) return 'referee'
  if (/^\/quizzes\/would-you-scout-him(?:\/|$)/.test(pathname)) return 'scouting'
  if (pathname === '/quizzes' || pathname.startsWith('/quizzes/')) return 'quick-games'
  return null
}

export function strongestPlayInterest(profile: PlayInterestProfile): PlayInterest | null {
  const ranked = (Object.entries(profile) as Array<[PlayInterest, number]>)
    .toSorted((a, b) => b[1] - a[1])
  return ranked[0]?.[1] > 0 ? ranked[0][0] : null
}
