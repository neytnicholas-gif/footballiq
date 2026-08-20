import { ModePage } from '@/components/mode-page'
import { DailyChallenge } from '@/components/daily-challenge'
export const metadata = { title: 'Daily Challenge', description: 'Five fresh football decisions every day.' }

export default function DailyPage() {
  return (
    <ModePage
      compact
      theme="daily"
      eyebrow="Five questions • every day • one saved score"
      title="Today’s Shout"
      description="Make five football decisions. Play for practice, or sign in to save today’s score and XP."
      primaryActionLabel="Start today’s Shout"
    >
      <DailyChallenge />
    </ModePage>
  )
}
