FOOTBALLIQ V3 — INSTALL AND DEPLOY

IMPORTANT
- This ZIP excludes .env.local on purpose. Keep the .env.local file from your current working project.
- Before replacing anything, make a backup copy of your current project folder.

STEP 1 — REPLACE THE PROJECT FILES
1. Extract this ZIP.
2. Open the extracted folder named refdecision-v2-referee-rating.
3. Copy everything inside it.
4. Paste it into your existing FootballIQ project folder.
5. Choose "Replace the files in the destination" when Windows asks.
6. Do not delete or overwrite your existing .env.local.

STEP 2 — ACTIVATE REAL SEPARATE LEADERBOARDS
1. Open Supabase.
2. Open SQL Editor.
3. Create a new query.
4. Open FOOTBALLIQ_COMPETITIVE_PLATFORM.sql from this project.
5. Copy all of it into Supabase and press Run.
6. You should see: Success. No rows returned.

STEP 3 — TEST LOCALLY
Open the project in VS Code, then run:

npm install
npm run build
npm run dev

Open http://localhost:3000 and check:
- Home page
- Quizzes page
- Referee Arena
- Scout Vision
- Football Duels
- Leaderboard tabs
- A public player profile from a leaderboard row

STEP 4 — DEPLOY TO VERCEL
Run these commands one at a time:

git add .
git commit -m "Launch FootballIQ V3 mode identities and competitive leaderboards"
git push

Vercel should deploy automatically after the push.

WHAT THIS VERSION ADDS
- Unique visual identity for each game mode
- Dark floodlit Referee Arena
- Tactical heat-map Scout Vision
- Distinct mystery, career, daily and prediction styling
- Redesigned quiz game hub
- Overall, daily, weekly, monthly and seasonal rankings
- Separate specialist ratings for every quiz mode
- Public player profiles
- Existing authentication, quiz content and Supabase data preserved
