insert into auth.users(id) values
 ('00000000-0000-4000-8000-000000000901'),
 ('00000000-0000-4000-8000-000000000902');
insert into public.market_seasons(id,name,competition_key,season_key,starts_at,ends_at,is_active)
values('nonprod-concurrency-v1','NONPROD CONCURRENCY V1','nonprod-concurrency','fixture-only','2098-08-01T00:00:00Z','2099-06-01T00:00:00Z',true);
insert into public.market_catalogues(id,season_id,fingerprint,status,record_count,rejected_count,validated_at,approved_at,approved_by,activated_at,manual_schema_version,approval_fingerprint,declaration_independently_selected,declaration_no_systematic_copy,declaration_original_values,declaration_manually_reviewed,declaration_identities_resolved)
values('00000000-0000-4000-8000-000000000920','nonprod-concurrency-v1',repeat('b',64),'active',2,0,'2098-07-01T00:00:00Z','2098-07-02T00:00:00Z','NONPROD CONCURRENCY REVIEWER','2098-07-03T00:00:00Z',1,repeat('b',64),true,true,true,true,true);
insert into public.market_players(id,season_id,catalogue_id,full_name,display_name,slug,initial_price_minor,current_price_minor,internal_player_id,availability_status,data_updated_at)
values
 ('00000000-0000-4000-8000-000000000921','nonprod-concurrency-v1','00000000-0000-4000-8000-000000000920','NONPROD CONCURRENCY PLAYER A','NONPROD CONCURRENCY PLAYER A','nonprod-concurrency-a',100,100,'fiq_player_nonprod_concurrency_a','available','2098-07-01T00:00:00Z'),
 ('00000000-0000-4000-8000-000000000922','nonprod-concurrency-v1','00000000-0000-4000-8000-000000000920','NONPROD CONCURRENCY PLAYER B','NONPROD CONCURRENCY PLAYER B','nonprod-concurrency-b',100,100,'fiq_player_nonprod_concurrency_b','available','2098-07-01T00:00:00Z');
update public.market_settings set active_season_id='nonprod-concurrency-v1',active_catalogue_id='00000000-0000-4000-8000-000000000920' where id=1;
