import { ModePage } from '@/components/mode-page'
import { PredictionsGame } from '@/components/predictions-game'

export default function PredictionsPage() {
  return (
    <ModePage
      theme="predictions"
      compact
      eyebrow="Five fixtures • one match card"
      title="Matchday Predictions"
      description="Pick 1 for a home win, X for a draw or 2 for an away win. Make all five picks, then lock them in. These are practice matches, not live games."
    >
      <PredictionsGame />
    </ModePage>
  )
}
