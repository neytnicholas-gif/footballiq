import { createClient } from '@supabase/supabase-js'
import { validateManualValueUpdate, type ManualValueEventType, type ManualValueUpdateInput, type ManualValueUpdateResult } from '../lib/market/manual-value-update'

function arg(name: string): string | null { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] ?? null : null }
function integer(name: string): number { const parsed = Number(arg(name)); return Number.isSafeInteger(parsed) ? parsed : Number.NaN }
async function main() {
  const input: ManualValueUpdateInput = { internalId: arg('--player-id') ?? '', expectedCurrentValueMinor: integer('--expected-value'), newValueMinor: integer('--new-value'), effectiveAt: arg('--effective-at') ?? '', privateJustification: arg('--justification') ?? '', requestId: arg('--request-id') ?? '', eventType: (arg('--event-type') ?? 'manual_adjustment') as ManualValueEventType, adminUserId: arg('--admin-user-id') ?? '' }
  const errors = validateManualValueUpdate(input)
  if (errors.length) throw new Error(`BLOCKED: ${errors.join(', ')}`)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error('BLOCKED: Server-only Supabase configuration is missing.')
  const client = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await client.rpc('market_admin_update_player_value', { p_internal_player_id: input.internalId, p_expected_current_value_minor: input.expectedCurrentValueMinor, p_new_value_minor: input.newValueMinor, p_effective_at: input.effectiveAt, p_private_justification: input.privateJustification, p_request_id: input.requestId, p_event_type: input.eventType, p_admin_user_id: input.adminUserId })
  if (error) throw new Error(`UPDATE_FAILED: ${error.message}`)
  const result = data as unknown as ManualValueUpdateResult
  if (!result?.ok) throw new Error(`UPDATE_FAILED: ${JSON.stringify(result)}`)
  console.log(JSON.stringify(result, null, 2))
}
void main().catch((error) => { console.error(error instanceof Error ? error.message : 'Unknown manual update error'); process.exitCode = 1 })
