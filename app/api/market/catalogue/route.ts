import { NextResponse } from 'next/server'
import { buildSportmonksBundesligaCatalogue, buildSportmonksCombinedCatalogue, buildSportmonksLaLigaCatalogue, buildSportmonksLigue1Catalogue, buildSportmonksPremierLeagueCatalogue, buildSportmonksSerieACatalogue } from '@/lib/market/server/sportmonks-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== 'preview') {
    return NextResponse.json({ error: 'The verified market catalogue is currently enabled on preview only.' }, { status: 404 })
  }
  try {
    const competition = new URL(request.url).searchParams.get('competition')
    const catalogue = competition === 'ligue-1'
      ? await buildSportmonksLigue1Catalogue()
      : competition === 'serie-a'
      ? await buildSportmonksSerieACatalogue()
      : competition === 'bundesliga'
      ? await buildSportmonksBundesligaCatalogue()
      : competition === 'la-liga'
        ? await buildSportmonksLaLigaCatalogue()
      : competition === 'premier-league'
        ? await buildSportmonksPremierLeagueCatalogue()
        : await buildSportmonksCombinedCatalogue()
    return NextResponse.json(catalogue, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The verified player catalogue could not be loaded.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
