begin;

insert into auth.users (id) values
 ('00000000-0000-4000-8000-000000000101'), ('00000000-0000-4000-8000-000000000102'),
 ('00000000-0000-4000-8000-000000000103'), ('00000000-0000-4000-8000-000000000104'),
 ('00000000-0000-4000-8000-000000000105');
insert into public.market_seasons (id,name,competition_key,season_key,starts_at,ends_at)
values ('nonprod-readiness-v1','NONPROD READINESS V1','nonprod-only','fixture-only','2098-08-01T00:00:00Z','2099-06-01T00:00:00Z');
insert into public.market_catalogues (id,season_id,fingerprint,status,record_count,rejected_count,validated_at,manual_schema_version)
values ('00000000-0000-4000-8000-000000000200','nonprod-readiness-v1',repeat('a',64),'validated',12,0,'2098-07-01T00:00:00Z',1);
insert into public.market_players (id,season_id,catalogue_id,full_name,display_name,slug,initial_price_minor,current_price_minor,internal_player_id,availability_status,data_updated_at)
select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'nonprod-readiness-v1','00000000-0000-4000-8000-000000000200',
 'NONPROD FIXTURE PLAYER '||n,'NONPROD FIXTURE PLAYER '||n,'nonprod-fixture-player-'||n,100,100,
 'fiq_player_nonprod_'||lpad(n::text,2,'0'),case when n=11 then 'sell_only' when n=12 then 'inactive' else 'available' end,'2098-07-01T00:00:00Z'
from generate_series(1,12) fixture(n);

do $t$ begin
 if (select count(*) from public.market_public_players_v1())<>0 then raise exception 'FAIL_CLOSED_PROJECTION_FAILED'; end if;
 begin perform public.market_activate_catalogue('00000000-0000-4000-8000-000000000200',repeat('a',64)); raise exception 'UNAPPROVED_ACTIVATION_SUCCEEDED';
 exception when others then if position('CATALOGUE_NOT_APPROVED' in sqlerrm)=0 then raise; end if; end;
end $t$;

update public.market_catalogues set status='active',approved_at='2098-07-02T00:00:00Z',approved_by='NONPROD FIXTURE REVIEWER',activated_at='2098-07-03T00:00:00Z',
 approval_fingerprint=repeat('a',64),declaration_independently_selected=true,declaration_no_systematic_copy=true,
 declaration_original_values=true,declaration_manually_reviewed=true,declaration_identities_resolved=true
where id='00000000-0000-4000-8000-000000000200';
update public.market_settings set active_season_id='nonprod-readiness-v1',active_catalogue_id='00000000-0000-4000-8000-000000000200' where id=1;

do $t$ begin
 if public.market_brussels_date('2099-01-15T23:30Z')<>date '2099-01-16' then raise exception 'BRUSSELS_WINTER_FAILED'; end if;
 if public.market_brussels_date('2099-03-29T22:30Z')<>date '2099-03-30' then raise exception 'BRUSSELS_DST_FAILED'; end if;
end $t$;

set local role anon;
do $t$ begin
 if (select count(*) from public.market_public_players_v1())<>11 then raise exception 'ANON_PROJECTION_FAILED'; end if;
 if exists(select 1 from public.market_public_players_v1() where availability_status='inactive') then raise exception 'INACTIVE_PUBLIC'; end if;
 begin perform count(*) from public.market_players; raise exception 'ANON_TABLE_READ_ALLOWED'; exception when insufficient_privilege then null; end;
 begin perform public.market_buy_player('00000000-0000-4000-8000-000000000001','nonprod-anon',100); raise exception 'ANON_BUY_ALLOWED'; exception when insufficient_privilege then null; end;
end $t$;
reset role;

set local role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000101',true);
do $t$ begin
 begin perform public.market_buy_player('00000000-0000-4000-8000-000000000001','nonprod-stale',99); raise exception 'STALE_ACCEPTED';
 exception when others then if position('STALE_PRICE' in sqlerrm)=0 then raise; end if; end;
 perform public.market_buy_player('00000000-0000-4000-8000-000000000001','nonprod-idempotent',100);
 perform public.market_buy_player('00000000-0000-4000-8000-000000000001','nonprod-idempotent',100);
 if (select count(*) from public.market_transactions where idempotency_key='nonprod-idempotent')<>1 then raise exception 'IDEMPOTENCY_FAILED'; end if;
 begin perform public.market_buy_player('00000000-0000-4000-8000-000000000002','nonprod-idempotent',100); raise exception 'CONFLICT_ACCEPTED';
 exception when others then if position('IDEMPOTENCY_KEY_CONFLICT' in sqlerrm)=0 then raise; end if; end;
 begin perform public.market_buy_player('00000000-0000-4000-8000-000000000011','nonprod-sell-only',100); raise exception 'SELL_ONLY_BUY';
 exception when others then if position('PLAYER_UNAVAILABLE' in sqlerrm)=0 then raise; end if; end;
 begin perform public.market_buy_player('00000000-0000-4000-8000-000000000012','nonprod-inactive',100); raise exception 'INACTIVE_BUY';
 exception when others then if position('PLAYER_UNAVAILABLE' in sqlerrm)=0 then raise; end if; end;
end $t$; reset role;

update public.market_players set availability_status='inactive' where id='00000000-0000-4000-8000-000000000001';
set local role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000101',true);
do $t$ declare s jsonb; sold public.market_transactions; begin
 s:=public.market_get_portfolio_snapshot(); if s::text not like '%inactive%' then raise exception 'INACTIVE_HOLDING_HIDDEN'; end if;
 sold:=public.market_sell_player('00000000-0000-4000-8000-000000000001','nonprod-inactive-sale');
 if sold.executed_price_minor<>100 then raise exception 'INACTIVE_SALE_VALUE'; end if;
end $t$; reset role;

set local role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000102',true);
select public.market_buy_player('00000000-0000-4000-8000-000000000002','nonprod-buy-1',100);
select public.market_buy_player('00000000-0000-4000-8000-000000000003','nonprod-buy-2',100);
select public.market_buy_player('00000000-0000-4000-8000-000000000004','nonprod-buy-3',100);
do $t$ begin begin perform public.market_buy_player('00000000-0000-4000-8000-000000000005','nonprod-buy-4',100); raise exception 'FOURTH_BUY';
 exception when others then if position('DAILY_PURCHASE_LIMIT' in sqlerrm)=0 then raise; end if; end; end $t$; reset role;

insert into public.market_portfolios(id,user_id,season_id,starting_balance_minor,cash_balance_minor,total_portfolio_value_minor)
values('00000000-0000-4000-8000-000000000403','00000000-0000-4000-8000-000000000103','nonprod-readiness-v1',1200,700,1200);
insert into public.market_holdings(portfolio_id,player_id,quantity,purchase_price_minor,current_value_minor)
select '00000000-0000-4000-8000-000000000403',('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,1,100,100 from generate_series(2,6) fixture(n);
set local role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000103',true);
do $t$ begin begin perform public.market_buy_player('00000000-0000-4000-8000-000000000007','nonprod-sixth',100); raise exception 'SIXTH_HOLDING';
 exception when others then if position('MAX_HOLDINGS' in sqlerrm)=0 then raise; end if; end; end $t$; reset role;

insert into public.market_portfolios(id,user_id,season_id,starting_balance_minor,cash_balance_minor,current_holdings_value_minor,total_portfolio_value_minor)
values('00000000-0000-4000-8000-000000000404','00000000-0000-4000-8000-000000000104','nonprod-readiness-v1',1200,800,400,1200);
insert into public.market_holdings(portfolio_id,player_id,quantity,purchase_price_minor,current_value_minor)
select '00000000-0000-4000-8000-000000000404',('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,1,100,100 from generate_series(7,10) fixture(n);
set local role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000104',true);
select public.market_sell_player('00000000-0000-4000-8000-000000000007','nonprod-sale-1');
select public.market_sell_player('00000000-0000-4000-8000-000000000008','nonprod-sale-2');
select public.market_sell_player('00000000-0000-4000-8000-000000000009','nonprod-sale-3');
do $t$ begin begin perform public.market_sell_player('00000000-0000-4000-8000-000000000010','nonprod-sale-4'); raise exception 'FOURTH_SALE';
 exception when others then if position('DAILY_SALE_LIMIT' in sqlerrm)=0 then raise; end if; end; end $t$; reset role;

set local role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000101',true);
do $t$ begin
 if (select count(*) from public.market_portfolios)<>1 then raise exception 'OWNER_RLS'; end if;
 if has_table_privilege('authenticated','public.market_manual_value_requests','select') then raise exception 'PRIVATE_JUSTIFICATION_VISIBLE'; end if;
 begin perform public.market_admin_update_player_value('fiq_player_nonprod_02',100,101,'2099-01-01T00:00:00Z','NONPROD fixture justification','nonprod-admin-denied','manual_adjustment','00000000-0000-4000-8000-000000000105'); raise exception 'USER_ADMIN_ALLOWED';
 exception when insufficient_privilege then null; end;
end $t$; reset role;

insert into public.market_admins(user_id) values('00000000-0000-4000-8000-000000000105');
set local role service_role;
do $t$ declare a jsonb; b jsonb; begin
 a:=public.market_admin_update_player_value('fiq_player_nonprod_02',100,101,'2099-01-01T00:00:00Z','NONPROD fixture justification','nonprod-admin-idempotent','manual_adjustment','00000000-0000-4000-8000-000000000105');
 b:=public.market_admin_update_player_value('fiq_player_nonprod_02',100,101,'2099-01-01T00:00:00Z','NONPROD fixture justification','nonprod-admin-idempotent','manual_adjustment','00000000-0000-4000-8000-000000000105');
 if coalesce((a->>'idempotent')::boolean,true) or not coalesce((b->>'idempotent')::boolean,false) then raise exception 'ADMIN_IDEMPOTENCY'; end if;
 begin perform public.market_admin_update_player_value('fiq_player_nonprod_02',100,102,'2099-01-02T00:00:00Z','NONPROD stale justification','nonprod-admin-stale','manual_adjustment','00000000-0000-4000-8000-000000000105'); raise exception 'STALE_ADMIN';
 exception when others then if position('STALE_VALUE' in sqlerrm)=0 then raise; end if; end;
end $t$; reset role;

-- Valuation history is append-only, even for the database owner.
do $t$ declare event_id uuid; begin
 select id into event_id from public.market_valuation_events where idempotency_key='nonprod-admin-idempotent';
 begin update public.market_valuation_events set reason='forbidden fixture edit' where id=event_id; raise exception 'VALUATION_UPDATE_ALLOWED';
 exception when others then if position('VALUATION_EVENTS_ARE_IMMUTABLE' in sqlerrm)=0 then raise; end if; end;
 begin delete from public.market_valuation_events where id=event_id; raise exception 'VALUATION_DELETE_ALLOWED';
 exception when others then if position('VALUATION_EVENTS_ARE_IMMUTABLE' in sqlerrm)=0 then raise; end if; end;
end $t$;

do $t$ begin begin perform public.market_process_valuation_event(null,null,'fixture',0,0,0,0,0,0,0,0,'fixture','fixture',now(),'fixture'); raise exception 'LEGACY_VALUATION';
 exception when others then if position('LEGACY_AUTOMATIC_VALUATION_DISABLED' in sqlerrm)=0 then raise; end if; end; end $t$;

rollback;
do $t$ begin
 if exists(select 1 from public.market_catalogues) or exists(select 1 from public.market_players) then raise exception 'FIXTURES_PERSISTED'; end if;
 if (select active_catalogue_id from public.market_settings where id=1) is not null then raise exception 'MARKET_NOT_CLOSED'; end if;
end $t$;
