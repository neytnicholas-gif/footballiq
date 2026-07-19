import { ModePage } from '@/components/mode-page'
import { PredictionsGame } from '@/components/predictions-game'

export default function PredictionsPage() {
  return (
    <ModePage
      theme="predictions"
      eyebrow="Fixtures • probabilities • foresight"
      title="Prediction Centre"
      description="Evaluate each simulated fixture card, lock your 1/X/2 picks, and track prediction discipline over time."
    >
      <PredictionsGame />
    </ModePage>
  )
}