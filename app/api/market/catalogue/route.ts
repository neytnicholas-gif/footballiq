import { NextResponse } from 'next/server'
import { buildSportmonksPremierLeagueCatalogue } from '@/lib/market/server/sportmonks-client'

export const runtime = 'nodejs'
export const revalidate = 3600

export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview') {
    return NextResponse.json({ error: 'The verified market catalogue is currently enabled on preview only.' }, { status: 404 })
  }
  try {
    const catalogue = await buildSportmonksPremierLeagueCatalogue()
    return NextResponse.json(catalogue, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The verified player catalogue could not be loaded.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
