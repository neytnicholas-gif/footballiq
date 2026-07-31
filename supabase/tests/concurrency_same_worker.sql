set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000901',false);
select public.market_buy_player('00000000-0000-4000-8000-000000000921','nonprod-concurrent-same-key',100);
reset role;
