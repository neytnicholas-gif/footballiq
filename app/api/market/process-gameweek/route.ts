import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { processLatestVerifiedGameweek } from '@/lib/market/server/gameweek-engine'
import { MARKET_CATALOGUE_CACHE_TAG } from '@/lib/market/cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function authorized(request: Request) {
  const supplied = request.headers.get('authorization')
  const secrets = [process.env.CRON_SECRET, process.env.MARKET_ADMIN_SECRET].filter(Boolean)
  return secrets.some((secret) => supplied === `Bearer ${secret}`)
}

async function run(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const result = await processLatestVerifiedGameweek()
    revalidateTag(MARKET_CATALOGUE_CACHE_TAG, 'max')
    return NextResponse.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Gameweek processing failed.' }, { status: 500 })
  }
}

export const GET = run
export const POST = run
