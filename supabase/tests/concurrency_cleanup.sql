update public.market_settings set active_catalogue_id=null,active_season_id=null where id=1;
delete from auth.users where id in ('00000000-0000-4000-8000-000000000901','00000000-0000-4000-8000-000000000902');
delete from public.market_players where catalogue_id='00000000-0000-4000-8000-000000000920';
delete from public.market_catalogues where id='00000000-0000-4000-8000-000000000920';
delete from public.market_seasons where id='nonprod-concurrency-v1';
do $t$ begin
 if exists(select 1 from auth.users where id in ('00000000-0000-4000-8000-000000000901','00000000-0000-4000-8000-000000000902')) then raise exception 'CONCURRENCY_USERS_PERSISTED'; end if;
 if exists(select 1 from public.market_catalogues) or exists(select 1 from public.market_players) or exists(select 1 from public.market_portfolios) or exists(select 1 from public.market_transactions) then raise exception 'CONCURRENCY_FIXTURES_PERSISTED'; end if;
 if (select active_catalogue_id from public.market_settings where id=1) is not null then raise exception 'MARKET_NOT_CLOSED_AFTER_CONCURRENCY'; end if;
end $t$;
