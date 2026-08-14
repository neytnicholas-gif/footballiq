# Independent Early Shout beta trial prompt for Claude

Act as a skeptical senior product engineer, game-economy reviewer, accessibility tester, database/security reviewer, and first-time football-game player. Independently audit the current `fix/clean-auth-progression-repair` HEAD of the Early Shout repository and its matching Vercel Preview deployment. Do not edit the code. First report the exact commit SHA and confirm the live deployment serves that commit; stop if they do not match.

The product is a free-credit football player-value game. Users build a mixed-league 1-4-3-3 squad, receive prices derived from licensed Sportmonks player/match data, see price changes after verified completed matches, sell or replace players, complete challenges, earn Style Credits and rewards, use private friend leagues, and optionally show profile badges and market statistics. There is no cash-out and game credits have no monetary value.

## Required audit method

1. Use a fresh guest session and a separate authenticated test account. Never expose tokens, cookies, email addresses, or private identifiers in the report.
2. Test desktop (1440×900), tablet (768×1024), and mobile (390×844). Check keyboard-only use, visible focus, zoom/reflow, touch targets, contrast, loading, empty, success, error, and slow-response states.
3. Walk every public route and every primary navigation/control. At minimum cover `/`, `/quizzes` and every quiz mode, `/daily`, `/predictions`, `/leaderboard`, `/profile`, `/terms`, `/privacy`, `/game-rules`, `/beta`, `/market`, `/market/players`, one player detail, `/market/roster`, `/market/portfolio`, `/market/rewards`, `/market/tools`, `/market/arena`, `/market/leagues`, `/market/reveal`, and `/market/leaderboard`.
4. Complete the real market loop: buy, cancel a buy, duplicate-click a buy, hit a formation/budget/weekly-signing boundary, sell, return to roster, watch/unwatch, inspect transaction history, and confirm balances, holdings, challenges, Style Credits, ownership percentage, and leaderboard stay consistent. Restore the test account to its starting holdings where practical and list every state mutation.
5. Inspect browser console and failed network requests. Treat any raw Postgres/Supabase/provider error, silent failure, fake success, stale balance, broken route, inaccessible control, or misleading copy as a finding.
6. Review the database migrations and application code, especially:
   - `supabase/migrations/20260814160000_keep_market_leaderboard_in_sync.sql`
   - `supabase/migrations/20260814161000_index_remaining_market_foreign_keys.sql`
   - `lib/market/server/sportmonks-client.ts`
   - `lib/market/server/gameweek-engine.ts`
   - the buy/sell, catalogue, reveal, rewards, profile-privacy, quiz-completion, cron, and provider-sync paths.
7. Prove, rather than assume, that the public leaderboard is populated, changes after portfolio updates, hides a user when `show_market_stats=false`, restores them when true, updates a changed username, and exposes no private user data.
8. Challenge opening-price quality. Verify that split team/season statistic rows are aggregated, current established data beats fallback data, transferred/promoted players can use their latest established season from another competition, `CLEAN_SHEET` is recognised, unknown players receive a conservative fallback, and a catalogue with under 65% quality-priced players cannot be published. Look for any remaining path that could rank unknown players above elite established players.
9. Trace one completed Sportmonks match end to end: fixture → eligible minutes/rating → idempotent match stat → residual/carry movement → valuation event → player price → holdings/portfolio → Reveal → gameweek rollover. Verify replay, late rating, partial failure, rate limit, retry, and concurrent-run behaviour. Do not call Sportmonks from Preview; production-domain-only access is a licensing requirement.
10. Review readiness for 10,000 registered beta users with realistic, non-simultaneous traffic. Check bounded queries, cache behaviour, indexes, RLS, function privileges, idempotency, lock/statement timeouts, scheduled-job recovery, rate-limit telemetry, monitoring, backup/restore assumptions, and graceful degradation. Do not claim a live load result unless you actually ran it and state the exact load shape.
11. Check legal/trust copy for consistency: licensed Sportmonks attribution, fictional game-price wording, no investment/betting/cash-out implication, no logos/headshots, operator/contact placeholders, privacy choices, beta limitations, and honest statements about updates.

## Report rules

- Begin with `PASS`, `CONDITIONAL PASS`, or `FAIL` for invitation-only beta. Do not use “100% safe” or “perfect”.
- Separate verified defects from suggestions. Give every defect severity (`Blocker`, `High`, `Medium`, `Low`), exact reproduction steps, expected vs actual result, route, screenshot/network evidence, and exact `file:line` root cause when available.
- Include a route/device matrix, data-flow verdict, security/privacy verdict, game-economy verdict, 10,000-user capacity verdict, and a list of untested items.
- Re-run every failed scenario once to rule out transient behaviour.
- End with a launch-gate checklist containing only binary, independently verifiable checks and a smallest-first repair order.
- If you find no defect in an area, say what you tested and what evidence supports that result. Absence of evidence is not a pass.
