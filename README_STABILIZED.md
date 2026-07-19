# FootballIQ Stabilized v5

This version consolidates authentication, profiles, database fields, navigation, leaderboard and Football Duels into one consistent project.

## One-time Supabase action
Run `SUPABASE_MASTER_SETUP.sql` in Supabase SQL Editor. It is idempotent and can be run over the current database.

## Environment variables
Set these locally and in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Deploy
```bash
npm install
npm run build
git add .
git commit -m "Stabilize FootballIQ v5"
git push
```

## Included
- Email/password auth only (Google removed)
- Persistent Supabase sessions
- Automatic profile row creation
- Stable username onboarding without redirect loops
- Real profile statistics and leaderboard
- 10 Football Duels packs
- XP, rating and streak update RPC
- Permanent navigation routes
- Clear placeholders for unfinished modes rather than fake functionality

## Content note
The duel data is supplied as starter content. Verify every statistic and scope before a large public marketing launch, especially active-player totals.
