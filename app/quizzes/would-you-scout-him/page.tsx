import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

export default function WouldYouScountHimPage() {
  return (
    <main className="relative min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-24">
        <div className="w-full rounded-[32px] border border-white/10 bg-black/20 p-8 text-center shadow-[0_20px_80px_-30px_rgba(0,0,0,0.75)] backdrop-blur">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-primary">Scout Vision</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Scout Vision is loading.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            This experience is ready to be wired into the full scouting quiz flow, and the dedicated route is now in place for the next step.
          </p>
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}