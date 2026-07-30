import { NextRequest, NextResponse } from 'next/server'
import { assertMarketAdminSecret } from '@/lib/market/admin-auth'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      adminSecret?: string
      seasonKey?: string
      dryRun?: boolean
      runKey?: string
    }

    assertMarketAdminSecret(body.adminSecret ?? null)

    return NextResponse.json(
      { error: 'Weekly valuation processing is deferred to Sprint 7C.' },
      { status: 409 },
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown weekly run error' },
      { status: 401 },
    )
  }
}
