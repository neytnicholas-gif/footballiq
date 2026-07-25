# FootballIQ Legal Risk Register

Last reviewed: 2026-07-25

| Asset or feature | File/location | Type of risk | Current status | Recommended mitigation | Owner verification required |
|---|---|---|---|---|---|
| Premier League naming used as primary pack branding (for example "Premier League Goals", "PL Assists", "Premier League Titles") | lib/duel-packs.ts | Competition trademark and brand-association risk if promoted as an endorsed product line | Present in active duels content | Keep factual/nominative use only, add product-level disclaimer (no affiliation), and consider neutral alternates for pack titles in paid marketing surfaces | Yes |
| Premier League references embedded in quiz/stat data labels | lib/game-data.ts | Trademark plus data-provenance risk when competition naming is tied to numeric datasets | Present in active higher/lower and identity datasets | Add explicit dataset provenance note in product docs and admin content source record; verify that all values are from licensed or permissibly used public records | Yes |
| Premier League wording plus hard claim "updated after 2025/26" without source citation | components/goalscorer-quiz.tsx | Unsupported data-source claim and potential misleading-statements risk | Present in repository (component currently not routed in primary app flow) | Remove or qualify unsupported update claims; add verifiable source metadata and update timestamp process before any route exposure | Yes |
| Interface copy referencing clips ("Clip #148 · Premier League") implying media-backed quiz content | components/quiz-preview.tsx | Broadcast/clip rights implication risk if shipped without licensed media rights | Present in repository (marketing preview component) | Replace with neutral "scenario" wording unless licensed footage rights are secured; gate any clip UI behind verified rights checklist | Yes |
| Use of real player names and club names across quizzes and predictions | lib/duel-packs.ts, lib/game-data.ts, components/predictions-game.tsx | Personality/publicity and database-rights risk in some jurisdictions when combined with commercial/stat products | Present in active gameplay | Keep to factual text-only references, avoid logos/photos, and obtain counsel review for target regions before paid launch | Yes |

## Notes

- No direct evidence found of league or club logos, copyrighted photography, or explicit official partnership claims in active routed pages.
- This register only includes issues supported by repository evidence at the time of review.
