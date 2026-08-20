import type { Metadata } from 'next'
import { ModePage } from '@/components/mode-page'
import { PredictionsGame } from '@/components/predictions-game'

export const metadata: Metadata = {
  title: 'Match Predictions',
  description: 'Predict real fixtures, score points and compete with friends on Early Shout.',
}

export default function PredictionsPage() {
  return (
    <ModePage
      theme="predictions"
      compact
      eyebrow="Predictions • real fixtures • friend leagues"
      title="Make your early shout."
      description="Predict real league matches before kickoff. Earn points for correct calls, climb the global table or make a private league for your friends."
      primaryActionLabel="Start predicting"
    >
      <PredictionsGame />
    </ModePage>
  )
}
