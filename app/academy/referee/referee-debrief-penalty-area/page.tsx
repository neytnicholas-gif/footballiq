import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { RefereeDebriefExperience } from '@/components/academy/referee-debrief-experience'

export default function RefereeDebriefPenaltyAreaPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <RefereeDebriefExperience />
        <div className="mt-5">
          <Link href="/academy/referee" className="text-sm font-semibold text-primary">Return to Referee Academy</Link>
        </div>
      </section>
    </main>
  )
}
