import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const route = readFileSync(resolve(process.cwd(), 'app/api/market/sync-catalogue/route.ts'), 'utf8')
const service = readFileSync(resolve(process.cwd(), 'lib/market/server/catalogue-sync.ts'), 'utf8')

describe('server-only Market catalogue synchronization', () => {
  it('requires a private bearer secret and refuses unauthenticated requests', () => {
    expect(route).toMatch(/process\.env\.MARKET_ADMIN_SECRET/)
    expect(route).toMatch(/authorization === `Bearer \$\{expected\}`/)
    expect(route).toMatch(/status: 401/)
    expect(route).toMatch(/Cache-Control': 'private, no-store'/)
  })

  it('keeps the Supabase service role and Sportmonks access server-only', () => {
    expect(service).toMatch(/import 'server-only'/)
    expect(service).toMatch(/process\.env\.SUPABASE_SERVICE_ROLE_KEY/)
    expect(service).not.toMatch(/NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/)
    expect(service).toMatch(/buildSportmonksPremierLeagueCatalogue/)
  })

  it('upserts the complete catalogue in bounded batches by stable slug', () => {
    expect(service).toMatch(/const BATCH_SIZE = 100/)
    expect(service).toMatch(/upsert\(rows, \{ onConflict: 'slug' \}\)/)
    expect(service).toMatch(/synced \+= rows\.length/)
  })
})
