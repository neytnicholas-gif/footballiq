'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { MessageSquareText } from 'lucide-react'
import { BRAND } from '@/lib/brand'

export function BetaFeedbackButton() {
  const pathname = usePathname()
  const [browserDetails, setBrowserDetails] = useState('Browser details will be added when you send this')

  useEffect(() => {
    setBrowserDetails(window.navigator.userAgent)
  }, [])

  const href = useMemo(() => {
    if (!pathname.startsWith('/market')) return null
    const release = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? 'local/unknown'
    const body = [`Page: ${pathname}`, `Release: ${release}`, `Browser/device: ${browserDetails}`, '', 'What happened?', '', 'What did you expect?', '', 'What felt confusing, slow or especially good?'].join('\n')
    return `mailto:${BRAND.supportEmail}?subject=${encodeURIComponent(`Back Your Eye beta feedback · ${pathname}`)}&body=${encodeURIComponent(body)}`
  }, [browserDetails, pathname])
  if (!href) return null
  return <a href={href} className="fixed bottom-4 right-4 z-40 inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-200/30 bg-emerald-950 px-4 py-3 text-sm font-black text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700" aria-label="Send beta feedback about this page"><MessageSquareText className="size-4" /><span className="hidden sm:inline">Beta feedback</span></a>
}
