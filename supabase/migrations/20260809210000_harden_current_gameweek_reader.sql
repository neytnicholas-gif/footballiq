begin;
alter function public.market_current_gameweek() security invoker;
commit;
