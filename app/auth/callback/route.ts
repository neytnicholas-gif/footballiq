import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)

  const code = requestUrl.searchParams.get('code')
  const authError = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  if (authError) {
    console.error('Google OAuth error:', authError, errorDescription)

    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(errorDescription || authError)}`,
        request.url
      )
    )
  }

  if (!code) {
    console.error('Auth callback received no code')

    return NextResponse.redirect(
      new URL('/login?error=no_auth_code', request.url)
    )
  }

  try {
    const supabase = await createClient()

    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('Code exchange failed:', exchangeError)

      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(exchangeError.message)}`,
          request.url
        )
      )
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('User verification failed:', userError)

      return NextResponse.redirect(
        new URL('/login?error=user_verification_failed', request.url)
      )
    }

    console.log('Google login successful for user:', user.id)

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('Profile lookup failed:', profileError)

      // Authentication succeeded.
      // Do not incorrectly send the user back as a failed Google login.
      return NextResponse.redirect(
        new URL('/username', request.url)
      )
    }

    if (profile?.username) {
      return NextResponse.redirect(
        new URL('/', request.url)
      )
    }

    return NextResponse.redirect(
      new URL('/username', request.url)
    )
  } catch (error) {
    console.error('Unexpected auth callback error:', error)

    return NextResponse.redirect(
      new URL('/login?error=unexpected_callback_error', request.url)
    )
  }
}