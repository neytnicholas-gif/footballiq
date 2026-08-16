# Player-market position pricing decision

## Decision

Early Shout keeps one evidence-based opening-price scale for every position. It does not force goalkeeper and defender prices to copy midfielder or forward ceilings.

This is deliberate. Every player chooses the same fixed 1-4-3-3 structure, so all users need one goalkeeper, four defenders, three midfielders and three forwards. A lower average goalkeeper or defender price therefore does not give one user a structural advantage over another. Artificially lifting a whole position would make the game prices less faithful to verified football evidence.

## Publication guardrails

Every catalogue sync now fails before publication unless each position has:

- enough active players for a broad three-league market;
- at least 20-25 distinct 0.1m price points;
- at least 2.0m between its 10th and 90th percentiles; and
- a credible upper band (GK 8.0m, DEF 9.0m, MID/FWD 10.0m minimum).

The full book must also keep at least 900 players, a 2.0m central spread, at least 25 distinct prices, conservative fallback caps and no fallback player in the elite top 25.

## Verified production baseline — 16 August 2026

| Position | Players | Price points | P10 | Median | P90 | Maximum |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| GK | 122 | 35 | 4.8m | 6.25m | 8.8m | 10.3m |
| DEF | 409 | 55 | 4.8m | 7.1m | 8.9m | 11.1m |
| MID | 335 | 73 | 4.8m | 7.4m | 10.5m | 14.5m |
| FWD | 316 | 67 | 4.8m | 7.2m | 10.5m | 14.5m |

## Review trigger

Revisit the model only with gameplay evidence: repeated position-based budget exploits, a position becoming an automatic no-thought choice, or beta data showing that a broad group cannot build meaningfully different valid squads. Do not normalize ceilings only because the four distributions differ.
