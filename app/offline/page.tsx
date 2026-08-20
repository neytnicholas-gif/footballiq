import type { Metadata } from 'next'
import Link from 'next/link'
import { WifiOff } from 'lucide-react'
import { Logo } from '@/components/logo'

export const metadata: Metadata = {
  title: 'You are offline',
  robots: { index: false, follow: false },
}
export default function OfflinePage() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[#06131b] px-4 py-10 text-white">
      <section className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,#0a2730,#081923)] p-6 shadow-2xl sm:p-8">
        <Logo />
        <div className="mt-8 grid size-14 place-items-center rounded-2xl bg-amber-300/10 text-amber-200"><WifiOff className="size-7" /></div>
        <h1 className="mt-5 text-3xl font-black">You are offline.</h1>
        <p className="mt-3 leading-7 text-slate-300">Early Shout could not reach the internet. Any round already saved on this device is still safe. Reconnect, then try again.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/" className="inline-flex min-h-12 items-center rounded-xl bg-emerald-300 px-5 font-black text-slate-950">Try again</Link>
          <Link href="/how-to-play" className="inline-flex min-h-12 items-center rounded-xl border border-white/15 px-5 font-bold">Offline help</Link>
        </div>
      </section>
    </main>
  )
}
