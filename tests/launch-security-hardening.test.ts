import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/20260818080145_harden_beta_launch_gates.sql', 'utf8')
const permissionCutover = readFileSync('supabase/migrations/20260818080200_restrict_raw_market_data.sql', 'utf8')
const catalogueRoute = readFileSync('app/api/market/catalogue/route.ts', 'utf8')
const contactRoute = readFileSync('app/api/contact/route.ts', 'utf8')
const quizRoute = readFileSync('app/api/quizzes/complete/route.ts', 'utf8')
const marketClient = readFileSync('lib/market/client.ts', 'utf8')

describe('beta launch security hardening', () => {
  it('keeps provider IDs and valuation internals behind the service role', () => {
    expect(permissionCutover).toContain('revoke all on table public.market_players from anon, authenticated')
    expect(permissionCutover).toContain('revoke all on table public.market_valuation_events from anon, authenticated')
    expect(permissionCutover).toContain('market_public_price_book_v1')
    const publicProjection = migration.slice(migration.indexOf('create function public.market_public_catalogue_v1'))
    const returnShape = publicProjection.slice(publicProjection.indexOf('returns table'), publicProjection.indexOf('language sql'))
    expect(returnShape).not.toContain('provider_player_id')
    expect(returnShape).not.toContain('source_reference')
    expect(catalogueRoute).not.toContain('provider_player_id: string')
    expect(migration).toContain('market_public_player_detail_v1')
    expect(marketClient).toContain("rpc('market_public_player_detail_v1'")
    expect(marketClient).not.toContain(".from('market_players')")
  })

  it('uses the atomic shared limiter at both unauthenticated and authenticated write boundaries', () => {
    expect(migration).toContain('perform pg_advisory_xact_lock')
    expect(migration).toContain('claim_api_rate_limit')
    expect(contactRoute).toContain("scope: 'contact'")
    expect(contactRoute).not.toContain('new Map')
    expect(quizRoute).toContain("scope: 'quiz-completion'")
  })

  it('fails closed instead of silently using Resend fallback addresses', () => {
    expect(contactRoute).toContain('CONTACT_FROM_EMAIL')
    expect(contactRoute).toContain('CONTACT_TO_EMAIL')
    expect(contactRoute).not.toContain('onboarding@resend.dev')
    expect(contactRoute).not.toContain("|| 'earlyshout@gmail.com'")
  })
})
