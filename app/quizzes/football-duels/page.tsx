import { ModePage } from '@/components/mode-page'
import { DuelHub } from '@/components/duel-hub'

export default function FootballDuelsPage() {
  return (
    <ModePage
      theme="duels"
      eyebrow="Head-to-head • timing • composure"
      title="Football Duels"
      description="Choose a stat pack, compare two players, and build score, combo and rating momentum in fast rounds."
    >
      <DuelHub />
    </ModePage>
  )
}