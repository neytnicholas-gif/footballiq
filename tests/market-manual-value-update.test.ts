import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { validateManualValueUpdate, type ManualValueUpdateInput } from '../lib/market/manual-value-update'
const valid: ManualValueUpdateInput = { internalId: 'fiq_player_0001', expectedCurrentValueMinor: 125, newValueMinor: 130, effectiveAt: '2026-08-08T00:00:00.000Z', privateJustification: 'Original FootballIQ weekly judgement.', requestId: 'manual:2026-08-08:0001', eventType: 'manual_adjustment', adminUserId: '123e4567-e89b-42d3-a456-426614174000' }
test('manual update contract accepts adjustment and correction events', () => { assert.deepEqual(validateManualValueUpdate(valid), []); assert.deepEqual(validateManualValueUpdate({ ...valid, eventType: 'correction' }), []) })
test('manual update contract rejects unsafe, stale-prone or unauditable input', () => { for (const input of [{ ...valid, internalId: 'provider-1' }, { ...valid, expectedCurrentValueMinor: 1.5 }, { ...valid, newValueMinor: 201 }, { ...valid, effectiveAt: 'bad' }, { ...valid, privateJustification: 'short' }, { ...valid, requestId: 'x' }, { ...valid, adminUserId: 'not-a-uuid' }]) assert.ok(validateManualValueUpdate(input as ManualValueUpdateInput).length > 0) })
test('migration keeps value updates server-only, locked, idempotent and atomic', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260731_04_manual_market_v1.sql', import.meta.url), 'utf8')
  for (const requirement of ['security definer', 'ADMIN_REQUIRED', 'for update', 'STALE_VALUE', 'IDEMPOTENCY_KEY_CONFLICT', 'market_valuation_events', 'market_recalculate_portfolio_totals', 'revoke all on function', 'grant execute on function public.market_admin_update_player_value', 'to service_role']) assert.match(sql, new RegExp(requirement, 'i'))
  assert.doesNotMatch(sql, /grant execute on function public\.market_admin_update_player_value[^;]+to authenticated/i)
  assert.match(sql, /insert into public\.market_valuation_events[\s\S]+p_new_value_minor - player_row\.current_price_minor, null, 'manual-v1'/i)
})
