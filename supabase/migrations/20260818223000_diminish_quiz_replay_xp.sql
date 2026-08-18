-- Keep replays useful for practice without allowing one easy activity to
-- inflate the global leaderboard. Each quiz+difficulty bucket is counted
-- atomically per Brussels day, so concurrent submissions cannot bypass it.

alter table public.quiz_completion_tickets
  add column if not exists reward_bucket text,
  add column if not exists awarded_xp integer;

update public.quiz_completion_tickets
set reward_bucket = quiz_id
where reward_bucket is null;

alter table public.quiz_completion_tickets
  drop constraint if exists quiz_completion_tickets_reward_bucket_format;

alter table public.quiz_completion_tickets
  add constraint quiz_completion_tickets_reward_bucket_format check (
    char_length(reward_bucket) between 1 and 180
    and reward_bucket ~ '^[A-Za-z0-9:_-]+$'
  );

create table if not exists public.quiz_reward_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_bucket text not null,
  activity_date date not null,
  completion_count integer not null default 0 check (completion_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, reward_bucket, activity_date)
);

alter table public.quiz_reward_daily enable row level security;
revoke all on table public.quiz_reward_daily from public, anon, authenticated, service_role;

create or replace function public.complete_quiz(
  p_quiz_id text,
  p_score integer,
  p_total integer,
  p_xp integer,
  p_completion_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  ticket public.quiz_completion_tickets%rowtype;
  existing_result boolean;
  activity_day date := (now() at time zone 'Europe/Brussels')::date;
  reward_run_count integer;
  adjusted_xp integer;
  result_payload jsonb;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into ticket
  from public.quiz_completion_tickets
  where user_id = uid
    and completion_key = p_completion_key
  for update;

  if ticket.user_id is null then
    raise exception 'Quiz completion was not authorised by the server';
  end if;

  if ticket.consumed_at is not null then
    select exists (
      select 1 from public.quiz_results
      where user_id = uid and completion_key = p_completion_key
    ) into existing_result;

    if existing_result then
      return jsonb_build_object(
        'awarded', false,
        'already_processed', true,
        'completion_key', p_completion_key,
        'activity_date', activity_day,
        'xp_awarded', coalesce(ticket.awarded_xp, ticket.xp_earned),
        'base_xp', ticket.xp_earned
      );
    end if;

    raise exception 'Quiz completion ticket was already used';
  end if;

  if ticket.expires_at < now() then
    raise exception 'Quiz completion ticket expired';
  end if;

  if ticket.quiz_id <> p_quiz_id
    or ticket.score <> p_score
    or ticket.total <> p_total
    or ticket.xp_earned <> p_xp then
    raise exception 'Quiz completion does not match the server-authorised result';
  end if;

  insert into public.quiz_reward_daily(user_id, reward_bucket, activity_date, completion_count)
  values (uid, coalesce(ticket.reward_bucket, ticket.quiz_id), activity_day, 1)
  on conflict (user_id, reward_bucket, activity_date) do update
  set completion_count = public.quiz_reward_daily.completion_count + 1,
      updated_at = now()
  returning completion_count into reward_run_count;

  adjusted_xp := case reward_run_count
    when 1 then p_xp
    when 2 then round(p_xp * 0.50)
    when 3 then round(p_xp * 0.25)
    else round(p_xp * 0.10)
  end;

  update public.quiz_completion_tickets
  set consumed_at = now(), awarded_xp = adjusted_xp
  where user_id = uid and completion_key = p_completion_key;

  result_payload := public.complete_quiz_unsecured_internal(
    p_quiz_id,
    p_score,
    p_total,
    adjusted_xp,
    p_completion_key
  );

  return result_payload || jsonb_build_object(
    'xp_awarded', adjusted_xp,
    'base_xp', p_xp,
    'daily_bucket_run', reward_run_count
  );
end;
$$;

revoke all on function public.complete_quiz(text, integer, integer, integer, text)
  from public, anon, authenticated, service_role;
grant execute on function public.complete_quiz(text, integer, integer, integer, text)
  to authenticated;

comment on table public.quiz_reward_daily is
  'Atomic per-user counters used to reduce XP from repeated quiz+difficulty runs each Brussels day.';
