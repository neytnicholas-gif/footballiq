import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { syncSportmonksCatalogueToSupabase } from '@/lib/market/server/catalogue-sync'
import { MARKET_CATALOGUE_CACHE_TAG } from '@/lib/market/cache'
import { isMarketAdminRequest } from '@/lib/market/server/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function synchronize(request: Request) {
  if (!isMarketAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await syncSportmonksCatalogueToSupabase()
    revalidateTag(MARKET_CATALOGUE_CACHE_TAG, 'max')
    return NextResponse.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Catalogue synchronization failed.'
    return NextResponse.json({ error: message }, { status: 500, headers: { 'Cache-Control': 'private, no-store' } })
  }
}

export function GET(request: Request) {
  return synchronize(request)
}

export function POST(request: Request) {
  return synchronize(request)
}
