import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'
import { MARKET_CATALOGUE_CACHE_TAG } from '@/lib/market/cache'
import { isMarketAdminRequest } from '@/lib/market/server/admin-auth'
import { recoverLatestFailedCatalogueSync, syncSportmonksCatalogueToSupabase } from '@/lib/market/server/catalogue-sync'
import { processLatestVerifiedGameweek } from '@/lib/market/server/gameweek-engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function run(request: Request) {
  if (!isMarketAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const startedAt = Date.now()
  try {
    const gameweekRetry = await processLatestVerifiedGameweek({ skipIfCompletedToday: true })
    const isMondayUtc = new Date().getUTCDay() === 1
    const catalogue = isMondayUtc
      ? await syncSportmonksCatalogueToSupabase()
      : await recoverLatestFailedCatalogueSync()
    revalidateTag(MARKET_CATALOGUE_CACHE_TAG, 'max')
    const report = { gameweekRetry, catalogue, isMondayUtc, durationMs: Date.now() - startedAt }
    console.info(JSON.stringify({ event: 'market.maintenance.completed', ...report }))
    return NextResponse.json({ ok: true, ...report }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Daily maintenance failed.'
    console.error(JSON.stringify({ event: 'market.maintenance.failed', durationMs: Date.now() - startedAt, error: message }))
    return NextResponse.json({ error: message }, { status: 500, headers: { 'Cache-Control': 'private, no-store' } })
  }
}

export const GET = run
export const POST = run
