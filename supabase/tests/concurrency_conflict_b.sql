set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000902',false);
select public.market_buy_player('00000000-0000-4000-8000-000000000922','nonprod-concurrent-key-b',100);
reset role;
