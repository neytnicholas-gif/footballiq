import 'server-only'

import { createHmac, randomUUID } from 'node:crypto'

export const MAKE_CALL_SESSION_COOKIE = 'es_make_call_sid'
export const MAKE_CALL_SESSION_MAX_AGE = 60 * 60 * 24 * 365

export function newMakeCallSessionId() {
  return randomUUID()
}
export function makeCallSessionHash(sessionId: string, secret: string) {
  return createHmac('sha256', secret).update(`make-call:${sessionId}`).digest('hex')
}

export function isValidMakeCallSessionId(value: string | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))
}
