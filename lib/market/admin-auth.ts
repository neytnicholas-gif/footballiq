export function assertMarketAdminSecret(providedSecret: string | null): void {
  const expected = process.env.MARKET_ADMIN_SECRET

  if (!expected) {
    throw new Error('MARKET_ADMIN_SECRET is not configured.')
  }

  if (!providedSecret || providedSecret !== expected) {
    throw new Error('Invalid market admin secret.')
  }
}

export function isMarketAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false
  const raw = process.env.MARKET_ADMIN_USER_IDS || ''
  const allowed = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  return allowed.includes(userId)
}

export function assertMarketAdminUser(userId: string | null | undefined): void {
  if (!isMarketAdminUser(userId)) {
    throw new Error('Admin privileges required.')
  }
}
