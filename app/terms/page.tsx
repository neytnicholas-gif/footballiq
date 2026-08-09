import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal-page'
import { BRAND } from '@/lib/brand'

export const metadata: Metadata = { title: 'Terms of Use', description: 'Terms governing use of FootballIQ.' }

export default function TermsPage() {
  return <LegalPage title="Terms of Use" summary="These terms govern your use of FootballIQ, including its quizzes, predictions, leaderboards and Player Market game.">
    <section><h2>1. Who provides FootballIQ</h2><p>FootballIQ is an independent digital football-knowledge game operated from Belgium. Contact the operator at <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>. FootballIQ is not affiliated with or endorsed by any league, club, player, governing body or data provider.</p></section>
    <section><h2>2. Eligibility and accounts</h2><p>You must be at least 13 to create an account. If the law where you live requires parental or guardian permission, you must obtain it. You must provide accurate account information, protect your login details and use only accounts you control.</p></section>
    <section><h2>3. The Player Market is a game</h2><p>FIQ Credits and FootballIQ player prices exist only inside the game. They are not money, securities, investments, shares, betting products, transferable property or official player valuations. Credits cannot be bought for cash, withdrawn, exchanged for money or transferred between users. FootballIQ does not promise a financial return or prize.</p></section>
    <section><h2>4. Fair play</h2><p>You may not exploit bugs, automate play, manipulate results, create deceptive accounts, interfere with other users or attempt unauthorised access. We may reverse clearly erroneous game transactions, restrict features or suspend accounts where reasonably necessary to protect users and game integrity.</p></section>
    <section><h2>5. Game changes and availability</h2><p>FootballIQ is in pre-launch testing. Rules, player availability, prices and features may change. Verified data may arrive late or be corrected. Prices freeze when required evidence is unavailable. We may pause processing to prevent duplicate or inaccurate movement.</p></section>
    <section><h2>6. Content and intellectual property</h2><p>FootballIQ software, original design, copy and game methodology are protected by applicable intellectual-property laws. Factual references to football competitions, clubs and players do not imply endorsement. Do not reproduce or commercially exploit FootballIQ content without permission.</p></section>
    <section><h2>7. Acceptable liability limits</h2><p>We provide the pre-launch service on an “as available” basis. Nothing in these terms excludes liability that cannot lawfully be excluded, including liability for fraud, wilful misconduct, death or personal injury caused by negligence, or mandatory consumer rights.</p></section>
    <section><h2>8. Ending use and changes</h2><p>You may stop using FootballIQ or request account deletion at any time. We may update these terms when the service or law changes and will identify the update date. Material changes will be communicated appropriately before they take effect.</p></section>
    <section><h2>9. Law and disputes</h2><p>Belgian law applies, without removing mandatory protections available to consumers in their country of residence. Contact us first so we can try to resolve a concern. Belgian and EU consumers retain access to any courts or remedies provided by mandatory law.</p></section>
  </LegalPage>
}
