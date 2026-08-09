import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal-page'

export const metadata: Metadata = { title: 'Player Market Game Rules', description: 'How the FootballIQ Player Market works.' }

export default function GameRulesPage() {
  return <LegalPage title="Player Market Game Rules" summary="A plain-language description of the FootballIQ Player Market. These rules should be read together with the Terms of Use.">
    <section><h2>1. Free game credits only</h2><p>Each account receives 100m FIQ Credits for gameplay. Credits have no cash value, cannot be purchased, withdrawn or transferred, and do not represent ownership of a player or any real-world asset.</p></section>
    <section><h2>2. Build an eleven-player squad</h2><p>A complete squad contains 1 goalkeeper, 4 defenders, 3 midfielders and 3 forwards. Players from supported leagues may be combined. Availability and position come from the current verified catalogue.</p></section>
    <section><h2>3. Gameweek transfers</h2><p>You may make up to 11 new signings in a gameweek, subject to available FIQ Credits and open squad slots. Sales are not currently capped. Buying or selling uses the authoritative game price shown at confirmation.</p></section>
    <section><h2>4. Price movement</h2><p>FootballIQ prices are original internal game values. After completed fixtures, eligible verified player ratings and minutes are compared with position-based baselines and recent eligible appearances. Per-match, per-gameweek and overall price limits reduce extreme movement.</p></section>
    <section><h2>5. Freeze and correction policy</h2><p>If a fixture is incomplete, a player lacks eligible evidence, provider data is unavailable or validation fails, the price stays frozen. The processing engine is designed to apply each eligible fixture once. Corrections may be applied when the source data is formally corrected, with an audit record.</p></section>
    <section><h2>6. Reveals and rankings</h2><p>After processing, a Reveal can show the change in your squad’s game value and individual player movement. Leaderboards compare game performance only. They do not represent financial wealth, financial returns or real-world player values.</p></section>
    <section><h2>7. Pre-launch changes</h2><p>During founder testing, FootballIQ may adjust methodology, limits or presentation to improve fairness and reliability. Material rule changes will be documented before broader public play.</p></section>
  </LegalPage>
}
