import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { processLatestVerifiedGameweek } from '@/lib/market/server/gameweek-engine'
import { recoverLatestFailedCatalogueSync } from '@/lib/market/server/catalogue-sync'
import { MARKET_CATALOGUE_CACHE_TAG } from '@/lib/market/cache'
import { isCronRequest } from '@/lib/market/server/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function run(request: Request) {
  if (!isCronRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const result = await processLatestVerifiedGameweek()
    const catalogueRecovery = await recoverLatestFailedCatalogueSync()
    revalidateTag(MARKET_CATALOGUE_CACHE_TAG, 'max')
    return NextResponse.json({ ok: true, ...result, catalogueRecovery }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Market gameweek processing or catalogue recovery failed.', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Gameweek processing failed.' }, { status: 500 })
  }
}

export const GET = run
export const POST = run
