import { SiteHeader } from '@/components/site-header'
import { RefereeDecisionQuiz } from '@/components/referee-decision-quiz'
import { SiteFooter } from '@/components/site-footer'

export default function RefereeDecisionsPage() {
  return (
    <main className="relative min-h-screen bg-background">
      <SiteHeader />
      <RefereeDecisionQuiz />
      <SiteFooter />
    </main>
  )
}