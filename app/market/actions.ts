'use server'

import { createClient } from '@/lib/supabase/server'
import { assertMarketAdminUser } from '@/lib/market/admin-auth'
import {
  getMarketAdminDashboardView,
} from '@/lib/market/demo-store'
import { runMarketSeasonImport } from '@/lib/market/import-workflow'
import type { PortfolioView } from '@/lib/market/types'

type MarketPortfolioActionResult =
  | { ok: true; portfolio: PortfolioView }
  | { ok: false; code: string; message: string }

export async function ensureMarketPortfolioAction(): Promise<MarketPortfolioActionResult> {
  return marketCatalogueUnavailable()
}

export async function getMarketPortfolioAction(): Promise<MarketPortfolioActionResult> {
  return marketCatalogueUnavailable()
}

export async function buyMarketPlayerAction(
  playerId: string,
  clientRequestId?: string,
): Promise<MarketPortfolioActionResult> {
  void playerId
  void clientRequestId
  return marketCatalogueUnavailable()
}

export async function sellMarketPlayerAction(
  playerId: string,
  clientRequestId?: string,
): Promise<MarketPortfolioActionResult> {
  void playerId
  void clientRequestId
  return marketCatalogueUnavailable()
}

function marketCatalogueUnavailable() {
  return {
    ok: false as const,
    code: 'CATALOGUE_VERIFICATION_PENDING',
    message: 'The 2026/27 player catalogue is being verified. Portfolio actions are temporarily unavailable.',
  }
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
