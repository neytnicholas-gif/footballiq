-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  rating INTEGER DEFAULT 1000,
  xp INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can read their own profile
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
CREATE POLICY "Users can read their own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Remove legacy broad-read policy if present.
DROP POLICY IF EXISTS "Anyone can read profiles" ON profiles;

-- Policy 3: Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 4: Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create an index on username for faster lookups
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);

-- Create an index on rating for leaderboard sorting
CREATE INDEX IF NOT EXISTS profiles_rating_idx ON profiles(rating DESC);

-- Public-safe leaderboard view.
CREATE OR REPLACE VIEW public_leaderboard_profiles AS
SELECT
  id,
  username,
  rating,
  xp,
  streak,
  created_at
FROM profiles
WHERE username IS NOT NULL;

GRANT SELECT ON public_leaderboard_profiles TO anon;
GRANT SELECT ON public_leaderboard_profiles TO authenticated;
