'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { X, Sparkles } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'

const DISMISS_KEY = 'footballiq-account-prompt-dismissed-v1'

const blockedPaths = ['/login', '/signup', '/auth/callback', '/username', '/profile']

export function AccountPrompt() {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [readyToShow, setReadyToShow] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1')
    } catch {
      setDismissed(false)
    }
  }, [])

  useEffect(() => {
    if (!mounted || loading || user || dismissed) return
    const timer = window.setTimeout(() => setReadyToShow(true), 1800)
    return () => window.clearTimeout(timer)
  }, [dismissed, loading, mounted, user])

  const hidden = useMemo(() => {
    if (!pathname) return true
    return blockedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  }, [pathname])

  function dismiss() {
    setDismissed(true)
    setReadyToShow(false)
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Ignore storage failures and keep the page functional.
    }
  }

  useEffect(() => {
    if (!readyToShow) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [readyToShow])

  if (!mounted || loading || user || dismissed || hidden || !readyToShow) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-40 px-3 sm:bottom-5 sm:px-6">
      <div className="pointer-events-auto mx-auto flex w-full max-w-xl items-start gap-3 rounded-3xl border border-primary/20 bg-card/96 p-3.5 shadow-2xl shadow-black/15 backdrop-blur-xl sm:p-4" role="region" aria-label="Create account prompt">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Make your progress count</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Create a free account to save unfinished quizzes, earn XP, level up, track your stats and compete on leaderboards.
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <Link href="/signup" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              Create free account
            </Link>
            <button onClick={dismiss} className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              Maybe later
            </button>
          </div>
        </div>
        <button onClick={dismiss} className="rounded-xl border border-border bg-background p-2 text-muted-foreground transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" aria-label="Dismiss account prompt">
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}