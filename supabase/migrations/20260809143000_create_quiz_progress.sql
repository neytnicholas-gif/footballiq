-- Persist unfinished game state so signed-in players can safely resume runs.

create table if not exists public.quiz_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id text not null,
  current_index integer not null default 0 check (current_index >= 0),
  score integer not null default 0 check (score >= 0),
  total integer not null default 0 check (total >= 0),
  progress jsonb not null default '{}'::jsonb,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, quiz_id)
);

alter table public.quiz_progress enable row level security;

drop policy if exists "Users can read own quiz progress" on public.quiz_progress;
create policy "Users can read own quiz progress"
  on public.quiz_progress for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own quiz progress" on public.quiz_progress;
create policy "Users can insert own quiz progress"
  on public.quiz_progress for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own quiz progress" on public.quiz_progress;
create policy "Users can update own quiz progress"
  on public.quiz_progress for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own quiz progress" on public.quiz_progress;
create policy "Users can delete own quiz progress"
  on public.quiz_progress for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.quiz_progress from public, anon;
grant select, insert, update, delete on table public.quiz_progress to authenticated;
