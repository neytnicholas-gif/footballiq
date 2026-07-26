# FootballIQ V2 — Phase 1 Drop-In

This update adds the permanent retention foundation without changing packages or Supabase tables.

## Included
- Daily Quick Play: the same deterministic 10-question mixed duel for everyone each day.
- Automatic next-question flow after feedback.
- Per-question XP flash and stronger combo/speed rewards.
- Football career ranks from Football Fan to Legend.
- Rank progress on the home page, result screen and redesigned profile.
- Existing packs remain available and keep best-score tracking.

## Apply
1. Copy the contents of this folder into the ROOT of your current FootballIQ project.
2. Choose **Replace files in destination**.
3. Do not leave this drop-in folder inside the project.
4. In VS Code run:

```bash
npm run build
git add .
git commit -m "Add FootballIQ V2 core loop"
git push
```

No `npm install` and no new Supabase SQL are required.
