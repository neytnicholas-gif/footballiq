import { NextRequest, NextResponse } from 'next/server'
import { assertMarketAdminSecret } from '@/lib/market/admin-auth'
import { runMarketSeasonImport } from '@/lib/market/import-workflow'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      adminSecret?: string
      competitionKey?: string
      seasonKey?: string
      dryRun?: boolean
    }

    assertMarketAdminSecret(body.adminSecret ?? null)

    if (!body.competitionKey || !body.seasonKey) {
      return NextResponse.json(
        { error: 'competitionKey and seasonKey are required.' },
        { status: 400 },
      )
    }

    const report = await runMarketSeasonImport({
      competitionKey: body.competitionKey,
      seasonKey: body.seasonKey,
      dryRun: body.dryRun ?? true,
    })

    return NextResponse.json({ report })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown import error' },
      { status: 401 },
    )
  }
}
