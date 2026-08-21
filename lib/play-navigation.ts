const legacyGameRoutePrefixes = [
  '/quizzes/start-bench-sell',
  '/quizzes/football-duels',
  '/quizzes/higher-or-lower',
  '/quizzes/who-am-i',
  '/quizzes/career-path',
] as const

function pathMatches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function primaryNavigationLinkIsActive(pathname: string, href: string) {
  const isGameRoute = pathMatches(pathname, '/games')
    || legacyGameRoutePrefixes.some((route) => pathMatches(pathname, route))

  if (href === '/games') return isGameRoute
  if (href === '/quizzes') return pathMatches(pathname, href) && !isGameRoute
  return href === '/' ? pathname === href : pathMatches(pathname, href)
}
