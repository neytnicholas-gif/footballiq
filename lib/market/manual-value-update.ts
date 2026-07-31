import { MARKET_RULES } from '@/lib/market/settings'

export type ManualValueEventType = 'manual_adjustment' | 'correction'
export type ManualValueUpdateInput = { internalId: string; expectedCurrentValueMinor: number; newValueMinor: number; effectiveAt: string; privateJustification: string; requestId: string; eventType: ManualValueEventType; adminUserId: string }
export type ManualValueUpdateResult = { ok: true; eventId: string; playerId: string; previousValueMinor: number; newValueMinor: number; effectiveAt: string; idempotent: boolean } | { ok: false; code: string; message: string }

export function validateManualValueUpdate(value: ManualValueUpdateInput): string[] {
  const errors: string[] = []
  if (!/^fiq_player_[a-z0-9][a-z0-9_-]{2,63}$/.test(value.internalId)) errors.push('INVALID_INTERNAL_ID')
  for (const [name, amount] of [['EXPECTED_VALUE', value.expectedCurrentValueMinor], ['NEW_VALUE', value.newValueMinor]] as const) if (!Number.isSafeInteger(amount) || amount < MARKET_RULES.minimumPriceMinor || amount > MARKET_RULES.maximumPriceMinor) errors.push(`INVALID_${name}`)
  if (!Number.isFinite(Date.parse(value.effectiveAt))) errors.push('INVALID_EFFECTIVE_AT')
  if (value.privateJustification.trim().length < 10 || value.privateJustification.length > 1000) errors.push('INVALID_PRIVATE_JUSTIFICATION')
  if (!/^[A-Za-z0-9][A-Za-z0-9:_-]{7,127}$/.test(value.requestId)) errors.push('INVALID_REQUEST_ID')
  if (value.eventType !== 'manual_adjustment' && value.eventType !== 'correction') errors.push('INVALID_EVENT_TYPE')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.adminUserId)) errors.push('INVALID_ADMIN_USER_ID')
  return errors
}
