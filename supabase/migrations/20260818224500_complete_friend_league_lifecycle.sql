-- Give prediction and quiz mini-league owners a safe, explicit way to close a
-- league. Members already have leave functions; owners delete the parent row
-- and the existing ON DELETE CASCADE constraints remove memberships/fixtures.

create or replace function public.prediction_delete_league(p_league_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  deleted_name text;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;

  delete from public.prediction_leagues
  where id = p_league_id and owner_user_id = uid
  returning name into deleted_name;

  if not found then raise exception 'LEAGUE_NOT_FOUND_OR_NOT_OWNER'; end if;
  return jsonb_build_object('deleted', true, 'league_id', p_league_id, 'name', deleted_name);
end
$$;

create or replace function public.quiz_delete_friend_league(p_league_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  deleted_name text;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;

  delete from public.quiz_friend_leagues
  where id = p_league_id and owner_user_id = uid
  returning name into deleted_name;

  if not found then raise exception 'LEAGUE_NOT_FOUND_OR_NOT_OWNER'; end if;
  return jsonb_build_object('deleted', true, 'league_id', p_league_id, 'name', deleted_name);
end
$$;

revoke all on function public.prediction_delete_league(uuid) from public, anon, authenticated, service_role;
revoke all on function public.quiz_delete_friend_league(uuid) from public, anon, authenticated, service_role;
grant execute on function public.prediction_delete_league(uuid) to authenticated;
grant execute on function public.quiz_delete_friend_league(uuid) to authenticated;

alter function public.prediction_delete_league(uuid) set statement_timeout = '5s';
alter function public.quiz_delete_friend_league(uuid) set statement_timeout = '5s';
