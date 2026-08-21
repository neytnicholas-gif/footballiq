import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import type { MakeCallSnapshot } from '@/lib/make-call'
import { MAKE_CALL_ACTIONS } from '@/lib/make-call'
import { claimSharedRateLimit } from '@/lib/server/shared-rate-limit'
import {
  isValidMakeCallSessionId,
  makeCallSessionHash,
  MAKE_CALL_SESSION_COOKIE,
  MAKE_CALL_SESSION_MAX_AGE,
  newMakeCallSessionId,
} from '@/lib/server/make-call-session'
import type { Database } from '@/lib/supabase/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function requiredEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY' | 'SUPABASE_SERVICE_ROLE_KEY') {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not configured.`)
  return value
}

function bearerToken(request: Request) {
  const authorization = request.headers.get('authorization') ?? ''
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() || null : null
}

function attachGuestCookie(response: NextResponse, sessionId: string, created: boolean) {
  if (!created) return response
  response.cookies.set(MAKE_CALL_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAKE_CALL_SESSION_MAX_AGE,
  })
  return response
}

async function requestIdentity(request: NextRequest) {
  const url = requiredEnv('NEXT_PUBLIC_SUPABASE_URL')
  const anonKey = requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')
  const currentCookie = request.cookies.get(MAKE_CALL_SESSION_COOKIE)?.value
  const created = !isValidMakeCallSessionId(currentCookie)
  const sessionId = created ? newMakeCallSessionId() : currentCookie!
  const guestHash = makeCallSessionHash(sessionId, serviceRoleKey)
  const token = bearerToken(request)
  let userId: string | null = null

  if (token) {
    const auth = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const { data, error } = await auth.auth.getUser(token)
    if (error || !data.user) throw new Error('AUTH_EXPIRED')
    userId = data.user.id
  }

  const admin = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  return { admin, created, guestHash, sessionId, userId }
}

function privateJson(body: MakeCallSnapshot | { error: string }, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Authorization, Cookie' },
  })
}

export async function GET(request: NextRequest) {
  let stage = 'configuration'
  try {
    const identity = await requestIdentity(request)
    stage = 'rate-limit'
    const limit = await claimSharedRateLimit({
      scope: 'make-call-read',
      subject: identity.userId ?? identity.guestHash,
      limit: 240,
      windowSeconds: 60 * 60,
    })
    if (!limit.allowed) {
      return attachGuestCookie(privateJson({ error: 'Too many game refreshes. Please wait a moment.' }, { status: 429 }), identity.sessionId, identity.created)
    }

    const requestUrl = new URL(request.url)
    const slug = requestUrl.searchParams.get('slug') || null
    const exclude = requestUrl.searchParams.get('exclude') || null
    if (slug && (slug.length > 80 || !SLUG_PATTERN.test(slug))) {
      return attachGuestCookie(privateJson({ error: 'That round name is not valid.' }, { status: 400 }), identity.sessionId, identity.created)
    }
    if (exclude && !UUID_PATTERN.test(exclude)) {
      return attachGuestCookie(privateJson({ error: 'That round reference is not valid.' }, { status: 400 }), identity.sessionId, identity.created)
    }

    stage = 'database-read'
    const { data, error } = await identity.admin.rpc('get_make_call_game_private', {
      p_matchup_slug: slug,
      p_user_id: identity.userId,
      p_guest_session_hash: identity.guestHash,
      p_exclude_matchup_id: exclude,
    })
    if (error) throw new Error(error.message)
    return attachGuestCookie(privateJson(data as unknown as MakeCallSnapshot), identity.sessionId, identity.created)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Game could not be loaded.'
    if (message === 'AUTH_EXPIRED') return privateJson({ error: 'Your session expired. Refresh or sign in again.' }, { status: 401 })
    console.error('Make the Call load failed', { stage, message })
    return privateJson({ error: 'The next call could not be loaded. Please retry.' }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  let stage = 'configuration'
  try {
    const identity = await requestIdentity(request)
    stage = 'rate-limit'
    const limit = await claimSharedRateLimit({
      scope: 'make-call-submit',
      subject: identity.userId ?? identity.guestHash,
      limit: 60,
      windowSeconds: 60 * 60,
    })
    if (!limit.allowed) {
      return attachGuestCookie(privateJson({ error: 'Too many calls were submitted. Please try again later.' }, { status: 429 }), identity.sessionId, identity.created)
    }

    stage = 'request-validation'
    const body = await request.json() as Record<string, unknown>
    const matchupId = typeof body.matchupId === 'string' ? body.matchupId : ''
    const selections = Object.fromEntries(MAKE_CALL_ACTIONS.map((action) => [action, typeof body[action] === 'string' ? body[action] : '']))
    const ids = [matchupId, selections.start, selections.bench, selections.sell]
    if (!ids.every((value) => UUID_PATTERN.test(value))) {
      return attachGuestCookie(privateJson({ error: 'Choose one valid player for every action.' }, { status: 400 }), identity.sessionId, identity.created)
    }
    if (new Set(ids.slice(1)).size !== 3) {
      return attachGuestCookie(privateJson({ error: 'Start, bench and sell must use three different players.' }, { status: 400 }), identity.sessionId, identity.created)
    }

    stage = 'database-submit'
    const { data, error } = await identity.admin.rpc('submit_make_call_vote_private', {
      p_matchup_id: matchupId,
      p_start_player_id: selections.start,
      p_bench_player_id: selections.bench,
      p_sell_player_id: selections.sell,
      p_user_id: identity.userId,
      p_guest_session_hash: identity.guestHash,
    })
    if (error) {
      const closed = /no longer open/i.test(error.message)
      const invalid = /different players|belong to this matchup|not found/i.test(error.message)
      return attachGuestCookie(privateJson({
        error: closed ? 'This call closed while you were choosing. Load the next round.' : invalid ? error.message : 'Your call could not be saved safely. Please retry.',
      }, { status: closed ? 409 : invalid ? 400 : 503 }), identity.sessionId, identity.created)
    }
    return attachGuestCookie(privateJson(data as unknown as MakeCallSnapshot), identity.sessionId, identity.created)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Vote submission failed.'
    if (message === 'AUTH_EXPIRED') return privateJson({ error: 'Your session expired. Refresh or sign in again.' }, { status: 401 })
    console.error('Make the Call submission failed', { stage, message })
    return privateJson({ error: 'Your call could not be saved safely. Please retry.' }, { status: 503 })
  }
}
