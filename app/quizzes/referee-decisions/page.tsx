import { ModePage } from '@/components/mode-page'
import { RefereeDecisionQuiz } from '@/components/referee-decision-quiz'

export default function RefereeDecisionsPage() {
  return (
    <ModePage
      theme="referee"
      eyebrow="Laws • judgement • control"
      title="Referee Arena"
      description="Work through match incidents, choose your decision, and review the law-based reasoning after each call."
    >
      <RefereeDecisionQuiz />
    </ModePage>
  )
}