begin;

create or replace function public.market_public_price_book_v1()
returns table(
  provider_player_id text,
  current_price_minor integer,
  previous_price_minor integer,
  latest_rating_milli integer,
  value_updated_at timestamptz
) language sql stable security invoker set search_path=pg_catalog,public as $$
  select distinct on (p.provider_player_id)
    p.provider_player_id,p.current_price_minor,
    coalesce(last_event.previous_price_minor,p.current_price_minor),
    p.latest_rating_milli,p.data_updated_at
  from public.market_players p
  join public.market_catalogues c on c.id=p.catalogue_id and c.season_id=p.season_id
  left join lateral (
    select v.previous_price_minor from public.market_valuation_events v
    where v.player_id=p.id order by v.effective_at desc,v.created_at desc limit 1
  ) last_event on true
  where c.status='active' and p.is_available and p.provider_player_id is not null
  order by p.provider_player_id,p.updated_at desc
$$;

revoke all on function public.market_public_price_book_v1() from public;
grant execute on function public.market_public_price_book_v1() to anon,authenticated,service_role;

commit;
