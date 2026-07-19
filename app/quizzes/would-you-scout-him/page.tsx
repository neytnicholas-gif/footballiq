import { ModePage } from '@/components/mode-page'
import { ScoutVisionGame } from '@/components/scout-vision-game'

export default function WouldYouScountHimPage() {
  return (
    <ModePage
      theme="scout"
      eyebrow="Observation • interpretation • uncertainty"
      title="Scout Vision"
      description="Review fictional player dossiers, make a scouting decision, and compare your judgement with structured expert reasoning."
    >
      <ScoutVisionGame />
    </ModePage>
  )
}