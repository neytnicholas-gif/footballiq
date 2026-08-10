import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { ScoutRoomExperience } from '@/components/academy/scout-room-experience'

export default function ScoutRoomPlayerEvaluationPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <ScoutRoomExperience />
        <div className="mt-5">
          <Link href="/academy/scout" className="text-sm font-semibold text-primary">Return to Scout Academy</Link>
        </div>
      </section>
    </main>
  )
}
