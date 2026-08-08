import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const compatibilityMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260808211648_staging_market_app_compatibility.sql'),
  'utf8',
)
const importMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260808224500_staging_guest_squad_import.sql'),
  'utf8',
)

const client = readFileSync(resolve(process.cwd(), 'lib/market/client.ts'), 'utf8')
const authProvider = readFileSync(resolve(process.cwd(), 'components/auth-provider.tsx'), 'utf8')

describe('account-backed Market foundation', () => {
  it('keeps app mutations behind authenticated slug-based RPCs', () => {
    expect(compatibilityMigration).toMatch(/revoke all on function public\.market_buy_player\(text,text\) from public,anon/i)
    expect(compatibilityMigration).toMatch(/grant execute on function public\.market_buy_player\(text,text\) to authenticated/i)
    expect(compatibilityMigration).toMatch(/pg_advisory_xact_lock/i)
    expect(compatibilityMigration).not.toMatch(/grant (insert|update|delete|all).*market_holdings to authenticated/i)
  })

  it('exposes account reads through an owner-scoped snapshot', () => {
    expect(compatibilityMigration).toMatch(/create or replace function public\.market_app_portfolio_snapshot/i)
    expect(compatibilityMigration).toMatch(/where p\.user_id=uid/i)
    expect(compatibilityMigration).toMatch(/revoke all on function public\.market_app_portfolio_snapshot\(\) from public,anon/i)
  })

  it('imports guest selections once without accepting client balances or prices', () => {
    expect(compatibilityMigration).toMatch(/create table if not exists public\.market_guest_imports/i)
    expect(importMigration).toMatch(/create or replace function public\.market_import_guest_squad/i)
    expect(importMigration).toMatch(/requested_count > settings_row\.maximum_holdings/i)
    expect(importMigration).toMatch(/gk_count > 1 or def_count > 4 or mid_count > 3 or fwd_count > 3/i)
    expect(importMigration).toMatch(/mp\.current_price_minor,\s*mp\.current_price_minor, 0/i)
    expect(importMigration).not.toMatch(/p_(balance|cash|acquisition_value|price)/i)
  })

  it('attempts guest migration after authentication and only clears local state after success', () => {
    expect(authProvider).toMatch(/importGuestMarketOnce\(data\.session\.user\.id\)/)
    expect(authProvider).toMatch(/importGuestMarketOnce\(currentUserId\)/)
    expect(client).toMatch(/supabase\.rpc\('market_import_guest_squad'/)
    expect(client).toMatch(/if \(result\?\.ok\) \{[\s\S]*clearAnonymousState\(\)/)
  })
})
