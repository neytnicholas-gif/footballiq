import 'server-only'

import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

type RateLimitRow = {
  allowed: boolean
  remaining: number
  reset_at: string
}

function requiredEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY') {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not configured.`)
  return value
}

/**
 * Claims one attempt from the database-backed limiter. The database function
 * serialises concurrent claims, so separate Vercel instances share one limit.
 */
export async function claimSharedRateLimit(input: {
  scope: string
  subject: string
  limit: number
  windowSeconds: number
}) {
  const admin = createClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  )
  const subjectHash = createHash('sha256')
    .update(`${input.scope}:${input.subject}`)
    .digest('hex')
  const { data, error } = await admin.rpc('claim_api_rate_limit', {
    p_scope: input.scope,
    p_subject_hash: subjectHash,
    p_limit: input.limit,
    p_window_seconds: input.windowSeconds,
  })
  if (error) throw new Error(`Shared rate limiter is unavailable: ${error.message}`)
  const row = (Array.isArray(data) ? data[0] : data) as RateLimitRow | null
  if (!row || typeof row.allowed !== 'boolean') throw new Error('Shared rate limiter returned an invalid response.')
  return row
}
