import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal-page'

export const metadata: Metadata = { title: 'Player Market Game Rules', description: 'How the Early Shout Player Market works.' }

export default function GameRulesPage() {
  return <LegalPage title="Player Market Game Rules" summary="A plain-language description of the Early Shout Player Market. These rules should be read together with the Terms of Use.">
    <section><h2>1. Free game credits only</h2><p>Each account receives 100m Market Credits for gameplay. Credits have no cash value, cannot be purchased, withdrawn or transferred, and do not represent ownership of a player or any real-world asset.</p></section>
    <section><h2>2. Pick your team</h2><p>Your team needs 11 players: 1 goalkeeper, 4 defenders, 3 midfielders and 3 forwards. You can mix players from any league shown in the game.</p></section>
    <section><h2>3. Buy and sell players</h2><p>You can buy up to 11 players in each gameweek if you have enough Market Credits and space in your team. You can sell players to open a space. The confirm screen shows the exact game price before you trade.</p></section>
    <section><h2>4. How prices change</h2><p>These are Early Shout game prices, not real player values. After a match finishes, we use the player’s rating and minutes to work out a small rise, fall or no change. Limits stop one match from changing a price too much.</p></section>
    <section><h2>5. What happens when data is missing?</h2><p>The price stays the same. We do not guess. Each finished match should change a player’s price only once. If the match data is officially fixed later, we can correct the game price and keep a record of the change.</p></section>
    <section><h2>6. See your results</h2><p>After the price update, the Reveal page shows what happened to your team and each player. Leaderboards only compare scores inside this game. Market Credits and player prices are not real money.</p></section>
    <section><h2>7. Pre-launch changes</h2><p>During founder testing, Early Shout may adjust methodology, limits or presentation to improve fairness and reliability. Material rule changes will be documented before broader public play.</p></section>
  </LegalPage>
}
