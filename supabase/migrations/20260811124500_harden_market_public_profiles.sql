begin;

create index if not exists profiles_username_lower_public_idx
  on public.profiles(lower(username)) where username is not null;

alter function public.market_public_profile(text) set statement_timeout='3s';
alter function public.market_my_progression() set statement_timeout='5s';
alter function public.market_update_profile_preferences(boolean,boolean,boolean) set statement_timeout='3s';
alter function public.market_set_showcase_badges(text[]) set statement_timeout='3s';
alter function public.market_equip_reward(text) set statement_timeout='3s';
alter function public.market_set_formation(text) set statement_timeout='3s';
alter function public.market_buy_player(text,text) set statement_timeout='5s';
alter function public.market_buy_player(text,text) set lock_timeout='2s';
alter function public.market_sell_player(text,text) set statement_timeout='5s';
alter function public.market_sell_player(text,text) set lock_timeout='2s';

commit;
