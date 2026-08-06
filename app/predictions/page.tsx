import { ModePage } from '@/components/mode-page'
import { PredictionsGame } from '@/components/predictions-game'

export default function PredictionsPage() {
  return (
    <ModePage
      theme="predictions"
      compact
      eyebrow="Five fixtures • one match card"
      title="Matchday Predictions"
      description="Read the matchup, choose 1, X or 2, and lock the complete card. This is a gameplay simulation—not a live fixture feed."
    >
      <PredictionsGame />
    </ModePage>
  )
}
