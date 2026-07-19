# FootballIQ v7 — Engagement Upgrade

## Main improvements
- Football Duels redesigned around fast, replayable rounds.
- Timed and relaxed play.
- Combo scoring and speed bonuses.
- Correct support for tied statistics through a real “Same” answer.
- Randomised question order and left/right positions on every replay.
- Personal bests and played-pack progress stored on the device.
- End-of-pack grades, shareable scores and instant rematches.
- Searchable/filterable pack library with difficulty and category labels.
- Refreshed quiz library presentation.

## Deploy the small update
Copy the contents of `FootballIQ_V7_DROP_IN.zip` into the existing project folder and replace matching files. Then run:

```bash
npm run build
git add .
git commit -m "Upgrade FootballIQ engagement"
git push
```

No `npm install` is required because no new packages were added.
