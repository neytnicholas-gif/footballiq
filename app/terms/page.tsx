import type { Metadata } from 'next'
import { LegalPageShell } from '@/components/legal-page-shell'

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Rules and expectations for using FootballIQ during public beta.',
}

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of Use"
      summary="These terms apply when you access or use FootballIQ. By using the platform, you agree to these rules."
    >
      <h2>1. Public beta status</h2>
      <p>
        FootballIQ is provided as a public beta service. Features may change, pause or be removed while
        we improve stability and quality.
      </p>

      <h2>2. Acceptable use</h2>
      <ul>
        <li>Use FootballIQ for personal, lawful and fair-play gameplay.</li>
        <li>Do not attempt to interfere with platform security, availability or integrity.</li>
        <li>Do not automate abuse, spam, scraping or account manipulation.</li>
      </ul>

      <h2>3. Account responsibilities</h2>
      <p>
        You are responsible for activity on your account and for keeping your login credentials secure.
        If you think your account has been compromised, contact us as soon as possible.
      </p>

      <h2>4. Fair-play expectations</h2>
      <p>
        Ratings, XP, streaks, badges and leaderboard outcomes are designed for genuine play. Attempts to
        exploit bugs or manipulate results may lead to score resets, restrictions, suspension or account
        removal.
      </p>

      <h2>5. Virtual progression has no monetary value</h2>
      <p>
        XP, ratings, streaks, badges and any in-product virtual currency or points are entertainment
        features only. They are not real money, not transferable property, and not redeemable for cash.
      </p>

      <h2>6. No gambling or guaranteed outcomes</h2>
      <p>
        FootballIQ is an educational and entertainment product. It does not provide betting services,
        gambling advice, financial investment advice, or guaranteed prediction success.
      </p>

      <h2>7. Content and accuracy limitations</h2>
      <p>
        We aim to keep quiz facts, scenarios and statistics useful and clear, but we cannot guarantee
        that all content is complete, current or error-free at all times.
      </p>

      <h2>8. Intellectual property and boundaries</h2>
      <p>
        FootballIQ interface design, mechanics and explanatory content are protected intellectual
        property where applicable. You may not copy, resell or redistribute substantial parts of the
        service without permission.
      </p>

      <h2>9. User conduct</h2>
      <p>
        You must not post or transmit unlawful, abusive or infringing content through FootballIQ. We may
        remove content or limit features where required to protect users and the platform.
      </p>

      <h2>10. Suspension or termination</h2>
      <p>
        We may suspend, restrict or terminate access where we reasonably believe these terms, platform
        integrity or user safety have been violated.
      </p>

      <h2>11. Limitation of liability</h2>
      <p>
        To the extent allowed by law, FootballIQ is provided &quot;as is&quot; during beta without guarantees of
        uninterrupted availability. We are not liable for indirect, incidental or consequential losses
        arising from use of the service.
      </p>

      <h2>12. Governing law</h2>
      <p>
        Governing law and jurisdiction will be confirmed before full production release.
      </p>
      {/* TODO(founder-legal): Set governing law and venue after legal review. */}

      <h2>13. Changes to these terms</h2>
      <p>
        We may update these terms as FootballIQ evolves. Continued use after updates means you accept
        the revised terms.
      </p>
    </LegalPageShell>
  )
}
