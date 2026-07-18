# FootballIQ Supabase setup

## 1. Create a Supabase project
Go to https://supabase.com and create a free project.

## 2. Add environment variables
In Supabase: Project Settings → API.
Copy:
- Project URL
- anon public key

Create a `.env.local` file in this project with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Also add both variables in Vercel:
Project → Settings → Environment Variables.

## 3. Create the profiles table
In Supabase, go to SQL Editor and run this:

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  rating integer not null default 1000,
  xp integer not null default 0,
  streak integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are readable by everyone"
  on public.profiles
  for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
```

## 4. Enable Google login
Supabase → Authentication → Providers → Google.
Enable it and follow Supabase's instructions for Google OAuth credentials.

## 5. Add redirect URLs
Supabase → Authentication → URL Configuration.
Add these redirect URLs:

```text
http://localhost:3000/auth/callback
https://YOUR-VERCEL-LINK.vercel.app/auth/callback
```

Replace `YOUR-VERCEL-LINK` with your actual Vercel URL.

## 6. Test locally
Run:

```bash
npm install
npm run dev
```

Open http://localhost:3000.
You should see Sign in in the navbar.
