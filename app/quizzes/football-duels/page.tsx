import { SiteHeader } from '@/components/site-header'
import { GoalscorerQuiz } from '@/components/goalscorer-quiz'
import { SiteFooter } from '@/components/site-footer'

export default function FootballDuelsPage() {
  return (
    <main className="relative min-h-screen bg-background">
      <SiteHeader />
      <GoalscorerQuiz />
      <SiteFooter />
    </main>
  )
}