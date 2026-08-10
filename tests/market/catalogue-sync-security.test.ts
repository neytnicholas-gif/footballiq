import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const route = readFileSync(resolve(process.cwd(), 'app/api/market/sync-catalogue/route.ts'), 'utf8')
const catalogueRoute = readFileSync(resolve(process.cwd(), 'app/api/market/catalogue/route.ts'), 'utf8')
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
    expect(service).toMatch(/buildSportmonksCombinedCatalogue/)
    expect(service).toMatch(/market_active_catalogues/)
  })

  it('upserts the complete normalized catalogue in bounded batches', () => {
    expect(service).toMatch(/const BATCH_SIZE = 100/)
    expect(service).toMatch(/onConflict: 'season_id,provider_player_id'/)
    expect(service).toMatch(/source_type: 'licensed_provider'/)
    expect(service).toMatch(/app_player_id: player\.id/)
    expect(service).toMatch(/synced \+= rows\.length/)
    expect(service).toMatch(/stalePlayerIds/)
    expect(service).toMatch(/availability_status: 'inactive'/)
    expect(service).toMatch(/stillOnLegacyBaseline/)
    expect(service).toMatch(/existing\.current - existing\.initial/)
    expect(service).toMatch(/openingPrice \+ preservedMovement/)
  })

  it('keeps league-specific catalogue requests dynamic while provider calls remain cached', () => {
    expect(catalogueRoute).toMatch(/dynamic = 'force-dynamic'/)
    expect(catalogueRoute).toMatch(/new URL\(request\.url\)\.searchParams\.get\('competition'\)/)
  })
})
