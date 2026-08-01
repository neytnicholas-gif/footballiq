'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    void (async () => {
      const callbackUrl = new URL(window.location.href)
      const providerError = callbackUrl.searchParams.get('error_description') ?? callbackUrl.searchParams.get('error')
      const code = callbackUrl.searchParams.get('code')

      if (providerError) {
        if (active) setError(providerError)
        return
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          if (active) setError(exchangeError.message)
          return
        }
      }

      const { data, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        if (active) setError(sessionError.message)
        return
      }

      const sessionUser = data.session?.user
      if (!sessionUser) {
        if (active) setError('We could not confirm your sign-in session. Please try again.')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', sessionUser.id)
        .maybeSingle()

      if (profileError) {
        if (active) setError(profileError.message)
        return
      }

      router.replace((profile as { username?: string | null } | null)?.username ? '/' : '/username')
      router.refresh()
    })()

    return () => {
      active = false
    }
  }, [router])

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="max-w-md rounded-3xl border border-destructive/30 bg-card p-6 shadow-2xl">
          <h1 className="text-2xl font-semibold tracking-tight">Could not finish sign in</h1>
          <p role="alert" className="mt-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </p>
          <Link href="/login" className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground">
            Back to sign in
          </Link>
        </div>
      </main>
    )
  }

  return <main role="status" aria-live="polite" className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Finishing sign in…</main>
}
