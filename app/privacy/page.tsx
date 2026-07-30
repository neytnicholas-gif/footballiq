import type { Metadata } from 'next'
import { LegalPageShell } from '@/components/legal-page-shell'
import { LEGAL_CONTACT_EMAIL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How FootballIQ handles account, gameplay and technical data during public beta.',
}

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      summary="This policy explains what data FootballIQ uses in public beta, why it is used, and the choices you have."
    >
      <h2>1. Data we collect</h2>
      <p>
        FootballIQ stores account and gameplay data needed to run the platform. This can include your
        email-based sign-in details through Supabase Authentication, your chosen username, and game
        results such as quiz scores, XP, ratings, streaks and related statistics.
      </p>

      <h2>2. How we use your data</h2>
      <ul>
        <li>Create and secure your account session.</li>
        <li>Save progress, rankings and gameplay history.</li>
        <li>Operate daily challenges, mode performance and leaderboards.</li>
        <li>Diagnose errors, abuse and service reliability issues.</li>
      </ul>

      <h2>3. Services used to run FootballIQ</h2>
      <p>
        FootballIQ uses Supabase for authentication and database storage, and Vercel for application
        hosting. These providers may process technical request metadata and operational logs needed to
        deliver the service.
      </p>

      <h2>4. Technical logs</h2>
      <p>
        Like most online services, technical logs may include timestamps, request paths, basic device
        and browser information, and error traces. We use this information to keep FootballIQ stable and
        secure.
      </p>

      <h2>5. Data retention</h2>
      <p>
        Account and gameplay records are retained while your account is active and for a reasonable
        period after account closure when needed for security, abuse prevention, dispute handling or
        technical recovery.
      </p>
      {/* TODO(founder-legal): Finalize retention windows per data category before production launch. */}

      <h2>6. Your choices and rights</h2>
      <p>
        You can request access, correction or deletion of your account-related data by contacting us at{' '}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>. We will review requests in
        line with applicable law and what is technically possible in beta operations.
      </p>

      <h2>7. Security limitations</h2>
      <p>
        We take reasonable steps to protect data, but no internet service can guarantee complete
        security. You should use a strong password and protect access to your own devices and email.
      </p>

      <h2>8. Younger users</h2>
      <p>
        FootballIQ is a general audience product. If you are under the age required to manage an online
        account in your location, please use FootballIQ only with parent or guardian permission.
      </p>

      <h2>9. Changes to this policy</h2>
      <p>
        We may update this policy as FootballIQ develops through beta. Any material updates will be
        posted on this page with a revised effective date.
      </p>
    </LegalPageShell>
  )
}
