import { NextResponse } from 'next/server'
import { syncSportmonksCatalogueToSupabase } from '@/lib/market/server/catalogue-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthorized(request: Request) {
  const expected = process.env.MARKET_ADMIN_SECRET
  const authorization = request.headers.get('authorization')
  return Boolean(expected?.trim() && authorization === `Bearer ${expected}`)
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await syncSportmonksCatalogueToSupabase()
    return NextResponse.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Catalogue synchronization failed.'
    return NextResponse.json({ error: message }, { status: 500, headers: { 'Cache-Control': 'private, no-store' } })
  }
}
