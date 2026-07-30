import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { About } from '@/components/about'

export const metadata: Metadata = {
  title: 'About',
  description: 'About FootballIQ and the public beta mission.',
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14">
        <p className="text-xs font-semibold uppercase tracking-[.22em] text-primary">FootballIQ</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">The home of football judgement.</h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          FootballIQ is a public-beta platform for football decisions, memory, scouting interpretation
          and prediction discipline. It is built for learning and competition through gameplay, not for
          betting or professional accreditation.
        </p>
      </section>
      <About />
      <SiteFooter compact />
    </main>
  )
}
