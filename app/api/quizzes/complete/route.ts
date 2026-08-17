import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { isValidCompletionKey } from '@/lib/quiz-save'
import { verifyQuizReward, type QuizCompletionClaim } from '@/lib/quiz-rules'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function env(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY' | 'SUPABASE_SERVICE_ROLE_KEY') {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not configured.`)
  return value
}

function bearerToken(request: Request) {
  const authorization = request.headers.get('authorization') ?? ''
  if (!authorization.startsWith('Bearer ')) return null
  const token = authorization.slice(7).trim()
  return token || null
}

export async function POST(request: Request) {
  const token = bearerToken(request)
  if (!token) return NextResponse.json({ error: 'Sign in before saving a result.' }, { status: 401 })

  let stage = 'configuration'
  try {
    const url = env('NEXT_PUBLIC_SUPABASE_URL')
    const anonKey = env('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY')
    const auth = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    stage = 'authentication'
    const { data: authData, error: authError } = await auth.auth.getUser(token)
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Your session has expired. Please sign in again.' }, { status: 401 })
    }

    stage = 'request-validation'
    const body = await request.json() as Partial<QuizCompletionClaim>
    if (typeof body.completionKey !== 'string' || !isValidCompletionKey(body.completionKey)) {
      return NextResponse.json({ error: 'Invalid completion key.' }, { status: 400 })
    }

    stage = 'reward-verification'
    const verified = verifyQuizReward({
      quizId: typeof body.quizId === 'string' ? body.quizId : '',
      score: body.score as number,
      total: body.total as number,
      completionKey: body.completionKey,
      metrics: body.metrics,
      proof: body.proof as QuizCompletionClaim['proof'],
    })

    const admin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString()
    stage = 'ticket-authorisation'
    const { error: ticketError } = await admin.from('quiz_completion_tickets').upsert({
      user_id: authData.user.id,
      completion_key: verified.completionKey,
      quiz_id: verified.quizId,
      score: verified.score,
      total: verified.total,
      xp_earned: verified.xp,
      expires_at: expiresAt,
    }, { onConflict: 'user_id,completion_key' })
    if (ticketError) throw new Error(`Could not secure quiz completion: ${ticketError.message}`)

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    stage = 'database-completion'
    const { data, error } = await userClient.rpc('complete_quiz', {
      p_quiz_id: verified.quizId,
      p_score: verified.score,
      p_total: verified.total,
      p_xp: verified.xp,
      p_completion_key: verified.completionKey,
    })
    if (error) throw new Error(error.message)

    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Quiz completion failed.'
    console.error('Quiz completion failed', { stage, message })
    const clientError = /unknown quiz|unknown scenario|allowed range|whole number|quiz length|invalid|proof|claimed score/i.test(message)
    return NextResponse.json({ error: clientError ? message : 'Result could not be saved safely. Please retry.' }, { status: clientError ? 400 : 500 })
  }
}
