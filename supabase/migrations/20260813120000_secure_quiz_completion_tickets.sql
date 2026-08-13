-- Quiz rewards must be authorised by the application server. The public RPC
-- keeps its existing signature for client compatibility, but it can only
-- consume a short-lived, single-use ticket written with the service role.

create table if not exists public.quiz_completion_tickets (
  user_id uuid not null references auth.users(id) on delete cascade,
  completion_key text not null,
  quiz_id text not null,
  score integer not null,
  total integer not null,
  xp_earned integer not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, completion_key),
  constraint quiz_completion_tickets_key_format check (
    char_length(completion_key) between 24 and 120
    and completion_key ~ '^[A-Za-z0-9:_-]+$'
  ),
  constraint quiz_completion_tickets_result_range check (
    score >= 0 and total > 0 and score <= total and xp_earned >= 0
  )
);

alter table public.quiz_completion_tickets enable row level security;
revoke all on table public.quiz_completion_tickets from public, anon, authenticated;
grant select, insert, update, delete on table public.quiz_completion_tickets to service_role;

drop function if exists public.complete_quiz_unsecured_internal(text, integer, integer, integer, text);
alter function public.complete_quiz(text, integer, integer, integer, text)
  rename to complete_quiz_unsecured_internal;
revoke all on function public.complete_quiz_unsecured_internal(text, integer, integer, integer, text)
  from public, anon, authenticated, service_role;

create function public.complete_quiz(
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
        'activity_date', (now() at time zone 'Europe/Brussels')::date
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

  update public.quiz_completion_tickets
  set consumed_at = now()
  where user_id = uid and completion_key = p_completion_key;

  return public.complete_quiz_unsecured_internal(
    p_quiz_id,
    p_score,
    p_total,
    p_xp,
    p_completion_key
  );
end;
$$;

revoke all on function public.complete_quiz(text, integer, integer, integer, text)
  from public, anon, authenticated, service_role;
grant execute on function public.complete_quiz(text, integer, integer, integer, text)
  to authenticated;

comment on table public.quiz_completion_tickets is
  'Short-lived, single-use server authorisations for quiz XP and leaderboard mutations.';
