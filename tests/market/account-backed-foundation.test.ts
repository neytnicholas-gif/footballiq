import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260801000040_market_guest_account_import.sql'),
  'utf8',
)

const client = readFileSync(resolve(process.cwd(), 'lib/market/client.ts'), 'utf8')
const authProvider = readFileSync(resolve(process.cwd(), 'components/auth-provider.tsx'), 'utf8')

describe('account-backed Market foundation', () => {
  it('keeps private Market mutations behind authenticated RPCs', () => {
    expect(migration).toMatch(/drop policy if exists "Users insert own holdings"/i)
    expect(migration).toMatch(/revoke all on table public\.market_holdings from anon, authenticated/i)
    expect(migration).toMatch(/grant select on table public\.market_holdings to authenticated/i)
    expect(migration).toMatch(/grant execute on function public\.market_buy_player\(text, text\) to authenticated/i)
    expect(migration).not.toMatch(/grant (insert|update|delete|all).*market_holdings to authenticated/i)
  })

  it('removes global price-changing functions from normal users', () => {
    expect(migration).toMatch(/revoke all on function public\.market_admin_update_player_value[\s\S]*from public, anon, authenticated/i)
    expect(migration).toMatch(/revoke all on function public\.market_apply_simulated_matchweek[\s\S]*from public, anon, authenticated/i)
    expect(migration).not.toMatch(/grant execute on function public\.market_apply_simulated_matchweek[\s\S]*to authenticated/i)
  })

  it('imports guest selections once without accepting client balances or prices', () => {
    expect(migration).toMatch(/create table if not exists public\.market_guest_imports/i)
    expect(migration).toMatch(/create or replace function public\.market_import_guest_squad/i)
    expect(migration).toMatch(/if requested_count > 11/i)
    expect(migration).toMatch(/holdings_gk > 1 or holdings_def > 4 or holdings_mid > 3 or holdings_fwd > 3/i)
    expect(migration).toMatch(/select uid, id, current_value, current_value, 0/i)
    expect(migration).not.toMatch(/p_(balance|cash|acquisition_value)/i)
  })

  it('attempts guest migration after authentication and only clears local state after success', () => {
    expect(authProvider).toMatch(/importGuestMarketOnce\(data\.session\.user\.id\)/)
    expect(authProvider).toMatch(/importGuestMarketOnce\(currentUserId\)/)
    expect(client).toMatch(/supabase\.rpc\('market_import_guest_squad'/)
    expect(client).toMatch(/if \(result\?\.ok\) \{[\s\S]*clearAnonymousState\(\)/)
  })
})
