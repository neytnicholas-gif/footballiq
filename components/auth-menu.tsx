'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth-provider'

export function AuthMenu() {
  const { user, profile, loading, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  if (loading) {
    return <div className="hidden h-10 w-28 animate-pulse rounded-xl bg-secondary/60 sm:block" />
  }

  if (!user) {
    return (
      <Button
        size="lg"
        nativeButton={false}
        render={<Link href="/login" />}
        className="hidden h-10 rounded-xl px-5 font-medium glow-green sm:inline-flex"
      >
        Sign in
      </Button>
    )
  }

  const username = profile?.username || 'Create username'

  return (
    <div ref={menuRef} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
      >
        <UserRound className="size-4 text-primary" />
        <span className="max-w-32 truncate">{username}</span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="glass absolute right-0 mt-2 w-56 rounded-2xl p-2 shadow-xl">
          <div className="border-b border-border px-3 py-3">
            <p className="text-sm font-semibold">{username}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            Profile
          </Link>
          <Link
            href="/profile#rating"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            Rating
          </Link>
          <Link
            href="/profile#statistics"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            Statistics
          </Link>
          {!profile?.username && (
            <Link
              href="/username"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm text-primary hover:bg-secondary"
            >
              Create username
            </Link>
          )}
          <button
            type="button"
            onClick={() => signOut()}
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
          >
            <LogOut className="size-4" />
            Log out
          </button>
        </div>
      )}
    </div>
  )
}
