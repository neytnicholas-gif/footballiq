import { NextResponse } from 'next/server'
import { runSportmonksCoverageTrial } from '@/lib/market/server/sportmonks-client'
import { isMarketAdminRequest } from '@/lib/market/server/admin-auth'

export const runtime = 'nodejs'
export const revalidate = 3600

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== 'preview') {
    return NextResponse.json({ error: 'Provider trials are available on preview deployments only.' }, { status: 404 })
  }
  if (!isMarketAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json(await runSportmonksCoverageTrial())
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The Sportmonks trial failed.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
