-- FootballIQ quiz progress persistence v1
-- Safe to run more than once.

create table if not exists public.quiz_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id text not null,
  current_index integer not null default 0,
  score integer not null default 0,
  total integer not null default 0,
  progress jsonb not null default '{}'::jsonb,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, quiz_id)
);

alter table public.quiz_progress enable row level security;

drop policy if exists "Users can read own quiz progress" on public.quiz_progress;
create policy "Users can read own quiz progress" on public.quiz_progress for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own quiz progress" on public.quiz_progress;
create policy "Users can insert own quiz progress" on public.quiz_progress for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own quiz progress" on public.quiz_progress;
create policy "Users can update own quiz progress" on public.quiz_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own quiz progress" on public.quiz_progress;
create policy "Users can delete own quiz progress" on public.quiz_progress for delete using (auth.uid() = user_id);

create index if not exists quiz_progress_user_updated_idx on public.quiz_progress(user_id, updated_at desc);