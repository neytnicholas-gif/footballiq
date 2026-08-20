'use client'

import { usePathname } from 'next/navigation'
import { MessageSquareText } from 'lucide-react'

export function BetaFeedbackButton() {
  const pathname = usePathname()
  if (!pathname.startsWith('/market')) return null
  const release = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? 'local/unknown'
  const message = [`Page: ${pathname}`, `Release: ${release}`, 'Browser/device:', '', 'What happened?', '', 'What did you expect?', '', 'What felt confusing, slow or especially good?'].join('\n')
  const params = new URLSearchParams({ topic: 'beta', subject: `Beta feedback · ${pathname}`, message })
  const href = `/contact?${params.toString()}`
  return <aside aria-label="Beta feedback"><a href={href} className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-3 z-40 inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-200/30 bg-emerald-950 px-4 py-3 text-sm font-black text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:right-4 md:bottom-4" aria-label="Send beta feedback about this page"><MessageSquareText className="size-4" /><span className="hidden sm:inline">Beta feedback</span></a></aside>
}
