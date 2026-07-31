export type MarketActionErrorCode =
  | 'AUTH_REQUIRED'
  | 'CATALOGUE_INACTIVE'
  | 'REQUEST_TIMEOUT'
  | 'STALE_PRICE'
  | 'PLAYER_UNAVAILABLE'
  | 'UNEXPECTED_ERROR'

export type MarketActionFailure = {
  ok: false
  code: MarketActionErrorCode | string
  message: string
}

export type MarketAuthIdentity = { id: string } | null

export function requireMarketUser(user: MarketAuthIdentity):
  | { ok: true; userId: string }
  | MarketActionFailure {
  if (!user?.id) {
    return {
      ok: false,
      code: 'AUTH_REQUIRED',
      message: 'Sign in to manage your Player Market portfolio.',
    }
  }
  return { ok: true, userId: user.id }
}

export function canSellOwnedPosition(input: { owned: boolean; playerStillPurchasable: boolean }): boolean {
  // Leaving the league blocks new purchases but never traps an existing holder.
  return input.owned
}

export async function settleMarketAction<T>(
  action: Promise<T>,
  timeoutMs = 12_000,
): Promise<T | MarketActionFailure> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      action,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), timeoutMs)
      }),
    ])
  } catch (error) {
    if (error instanceof Error && error.message === 'REQUEST_TIMEOUT') {
      return {
        ok: false,
        code: 'REQUEST_TIMEOUT',
        message: 'The market request timed out. Please retry.',
      }
    }
    return {
      ok: false,
      code: 'UNEXPECTED_ERROR',
      message: 'The market request failed. Please retry.',
    }
  } finally {
    if (timer) clearTimeout(timer)
  }
}
