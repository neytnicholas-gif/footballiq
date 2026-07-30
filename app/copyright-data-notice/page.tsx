import type { Metadata } from 'next'
import { LegalPageShell } from '@/components/legal-page-shell'
import { LEGAL_CONTACT_EMAIL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Copyright and Data Notice',
  description: 'FootballIQ copyright, trademark, independence and third-party reference notice.',
}

export default function CopyrightDataNoticePage() {
  return (
    <LegalPageShell
      title="Copyright and Data Notice"
      summary="This notice explains FootballIQ ownership boundaries and how third-party names and factual references are used."
    >
      <h2>1. Independent product status</h2>
      <p>
        FootballIQ is an independent product. It is not officially affiliated with, endorsed by, or
        operated by any league, club, federation or governing body.
      </p>

      <h2>2. Third-party names and factual references</h2>
      <p>
        FootballIQ may reference player names, club names, competition names and factual football
        statistics for identification, comparison and educational gameplay context.
      </p>

      <h2>3. Trademark ownership</h2>
      <p>
        Trademarks, service marks and brand names remain the property of their respective owners.
        FootballIQ does not claim ownership of third-party trademarks.
      </p>

      <h2>4. FootballIQ-owned content</h2>
      <p>
        Where applicable, FootballIQ owns its original interface design, explanations, gameplay
        mechanics, and platform-specific educational presentation.
      </p>

      <h2>5. Media and asset restrictions</h2>
      <p>
        FootballIQ does not include club crests, league logos, player photographs, broadcast images or
        copyrighted match footage as part of the current product experience.
      </p>

      <h2>6. Reporting concerns</h2>
      <p>
        If you believe content on FootballIQ creates a rights concern, contact{' '}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> with enough detail for review.
      </p>
    </LegalPageShell>
  )
}
