'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  useEffect(() => {
    void (async () => {
      await supabase.auth.getSession()
      router.replace('/')
    })()
  }, [router])
  return <main className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Finishing sign in…</main>
}
