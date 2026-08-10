-- Allow a league owner to remove an accidental or finished private league.
create or replace function public.market_delete_friend_league(p_league_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
set statement_timeout = '4s'
set lock_timeout = '2s'
as $$
declare
  uid uuid := auth.uid();
  deleted_name text;
begin
  if uid is null then raise exception 'Not authenticated'; end if;

  delete from public.market_friend_leagues
  where id = p_league_id and owner_user_id = uid
  returning name into deleted_name;

  if deleted_name is null then
    raise exception 'League not found or you are not its owner';
  end if;

  return jsonb_build_object('deleted', true, 'league_id', p_league_id, 'name', deleted_name);
end;
$$;

revoke all on function public.market_delete_friend_league(bigint) from public, anon, authenticated, service_role;
grant execute on function public.market_delete_friend_league(bigint) to authenticated;
