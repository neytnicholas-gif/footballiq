'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCallbackErrorMessage, getSafeRedirectPath } from '@/lib/signup-form'

export default function AuthCallbackPage() {
  const router = useRouter()

  const [message, setMessage] = useState('Finishing sign in…')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const searchParams = new URLSearchParams(window.location.search)
      const callbackError = searchParams.get('error')
      const callbackErrorDescription = searchParams.get('error_description')
      const callbackCode = searchParams.get('code')
      const nextCandidate = searchParams.get('next')

      const surfacedCallbackError = getCallbackErrorMessage(callbackError, callbackErrorDescription)
      if (surfacedCallbackError) {
        if (!cancelled) {
          setErrorMessage(surfacedCallbackError)
        }
        return
      }

      setMessage('Validating confirmation…')

      if (callbackCode) {
        const { error } = await supabase.auth.exchangeCodeForSession(callbackCode)
        if (error) {
          if (!cancelled) {
            setErrorMessage(getCallbackErrorMessage(error.code ?? error.name ?? 'callback_failed', error.message))
          }
          return
        }
      }

      const { data, error } = await supabase.auth.getSession()
      if (error) {
        if (!cancelled) {
          setErrorMessage(getCallbackErrorMessage(error.code ?? error.name ?? 'session_failed', error.message))
        }
        return
      }

      const session = data.session
      if (!session?.user) {
        if (!cancelled) {
          setErrorMessage('We could not complete sign in. Please try again from the login page.')
        }
        return
      }

      const safeNext = getSafeRedirectPath(nextCandidate, '')
      if (safeNext) {
        router.replace(safeNext)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .maybeSingle()

      if (profileError) {
        if (!cancelled) {
          setErrorMessage('Sign in completed, but we could not load your profile yet. Please open sign in again.')
        }
        return
      }

      if (profile?.username) {
        router.replace('/')
        return
      }

      router.replace('/username')
    })()

    return () => {
      cancelled = true
    }
  }, [router])

  if (errorMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
        <div className="w-full max-w-lg rounded-2xl border border-destructive/30 bg-destructive/10 p-6">
          <h1 className="text-xl font-bold">Authentication callback failed</h1>
          <p role="alert" className="mt-3 text-sm leading-relaxed text-destructive">{errorMessage}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/login" className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
              Go to sign in
            </Link>
            <Link href="/signup" className="inline-flex h-10 items-center rounded-lg border border-border bg-background px-4 text-sm font-semibold text-foreground">
              Go to signup
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return <main className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">{message}</main>
}
