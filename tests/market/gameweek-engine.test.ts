import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/20260809203000_market_gameweek_engine.sql', 'utf8')
const route = readFileSync('app/api/market/process-gameweek/route.ts', 'utf8')

describe('verified gameweek engine', () => {
  it('uses exact-once fixture and player identities', () => {
    expect(migration).toContain('market_player_match_stats_fixture_player_uidx')
    expect(migration).toContain('on conflict(provider_fixture_id,player_id) do nothing')
    expect(migration).toContain("'sportmonks:'||(item->>'provider_fixture_id')||':'||(item->>'provider_player_id')")
  })

  it('enforces 11 signings per gameweek in the database', () => {
    expect(migration).toContain('signings_used between 0 and 11')
    expect(migration).toContain("if a.signings_used>=11 then raise exception 'GAMEWEEK_TRANSFER_LIMIT'")
    expect(migration).toContain("perform public.market_record_gameweek_trade(p.id,'buy')")
  })

  it('keeps processing service-role-only and user reveals owner-scoped', () => {
    expect(migration).toContain("if coalesce(auth.role(),'') <> 'service_role'")
    expect(migration).toContain('market_gameweek_reveals_owner_read')
    expect(migration).toContain('p.user_id=(select auth.uid())')
  })

  it('requires a server secret at the cron boundary', () => {
    expect(route).toContain('process.env.CRON_SECRET')
    expect(route).toContain('process.env.MARKET_ADMIN_SECRET')
    expect(route).toContain("supplied === `Bearer ${secret}`")
  })
})
