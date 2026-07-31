'use server'

import { createClient } from '@/lib/supabase/server'
import { assertMarketAdminUser } from '@/lib/market/admin-auth'
import {
  getMarketAdminDashboardView,
} from '@/lib/market/demo-store'
import { runMarketSeasonImport } from '@/lib/market/import-workflow'
import { requireMarketUser } from '@/lib/market/action-policy'
import { loadPublicCatalogueState } from '@/lib/market/public-catalogue-loader'
import type { PortfolioView } from '@/lib/market/types'

type MarketPortfolioActionResult =
  | { ok: true; portfolio: PortfolioView }
  | { ok: true; portfolio?: undefined }
  | { ok: false; code: string; message: string }

export async function ensureMarketPortfolioAction(): Promise<MarketPortfolioActionResult> {
  const context = await authorizedMarketContext()
  if (!context.ok) return context
  const { error } = await context.supabase.rpc('market_create_or_get_portfolio' as never)
  if (error) return databaseFailure(error.message)
  return getPortfolioSnapshot(context.supabase)
}

export async function getMarketPortfolioAction(): Promise<MarketPortfolioActionResult> {
  const context = await authorizedMarketContext()
  if (!context.ok) return context
  return getPortfolioSnapshot(context.supabase)
}

export async function buyMarketPlayerAction(
  playerId: string,
  clientRequestId?: string,
  expectedPriceMinor?: number,
): Promise<MarketPortfolioActionResult> {
  const context = await authorizedMarketContext()
  if (!context.ok) return context
  if (!clientRequestId?.trim()) return invalidRequestId()
  if (!Number.isSafeInteger(expectedPriceMinor) || (expectedPriceMinor ?? -1) < 0) {
    return { ok: false, code: 'INVALID_EXPECTED_PRICE', message: 'Refresh the player price and try again.' }
  }
  const { error } = await context.supabase.rpc('market_buy_player' as never, {
    p_player_id: playerId,
    p_idempotency_key: clientRequestId,
    p_expected_price_minor: expectedPriceMinor,
  } as never)
  if (error) return databaseFailure(error.message)
  return getPortfolioSnapshot(context.supabase)
}

export async function sellMarketPlayerAction(
  playerId: string,
  clientRequestId?: string,
): Promise<MarketPortfolioActionResult> {
  const context = await authorizedMarketContext()
  if (!context.ok) return context
  if (!clientRequestId?.trim()) return invalidRequestId()
  const { error } = await context.supabase.rpc('market_sell_player' as never, {
    p_player_id: playerId,
    p_idempotency_key: clientRequestId,
  } as never)
  if (error) return databaseFailure(error.message)
  return getPortfolioSnapshot(context.supabase)
}

function marketCatalogueUnavailable() {
  return {
    ok: false as const,
    code: 'CATALOGUE_VERIFICATION_PENDING',
    message: 'The 2026/27 player catalogue is being verified. Portfolio actions are temporarily unavailable.',
  }
}

async function authorizedMarketContext() {
  const catalogue = await loadPublicCatalogueState()
  if (!catalogue.available) return marketCatalogueUnavailable()

  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  const authorization = requireMarketUser(error ? null : data.user)
  if (!authorization.ok) return authorization
  return { ok: true as const, supabase, userId: authorization.userId }
}

function invalidRequestId() {
  return { ok: false as const, code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'A safe request identifier is required.' }
}

function databaseFailure(message: string) {
  const codes = [
    'AUTH_REQUIRED', 'ACTIVE_CATALOGUE_REQUIRED', 'PLAYER_NOT_FOUND', 'PLAYER_UNAVAILABLE',
    'STALE_PRICE', 'ALREADY_OWNED', 'MAX_HOLDINGS', 'INSUFFICIENT_BALANCE',
    'DAILY_PURCHASE_LIMIT', 'DAILY_SALE_LIMIT', 'NOT_OWNED', 'PORTFOLIO_NOT_FOUND',
    'IDEMPOTENCY_KEY_CONFLICT',
  ]
  const code = codes.find((candidate) => message.includes(candidate)) ?? 'MARKET_TRANSACTION_FAILED'
  const messages: Record<string, string> = {
    AUTH_REQUIRED: 'Sign in to manage your Player Market portfolio.',
    ACTIVE_CATALOGUE_REQUIRED: 'The approved market catalogue is not active.',
    PLAYER_NOT_FOUND: 'Player not found in the active catalogue.',
    PLAYER_UNAVAILABLE: 'This player is no longer available to buy.',
    STALE_PRICE: 'The player value changed. Refresh before confirming the purchase.',
    ALREADY_OWNED: 'You already own this player. Holdings are one position per player.',
    MAX_HOLDINGS: 'Your portfolio already contains the maximum of 5 players.',
    INSUFFICIENT_BALANCE: 'Insufficient available FIQ balance.',
    DAILY_PURCHASE_LIMIT: 'You have reached the daily limit of 3 buys.',
    DAILY_SALE_LIMIT: 'You have reached the daily limit of 3 sales.',
    NOT_OWNED: 'You cannot sell a player you do not own.',
    PORTFOLIO_NOT_FOUND: 'Create a portfolio before selling players.',
    IDEMPOTENCY_KEY_CONFLICT: 'This request identifier was already used for another transaction.',
    MARKET_TRANSACTION_FAILED: 'The transaction failed safely. No portfolio change was confirmed.',
  }
  return { ok: false as const, code, message: messages[code] }
}

async function getPortfolioSnapshot(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<MarketPortfolioActionResult> {
  const { data, error } = await supabase.rpc('market_get_portfolio_snapshot' as never)
  if (error) return databaseFailure(error.message)
  if (!data) return { ok: false, code: 'PORTFOLIO_NOT_FOUND', message: 'Create a portfolio to begin trading.' }
  return { ok: true, portfolio: data as unknown as PortfolioView }
}

export async function getMarketAdminDashboardAction() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  assertMarketAdminUser(user?.id)

  return {
    ok: true as const,
    dashboard: getMarketAdminDashboardView(),
  }
}

type MarketImportActionInput = {
  competitionKey: string
  seasonKey: string
  dryRun: boolean
}

export async function runMarketImportAction(input: MarketImportActionInput) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  assertMarketAdminUser(user?.id)

  const report = await runMarketSeasonImport(input)

  return {
    ok: true as const,
    report,
    dashboard: getMarketAdminDashboardView(),
  }
}

type MarketWeeklyActionInput = {
  seasonKey: string
  dryRun: boolean
}

export async function runMarketWeeklyAction(input: MarketWeeklyActionInput) {
  void input
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  assertMarketAdminUser(user?.id)

  return {
    ok: false as const,
    message: 'Weekly valuation processing is deferred to Sprint 7C.',
    dashboard: getMarketAdminDashboardView(),
  }
}
