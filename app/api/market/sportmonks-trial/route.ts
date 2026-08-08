import { NextResponse } from 'next/server'
import { runSportmonksCoverageTrial } from '@/lib/market/server/sportmonks-client'

export const runtime = 'nodejs'
export const revalidate = 3600

export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview') {
    return NextResponse.json({ error: 'Provider trials are available on preview deployments only.' }, { status: 404 })
  }
  try {
    return NextResponse.json(await runSportmonksCoverageTrial())
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The Sportmonks trial failed.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
