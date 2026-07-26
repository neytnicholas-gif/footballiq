import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { ProAccessGate } from '@/components/membership/pro-access-gate'
import { ScoutRoomExperience } from '@/components/academy/scout-room-experience'

export default function ScoutRoomPlayerEvaluationPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <ProAccessGate
          title="Scout Room: Player Evaluation"
          copy="This complete premium learning experience is available to Pro users."
          preview={
            <div className="rounded-xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
              You will review a full player dossier, submit structured judgement, and receive expert-style analysis reveal.
            </div>
          }
        >
          <ScoutRoomExperience />
        </ProAccessGate>
        <div className="mt-5">
          <Link href="/academy/scout" className="text-sm font-semibold text-primary">Return to Scout Academy</Link>
        </div>
      </section>
    </main>
  )
}
