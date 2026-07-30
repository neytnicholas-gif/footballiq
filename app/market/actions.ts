'use server'

import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { assertMarketAdminUser } from '@/lib/market/admin-auth'
import {
  buyPlayerForUser,
  ensurePortfolioForUser,
  getMarketAdminDashboardView,
  getPortfolioForUser,
  sellPlayerForUser,
} from '@/lib/market/demo-store'
import { runMarketSeasonImport } from '@/lib/market/import-workflow'

export async function ensureMarketPortfolioAction() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false as const, code: 'AUTH_REQUIRED', message: 'Sign in to create a portfolio.' }

  const portfolio = await ensurePortfolioForUser(user.id)
  return { ok: true as const, portfolio }
}

export async function getMarketPortfolioAction() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false as const, code: 'AUTH_REQUIRED', message: 'Sign in to manage your portfolio.' }

  const portfolio = await getPortfolioForUser(user.id)
  if (!portfolio) return { ok: false as const, code: 'PORTFOLIO_NOT_FOUND', message: 'Portfolio not found.' }

  return { ok: true as const, portfolio }
}

export async function buyMarketPlayerAction(playerId: string, clientRequestId?: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false as const, code: 'AUTH_REQUIRED', message: 'Sign in to buy players.' }

  return buyPlayerForUser({
    userId: user.id,
    playerId,
    idempotencyKey: clientRequestId?.trim() || randomUUID(),
  })
}

export async function sellMarketPlayerAction(playerId: string, clientRequestId?: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false as const, code: 'AUTH_REQUIRED', message: 'Sign in to sell players.' }

  return sellPlayerForUser({
    userId: user.id,
    playerId,
    idempotencyKey: clientRequestId?.trim() || randomUUID(),
  })
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
