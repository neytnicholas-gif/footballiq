begin;

-- Reward credits are deliberately separate from squad cash. They cannot be
-- bought, transferred or withdrawn, so cosmetics never damage the trade loop.
create table if not exists public.market_reward_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  lifetime_earned integer not null default 0 check (lifetime_earned >= 0),
  lifetime_spent integer not null default 0 check (lifetime_spent >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.market_challenge_definitions (
  challenge_key text primary key check (challenge_key ~ '^[a-z0-9_]+$'),
  title text not null,
  description text not null,
  badge_name text not null,
  icon_key text not null,
  target integer not null check (target > 0),
  reward_credits integer not null check (reward_credits >= 0),
  sort_order integer not null unique,
  active boolean not null default true
);

create table if not exists public.market_user_challenges (
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_key text not null references public.market_challenge_definitions(challenge_key) on delete restrict,
  progress integer not null default 0 check (progress >= 0),
  completed_at timestamptz,
  showcased boolean not null default false,
  showcased_order smallint check (showcased_order between 1 and 3),
  updated_at timestamptz not null default now(),
  primary key (user_id, challenge_key)
);
create unique index if not exists market_user_challenges_showcase_slot_uidx
  on public.market_user_challenges(user_id, showcased_order) where showcased;

create table if not exists public.market_store_items (
  item_key text primary key check (item_key ~ '^[a-z0-9_]+$'),
  item_type text not null check (item_type in ('background','avatar','frame','formation')),
  name text not null,
  description text not null,
  price_credits integer not null check (price_credits >= 0),
  required_trades integer not null default 0 check (required_trades >= 0),
  required_reveals integer not null default 0 check (required_reveals >= 0),
  sort_order integer not null unique,
  active boolean not null default true
);

create table if not exists public.market_user_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null references public.market_store_items(item_key) on delete restrict,
  purchased_at timestamptz not null default now(),
  primary key (user_id, item_key)
);

create table if not exists public.market_profile_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  show_badges boolean not null default true,
  show_market_stats boolean not null default true,
  show_activity boolean not null default false,
  active_background text references public.market_store_items(item_key) on delete set null,
  active_avatar text references public.market_store_items(item_key) on delete set null,
  active_frame text references public.market_store_items(item_key) on delete set null,
  active_formation text not null default '4-3-3' check (active_formation in ('4-3-3','3-4-3')),
  updated_at timestamptz not null default now()
);

insert into public.market_challenge_definitions
  (challenge_key,title,description,badge_name,icon_key,target,reward_credits,sort_order)
values
 ('first_signing','First signing','Buy your first player.','First Pick','shopping-bag',1,40,10),
 ('first_sale','First sale','Sell your first player.','Deal Maker','handshake',1,40,20),
 ('squad_five','Five in the team','Own five players at the same time.','Five-a-Side','users',5,50,30),
 ('full_xi','Build a full XI','Fill all 11 places in your team.','Starting XI','shield',11,100,40),
 ('first_profit','First profit','Sell one player for more than you paid.','Green Arrow','trending-up',1,80,50),
 ('profit_three','Three smart sales','Make a profit on three player sales.','Market Reader','chart',3,120,60),
 ('trade_ten','Market regular','Complete ten buys or sales.','Market Regular','repeat',10,100,70),
 ('trade_fifty','Transfer veteran','Complete fifty buys or sales.','Transfer Veteran','medal',50,250,80),
 ('watch_five','Scout five players','Put five players on your watchlist.','Talent Spotter','eye',5,60,90),
 ('three_leagues','Three-league team','Own players from all three FootballIQ leagues.','League Explorer','globe',3,120,100),
 ('reveal_one','See your first Reveal','Come back after prices update and open a Reveal.','First Reveal','sparkles',1,80,110),
 ('reveal_five','Five Reveals','See how your team moved across five gameweeks.','Form Tracker','calendar',5,180,120),
 ('gain_one_million','One-million gain','Grow total account value by 1.0m FIQ.','Million Up','trophy',1000000,200,130),
 ('profit_ten_million','Ten-million realised profit','Bank 10.0m FIQ of realised game profit.','Golden Touch','crown',10000000,400,140)
on conflict (challenge_key) do update set title=excluded.title,description=excluded.description,
 badge_name=excluded.badge_name,icon_key=excluded.icon_key,target=excluded.target,
 reward_credits=excluded.reward_credits,sort_order=excluded.sort_order,active=true;

insert into public.market_store_items
  (item_key,item_type,name,description,price_credits,required_trades,required_reveals,sort_order)
values
 ('bg_floodlights','background','Floodlights','A night-match glow for your public profile.',120,10,1,10),
 ('bg_tactical_grid','background','Tactical Grid','A clean coach-board pattern for your profile.',180,20,1,20),
 ('bg_trophy_wall','background','Trophy Wall','A gold celebration background for proven market players.',350,50,5,30),
 ('avatar_captain','avatar','Captain','A captain-armband profile icon.',100,10,1,40),
 ('avatar_scout','avatar','Scout Lens','A sharp-eyed scout profile icon.',140,15,1,50),
 ('avatar_playmaker','avatar','Playmaker','A creative-star profile icon.',220,30,3,60),
 ('frame_rising','frame','Rising Form','An emerald frame for a player on the rise.',100,10,1,70),
 ('frame_clean_sheet','frame','Clean Sheet','A cool blue profile frame.',160,20,2,80),
 ('formation_343','formation','3-4-3 formation','Unlock a three-defender, four-midfielder team shape.',300,25,3,90)
on conflict (item_key) do update set item_type=excluded.item_type,name=excluded.name,
 description=excluded.description,price_credits=excluded.price_credits,
 required_trades=excluded.required_trades,required_reveals=excluded.required_reveals,
 sort_order=excluded.sort_order,active=true;

alter table public.market_reward_wallets enable row level security;
alter table public.market_challenge_definitions enable row level security;
alter table public.market_user_challenges enable row level security;
alter table public.market_store_items enable row level security;
alter table public.market_user_items enable row level security;
alter table public.market_profile_preferences enable row level security;

revoke all on table public.market_reward_wallets, public.market_user_challenges,
 public.market_user_items, public.market_profile_preferences from public,anon,authenticated;
revoke all on table public.market_challenge_definitions, public.market_store_items from public,anon,authenticated;
grant select on table public.market_challenge_definitions, public.market_store_items to anon,authenticated;
grant select on table public.market_reward_wallets, public.market_user_challenges,
 public.market_user_items, public.market_profile_preferences to authenticated;
grant all on table public.market_reward_wallets, public.market_challenge_definitions,
 public.market_user_challenges, public.market_store_items, public.market_user_items,
 public.market_profile_preferences to service_role;

create policy market_challenge_definitions_public_read on public.market_challenge_definitions for select using (active);
create policy market_store_items_public_read on public.market_store_items for select using (active);
create policy market_reward_wallet_owner_read on public.market_reward_wallets for select to authenticated using ((select auth.uid())=user_id);
create policy market_user_challenges_owner_read on public.market_user_challenges for select to authenticated using ((select auth.uid())=user_id);
create policy market_user_items_owner_read on public.market_user_items for select to authenticated using ((select auth.uid())=user_id);
create policy market_profile_preferences_owner_read on public.market_profile_preferences for select to authenticated using ((select auth.uid())=user_id);

create index if not exists market_user_challenges_user_completed_idx on public.market_user_challenges(user_id,completed_at);
create index if not exists market_user_items_user_date_idx on public.market_user_items(user_id,purchased_at desc);

create or replace function public.market_refresh_my_progression()
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); pid uuid; start_balance bigint:=100000000; account_value bigint:=0;
  buys integer:=0; sales integer:=0; profitable_sales integer:=0; holding_count integer:=0;
  watch_count integer:=0; league_count integer:=0; reveal_count integer:=0; realised bigint:=0;
  row_def record; measured bigint; was_completed boolean:=false;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('progression:'||uid::text,0));
  insert into public.market_reward_wallets(user_id) values(uid) on conflict do nothing;
  insert into public.market_profile_preferences(user_id) values(uid) on conflict do nothing;
  select p.id,p.starting_balance_minor,p.total_portfolio_value_minor,p.realised_profit_minor
    into pid,start_balance,account_value,realised from public.market_portfolios p
    where p.user_id=uid order by p.created_at desc limit 1;
  if pid is not null then
    select count(*) filter(where transaction_type='buy'),count(*) filter(where transaction_type='sell'),
      count(*) filter(where transaction_type='sell' and executed_price_minor>holding_value_before_minor)
      into buys,sales,profitable_sales from public.market_transactions where portfolio_id=pid;
    select count(*),count(distinct s.competition_key) into holding_count,league_count
      from public.market_holdings h join public.market_players mp on mp.id=h.player_id
      join public.market_seasons s on s.id=mp.season_id where h.portfolio_id=pid;
    select count(*) into reveal_count from public.market_gameweek_reveals where portfolio_id=pid;
  end if;
  select count(*) into watch_count from public.market_watchlist where user_id=uid;
  for row_def in select * from public.market_challenge_definitions where active order by sort_order loop
    measured:=case row_def.challenge_key
      when 'first_signing' then buys when 'first_sale' then sales when 'squad_five' then holding_count
      when 'full_xi' then holding_count when 'first_profit' then profitable_sales when 'profit_three' then profitable_sales
      when 'trade_ten' then buys+sales when 'trade_fifty' then buys+sales when 'watch_five' then watch_count
      when 'three_leagues' then league_count when 'reveal_one' then reveal_count when 'reveal_five' then reveal_count
      when 'gain_one_million' then greatest(0,account_value-start_balance)
      when 'profit_ten_million' then greatest(0,realised) else 0 end;
    select exists(select 1 from public.market_user_challenges c where c.user_id=uid and c.challenge_key=row_def.challenge_key and c.completed_at is not null) into was_completed;
    insert into public.market_user_challenges(user_id,challenge_key,progress,completed_at)
      values(uid,row_def.challenge_key,least(measured,row_def.target),case when measured>=row_def.target then now() end)
    on conflict(user_id,challenge_key) do update set progress=greatest(public.market_user_challenges.progress,excluded.progress),
      completed_at=coalesce(public.market_user_challenges.completed_at,excluded.completed_at),updated_at=now()
    ;
    if measured>=row_def.target and not was_completed then
      update public.market_reward_wallets set balance=balance+row_def.reward_credits,
        lifetime_earned=lifetime_earned+row_def.reward_credits,updated_at=now() where user_id=uid;
    end if;
  end loop;
  return public.market_my_progression();
end $$;

create or replace function public.market_my_progression()
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); trade_count integer:=0; reveal_count integer:=0;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select count(*) into trade_count from public.market_transactions t join public.market_portfolios p on p.id=t.portfolio_id where p.user_id=uid;
  select count(*) into reveal_count from public.market_gameweek_reveals r join public.market_portfolios p on p.id=r.portfolio_id where p.user_id=uid;
  return jsonb_build_object(
    'wallet',coalesce((select to_jsonb(w) from public.market_reward_wallets w where w.user_id=uid),'{}'::jsonb),
    'preferences',coalesce((select to_jsonb(p) from public.market_profile_preferences p where p.user_id=uid),'{}'::jsonb),
    'trade_count',trade_count,'reveal_count',reveal_count,
    'challenges',coalesce((select jsonb_agg(to_jsonb(d)||jsonb_build_object('progress',coalesce(c.progress,0),'completed_at',c.completed_at,'showcased',coalesce(c.showcased,false),'showcased_order',c.showcased_order) order by d.sort_order)
      from public.market_challenge_definitions d left join public.market_user_challenges c on c.challenge_key=d.challenge_key and c.user_id=uid where d.active),'[]'::jsonb),
    'store',coalesce((select jsonb_agg(to_jsonb(i)||jsonb_build_object('owned',u.item_key is not null,'purchased_at',u.purchased_at) order by i.sort_order)
      from public.market_store_items i left join public.market_user_items u on u.item_key=i.item_key and u.user_id=uid where i.active),'[]'::jsonb)
  );
end $$;

create or replace function public.market_purchase_reward(p_item_key text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); item public.market_store_items; wallet public.market_reward_wallets;
  trades integer:=0; reveals integer:=0;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('reward:'||uid::text,0));
  perform public.market_refresh_my_progression();
  select * into item from public.market_store_items where item_key=p_item_key and active;
  if not found then raise exception 'ITEM_NOT_FOUND'; end if;
  if exists(select 1 from public.market_user_items where user_id=uid and item_key=p_item_key) then
    return jsonb_build_object('ok',true,'already_owned',true,'item_key',p_item_key);
  end if;
  select count(*) into trades from public.market_transactions t join public.market_portfolios p on p.id=t.portfolio_id where p.user_id=uid;
  select count(*) into reveals from public.market_gameweek_reveals r join public.market_portfolios p on p.id=r.portfolio_id where p.user_id=uid;
  if trades<item.required_trades or reveals<item.required_reveals then raise exception 'ITEM_LOCKED'; end if;
  select * into wallet from public.market_reward_wallets where user_id=uid for update;
  if wallet.balance<item.price_credits then raise exception 'NOT_ENOUGH_REWARD_CREDITS'; end if;
  update public.market_reward_wallets set balance=balance-item.price_credits,
    lifetime_spent=lifetime_spent+item.price_credits,updated_at=now() where user_id=uid;
  insert into public.market_user_items(user_id,item_key) values(uid,p_item_key);
  return jsonb_build_object('ok',true,'item_key',p_item_key,'balance',wallet.balance-item.price_credits);
end $$;

create or replace function public.market_update_profile_preferences(p_show_badges boolean,p_show_market_stats boolean,p_show_activity boolean)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); result public.market_profile_preferences;
begin
 if uid is null then raise exception 'AUTH_REQUIRED'; end if;
 insert into public.market_profile_preferences(user_id,show_badges,show_market_stats,show_activity)
 values(uid,p_show_badges,p_show_market_stats,p_show_activity)
 on conflict(user_id) do update set show_badges=excluded.show_badges,show_market_stats=excluded.show_market_stats,
 show_activity=excluded.show_activity,updated_at=now() returning * into result;
 return to_jsonb(result);
end $$;

create or replace function public.market_set_showcase_badges(p_challenge_keys text[])
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); key text; n integer:=0;
begin
 if uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if coalesce(array_length(p_challenge_keys,1),0)>3 then raise exception 'SHOWCASE_LIMIT'; end if;
 if coalesce(array_length(p_challenge_keys,1),0)<>coalesce((select count(distinct x) from unnest(p_challenge_keys) x),0) then raise exception 'DUPLICATE_BADGE'; end if;
 update public.market_user_challenges set showcased=false,showcased_order=null,updated_at=now() where user_id=uid;
 foreach key in array coalesce(p_challenge_keys,array[]::text[]) loop
   n:=n+1;
   update public.market_user_challenges set showcased=true,showcased_order=n,updated_at=now()
    where user_id=uid and challenge_key=key and completed_at is not null;
   if not found then raise exception 'BADGE_NOT_EARNED'; end if;
 end loop;
 return jsonb_build_object('ok',true,'count',n);
end $$;

create or replace function public.market_equip_reward(p_item_key text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); item public.market_store_items; prefs public.market_profile_preferences;
begin
 if uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select i.* into item from public.market_store_items i join public.market_user_items u on u.item_key=i.item_key
  where u.user_id=uid and i.item_key=p_item_key;
 if not found then raise exception 'ITEM_NOT_OWNED'; end if;
 insert into public.market_profile_preferences(user_id) values(uid) on conflict do nothing;
 update public.market_profile_preferences set
  active_background=case when item.item_type='background' then item.item_key else active_background end,
  active_avatar=case when item.item_type='avatar' then item.item_key else active_avatar end,
  active_frame=case when item.item_type='frame' then item.item_key else active_frame end,
  updated_at=now() where user_id=uid returning * into prefs;
 return to_jsonb(prefs);
end $$;

create or replace function public.market_set_formation(p_formation text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); pid uuid; defs integer:=0; mids integer:=0;
begin
 if uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_formation not in ('4-3-3','3-4-3') then raise exception 'FORMATION_UNKNOWN'; end if;
 if p_formation='3-4-3' and not exists(select 1 from public.market_user_items where user_id=uid and item_key='formation_343') then raise exception 'FORMATION_NOT_UNLOCKED'; end if;
 select p.id into pid from public.market_portfolios p where p.user_id=uid order by p.created_at desc limit 1;
 if pid is not null then
  select count(*) filter(where mp.position_group='DEF'),count(*) filter(where mp.position_group='MID') into defs,mids
   from public.market_holdings h join public.market_players mp on mp.id=h.player_id where h.portfolio_id=pid;
 end if;
 if p_formation='3-4-3' and defs>3 then raise exception 'SELL_ONE_DEFENDER_FIRST'; end if;
 if p_formation='4-3-3' and mids>3 then raise exception 'SELL_ONE_MIDFIELDER_FIRST'; end if;
 insert into public.market_profile_preferences(user_id,active_formation) values(uid,p_formation)
 on conflict(user_id) do update set active_formation=excluded.active_formation,updated_at=now();
 return jsonb_build_object('ok',true,'active_formation',p_formation);
end $$;

create or replace function public.market_position_limit(p_user_id uuid,p_position text)
returns integer language sql stable security definer set search_path=pg_catalog,public as $$
 select case coalesce((select active_formation from public.market_profile_preferences where user_id=p_user_id),'4-3-3')
  when '3-4-3' then case p_position when 'GK' then 1 when 'DEF' then 3 when 'MID' then 4 when 'FWD' then 3 else 0 end
  else case p_position when 'GK' then 1 when 'DEF' then 4 when 'MID' then 3 when 'FWD' then 3 else 0 end end
$$;

-- Keep formation ownership and trade enforcement in the same transaction.
create or replace function public.market_buy_player(p_player_slug text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); s public.market_settings; p public.market_portfolios; player public.market_players;
  tx public.market_transactions; position_count integer;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(btrim(coalesce(p_idempotency_key,'')))=0 then raise exception 'IDEMPOTENCY_KEY_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  select * into s from public.market_settings where id=1 for share;
  select mp.* into player from public.market_players mp
    join public.market_active_catalogues ac on ac.catalogue_id=mp.catalogue_id and ac.season_id=mp.season_id
    where (mp.slug=p_player_slug or mp.app_player_id::text=p_player_slug) and mp.is_available
    order by (mp.app_player_id::text=p_player_slug) desc,mp.updated_at desc limit 1 for update of mp;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
  select t.* into tx from public.market_transactions t join public.market_portfolios x on x.id=t.portfolio_id
    where t.idempotency_key=p_idempotency_key and x.user_id=uid;
  if found then return jsonb_build_object('ok',true,'message','Buy already executed','transaction_id',tx.id,'player_slug',player.slug,'execution_value',tx.executed_price_minor); end if;
  select * into p from public.market_portfolios where user_id=uid and season_id=s.active_season_id for update;
  if not found then p:=public.market_create_or_get_portfolio(); end if;
  if exists(select 1 from public.market_holdings where portfolio_id=p.id and player_id=player.id) then raise exception 'ALREADY_OWNED'; end if;
  if (select count(*) from public.market_holdings where portfolio_id=p.id)>=s.maximum_holdings then raise exception 'MAX_HOLDINGS'; end if;
  select count(*) into position_count from public.market_holdings h join public.market_players mp on mp.id=h.player_id
    where h.portfolio_id=p.id and mp.position_group=player.position_group;
  if position_count>=public.market_position_limit(uid,player.position_group) then raise exception 'FORMATION_LIMIT'; end if;
  if p.cash_balance_minor<player.current_price_minor then raise exception 'INSUFFICIENT_BALANCE'; end if;
  perform public.market_record_gameweek_trade(p.id,'buy');
  insert into public.market_holdings(portfolio_id,player_id,quantity,purchase_price_minor,current_value_minor,unrealised_profit_minor)
    values(p.id,player.id,1,player.current_price_minor,player.current_price_minor,0);
  update public.market_portfolios set cash_balance_minor=cash_balance_minor-player.current_price_minor where id=p.id;
  insert into public.market_transactions(portfolio_id,player_id,transaction_type,executed_price_minor,balance_before_minor,balance_after_minor,
    holding_value_before_minor,holding_value_after_minor,idempotency_key)
  values(p.id,player.id,'buy',player.current_price_minor,p.cash_balance_minor,p.cash_balance_minor-player.current_price_minor,0,player.current_price_minor,p_idempotency_key)
  returning * into tx;
  perform public.market_recalculate_portfolio_totals(p.id);
  perform public.market_refresh_my_progression();
  return jsonb_build_object('ok',true,'message','Buy executed','transaction_id',tx.id,'player_slug',player.slug,'execution_value',tx.executed_price_minor);
end $$;

create or replace function public.market_sell_player(p_player_slug text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); s public.market_settings; p public.market_portfolios; player public.market_players;
  holding public.market_holdings; tx public.market_transactions;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(btrim(coalesce(p_idempotency_key,'')))=0 then raise exception 'IDEMPOTENCY_KEY_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  select * into s from public.market_settings where id=1 for share;
  select * into p from public.market_portfolios where user_id=uid and season_id=s.active_season_id for update;
  if not found then raise exception 'PORTFOLIO_NOT_FOUND'; end if;
  select mp.* into player from public.market_players mp join public.market_active_catalogues ac on ac.catalogue_id=mp.catalogue_id and ac.season_id=mp.season_id
    where (mp.slug=p_player_slug or mp.app_player_id::text=p_player_slug) order by (mp.app_player_id::text=p_player_slug) desc,mp.updated_at desc limit 1 for update of mp;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
  select * into tx from public.market_transactions t where t.idempotency_key=p_idempotency_key and t.portfolio_id=p.id;
  if found then return jsonb_build_object('ok',true,'message','Sale already executed','transaction_id',tx.id,'player_slug',player.slug,'execution_value',tx.executed_price_minor); end if;
  select * into holding from public.market_holdings where portfolio_id=p.id and player_id=player.id for update;
  if not found then raise exception 'NOT_OWNED'; end if;
  perform public.market_record_gameweek_trade(p.id,'sell');
  delete from public.market_holdings where id=holding.id;
  update public.market_portfolios set cash_balance_minor=cash_balance_minor+player.current_price_minor,
    realised_profit_minor=realised_profit_minor+(player.current_price_minor-holding.purchase_price_minor) where id=p.id;
  insert into public.market_transactions(portfolio_id,player_id,transaction_type,executed_price_minor,balance_before_minor,balance_after_minor,
    holding_value_before_minor,holding_value_after_minor,idempotency_key)
  values(p.id,player.id,'sell',player.current_price_minor,p.cash_balance_minor,p.cash_balance_minor+player.current_price_minor,holding.purchase_price_minor,0,p_idempotency_key)
  returning * into tx;
  perform public.market_recalculate_portfolio_totals(p.id);
  perform public.market_refresh_my_progression();
  return jsonb_build_object('ok',true,'message','Sale executed','transaction_id',tx.id,'player_slug',player.slug,'execution_value',tx.executed_price_minor);
end $$;

-- Public profile data is exposed only through this privacy-aware projection.
create or replace function public.market_public_profile(p_username text)
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
 with target as (select id,username,rating,xp,quizzes_completed,perfect_quizzes,current_streak,longest_streak,created_at from public.profiles where lower(username)=lower(p_username) and username is not null limit 1),
 prefs as (select coalesce(pp.show_badges,true) show_badges,coalesce(pp.show_market_stats,true) show_market_stats,
   coalesce(pp.show_activity,false) show_activity,pp.active_background,pp.active_avatar,pp.active_frame,coalesce(pp.active_formation,'4-3-3') active_formation
   from target t left join public.market_profile_preferences pp on pp.user_id=t.id),
 portfolio as (select p.* from target t left join public.market_portfolios p on p.user_id=t.id order by p.created_at desc limit 1)
 select coalesce((select to_jsonb(t)||jsonb_build_object('preferences',(select to_jsonb(prefs) from prefs),
   'market_stats',case when (select show_market_stats from prefs) then (select jsonb_build_object('total_account_value',p.total_portfolio_value_minor,'realised_profit',p.realised_profit_minor,
     'trades',(select count(*) from public.market_transactions x where x.portfolio_id=p.id)) from portfolio p) else null end,
   'badges',case when (select show_badges from prefs) then coalesce((select jsonb_agg(jsonb_build_object('key',d.challenge_key,'name',d.badge_name,'title',d.title,'icon_key',d.icon_key) order by c.showcased_order)
     from public.market_user_challenges c join public.market_challenge_definitions d on d.challenge_key=c.challenge_key where c.user_id=t.id and c.showcased),'[]'::jsonb) else null end,
   'roster',coalesce((select jsonb_agg(jsonb_build_object('player_id',mp.app_player_id,'slug',mp.slug,'name',mp.display_name,'club',club.name,'position',mp.position_group,'value',mp.current_price_minor) order by case mp.position_group when 'GK' then 1 when 'DEF' then 2 when 'MID' then 3 else 4 end,mp.display_name)
     from portfolio p join public.market_holdings h on h.portfolio_id=p.id join public.market_players mp on mp.id=h.player_id join public.market_clubs club on club.id=mp.club_id),'[]'::jsonb)) from target t),null::jsonb)
$$;

revoke all on function public.market_refresh_my_progression(),public.market_my_progression(),public.market_purchase_reward(text),
 public.market_update_profile_preferences(boolean,boolean,boolean),public.market_set_showcase_badges(text[]),
 public.market_equip_reward(text),public.market_set_formation(text),public.market_position_limit(uuid,text),public.market_public_profile(text)
 from public,anon,authenticated;
grant execute on function public.market_refresh_my_progression(),public.market_my_progression(),public.market_purchase_reward(text),
 public.market_update_profile_preferences(boolean,boolean,boolean),public.market_set_showcase_badges(text[]),
 public.market_equip_reward(text),public.market_set_formation(text) to authenticated;
revoke all on function public.market_buy_player(text,text),public.market_sell_player(text,text) from public,anon;
grant execute on function public.market_buy_player(text,text),public.market_sell_player(text,text) to authenticated;
grant execute on function public.market_public_profile(text) to anon,authenticated;

alter function public.market_refresh_my_progression() set statement_timeout='5s';
alter function public.market_purchase_reward(text) set statement_timeout='5s';
alter function public.market_purchase_reward(text) set lock_timeout='2s';

commit;
