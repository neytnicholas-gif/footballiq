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

  useEffect(() => {
    setMounted(true)
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1')
    } catch {
      setDismissed(false)
    }
  }, [])

  const hidden = useMemo(() => {
    if (!pathname) return true
    return blockedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  }, [pathname])

  function dismiss() {
    setDismissed(true)
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Ignore storage failures and keep the page functional.
    }
  }

  if (!mounted || loading || user || dismissed || hidden) return null

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 px-4 sm:bottom-6 sm:px-6">
      <div className="mx-auto flex max-w-2xl items-start gap-3 rounded-3xl border border-primary/20 bg-card/95 p-4 shadow-2xl shadow-black/35 backdrop-blur-xl sm:p-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Make your progress count</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Create a free account to earn XP, level up, track your stats, join leaderboards and save unfinished quizzes.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
              Create free account
            </Link>
            <button onClick={dismiss} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground">
              Maybe later
            </button>
          </div>
        </div>
        <button onClick={dismiss} className="rounded-xl border border-border bg-background p-2 text-muted-foreground transition hover:text-foreground" aria-label="Dismiss account prompt">
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}