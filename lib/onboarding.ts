export const SITE_ONBOARDING_VERSION = 1
export const START_SITE_TOUR_EVENT = 'early-shout:start-site-tour'

export function onboardingStorageKey(userId?: string | null) {
  return `early-shout:onboarding:v${SITE_ONBOARDING_VERSION}:${userId ? `user:${userId}` : 'guest'}`
}

export function isOnboardingRoute(pathname: string) {
  return pathname === '/'
    || pathname.startsWith('/quizzes')
    || pathname.startsWith('/academy')
    || pathname.startsWith('/market')
    || pathname.startsWith('/predictions')
    || pathname.startsWith('/daily')
    || pathname.startsWith('/leaderboard')
    || pathname.startsWith('/profile')
    || pathname.startsWith('/how-to-play')
}
