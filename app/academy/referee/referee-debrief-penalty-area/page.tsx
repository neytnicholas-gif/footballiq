import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { ProAccessGate } from '@/components/membership/pro-access-gate'
import { RefereeDebriefExperience } from '@/components/academy/referee-debrief-experience'

export default function RefereeDebriefPenaltyAreaPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <ProAccessGate
          title="Referee Debrief: Penalty-Area Decision"
          copy="This complete premium learning experience is available to Pro users."
          preview={
            <div className="rounded-xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
              You will assess a staged incident, submit foul-restart-sanction-VAR decisions, and review the expert debrief.
            </div>
          }
        >
          <RefereeDebriefExperience />
        </ProAccessGate>
        <div className="mt-5">
          <Link href="/academy/referee" className="text-sm font-semibold text-primary">Return to Referee Academy</Link>
        </div>
      </section>
    </main>
  )
}
