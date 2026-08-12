begin;

-- Clubhouse rewards remain separate from VX. They cannot be bought, sold,
-- transferred or withdrawn. Arena prizes are created by the game, never
-- taken from an opponent.
alter table public.market_store_items drop constraint if exists market_store_items_item_type_check;
alter table public.market_store_items add constraint market_store_items_item_type_check
  check (item_type in ('background','avatar','frame','formation','title','utility','access'));
alter table public.market_store_items add column if not exists required_badges integer not null default 0 check (required_badges >= 0);

alter table public.market_profile_preferences
  add column if not exists active_title text references public.market_store_items(item_key) on delete set null;
alter table public.market_profile_preferences
  add column if not exists reward_celebrations boolean not null default true;

alter table public.market_user_challenges drop constraint if exists market_user_challenges_showcased_order_check;
alter table public.market_user_challenges add constraint market_user_challenges_showcased_order_check
  check (showcased_order between 1 and 5);

insert into public.market_challenge_definitions
  (challenge_key,title,description,badge_name,icon_key,target,reward_credits,sort_order)
values
 ('squad_three','Build your first line','Own three players at the same time.','First Line','users',3,35,25),
 ('signing_five','Five signings','Buy five players.','Deal Starter','shopping-bag',5,65,35),
 ('signing_twentyfive','Twenty-five signings','Buy twenty-five players across your Market journey.','Squad Architect','shopping-bag',25,170,75),
 ('sale_five','Five sales','Complete five player sales.','Active Dealer','handshake',5,80,65),
 ('watch_one','First watch','Add one player to your watchlist.','On the Radar','eye',1,20,85),
 ('watch_ten','Deep watchlist','Track ten players at once.','Shortlist Builder','eye',10,90,95),
 ('trade_hundred','Century of deals','Complete one hundred buys or sales.','Market Centurion','repeat',100,450,82),
 ('reveal_ten','Ten Reveals','Open ten completed gameweek Reveals.','Season Reader','calendar',10,300,125),
 ('gain_five_million','Five-million gain','Grow total account value by 5.0m VX.','Value Climber','trophy',5000000,350,135),
 ('profit_one_million','One-million realised','Bank 1.0m VX of realised game profit.','Profit Maker','chart',1000000,250,138),
 ('arena_first','Enter the Arena','Complete your first matched gameweek duel.','Arena Debut','swords',1,80,150),
 ('arena_five','Five Arena matches','Complete five matched gameweek duels.','Duel Regular','swords',5,180,160),
 ('arena_win','First Arena win','Win your first matched gameweek duel.','First Blood','trophy',1,140,170),
 ('arena_wins_ten','Ten Arena wins','Win ten matched gameweek duels.','Arena Ace','crown',10,500,180)
on conflict (challenge_key) do update set title=excluded.title,description=excluded.description,
 badge_name=excluded.badge_name,icon_key=excluded.icon_key,target=excluded.target,
 reward_credits=excluded.reward_credits,sort_order=excluded.sort_order,active=true;

insert into public.market_store_items
  (item_key,item_type,name,description,price_credits,required_trades,required_reveals,sort_order)
values
 ('bg_press_box','background','Press Box','A clean matchday press-room look for your public profile.',60,1,0,5),
 ('bg_derby_night','background','Derby Night','Floodlights, noise and a big-match night atmosphere.',160,10,1,15),
 ('bg_champions_tunnel','background','Champions Tunnel','A premium tunnel entrance for an established Market player.',320,25,3,25),
 ('bg_legend_gallery','background','Legend Gallery','The rarest gold-and-emerald Clubhouse profile scene.',700,100,10,35),
 ('avatar_keeper','avatar','Last Line','A goalkeeper-glove profile icon.',80,5,0,42),
 ('avatar_tactician','avatar','Tactician','A magnetic tactics-board profile icon.',180,20,2,55),
 ('avatar_number_ten','avatar','Number Ten','A classic creative-player profile icon.',300,40,4,65),
 ('avatar_market_ace','avatar','Market Ace','A rare icon for players with a long Market history.',600,100,10,68),
 ('frame_rookie','frame','Academy Graduate','A crisp silver frame for your first collection.',70,5,0,72),
 ('frame_hot_streak','frame','Hot Streak','A bright orange frame for confident Market players.',220,25,2,75),
 ('frame_invincible','frame','Invincible','A black-and-gold profile frame for veterans.',500,75,7,85),
 ('title_early_adopter','title','Founder Beta','Show “Founder Beta” beneath your username.',75,1,0,100),
 ('title_value_hunter','title','Value Hunter','Show “Value Hunter” beneath your username.',170,15,1,110),
 ('title_market_mind','title','Market Mind','Show “Market Mind” beneath your username.',350,50,5,120),
 ('title_club_legend','title','Club Legend','Show “Club Legend” beneath your username.',800,150,12,130),
 ('utility_badge_cabinet','utility','Five-badge cabinet','Expand your public badge cabinet from three spaces to five.',300,25,3,140),
 ('utility_watchlist_50','utility','Bigger shortlist','Expand your watchlist from 20 players to 50.',120,10,1,141),
 ('utility_watchlist_100','utility','Scout network','Expand your watchlist from 50 players to 100.',300,35,3,142),
 ('utility_compare_desk','utility','Comparison desk','Compare three watched players side by side before making a trade.',140,12,1,143),
 ('utility_compare_pro','utility','Five-player comparison','Expand the comparison desk from three players to five.',320,40,4,144),
 ('utility_budget_planner','utility','Squad budget planner','Build a no-risk shortlist plan and see its total cost against your available VX.',180,15,2,145),
 ('utility_scout_notes','utility','Scout notebook','Save private notes beside watched players and keep them with your account.',220,20,2,146),
 ('utility_reveal_lab','utility','Reveal Lab','Unlock form summaries, positive-week rate and best and worst gameweek insights.',260,25,3,147),
 ('utility_history_vault','utility','Season history vault','Expand your Reveal archive from 12 gameweeks to the full 52-week season.',420,50,6,148),
 ('access_arena_pass','access','Arena Pass','Permanent access to skill-matched gameweek 1v1 contests.',250,10,1,150)
on conflict (item_key) do update set item_type=excluded.item_type,name=excluded.name,
 description=excluded.description,price_credits=excluded.price_credits,
 required_trades=excluded.required_trades,required_reveals=excluded.required_reveals,
 sort_order=excluded.sort_order,active=true;

-- Badge thresholds form five simple Clubhouse tiers. Trades and Reveals remain
-- item-specific proof of Market experience; Style Credits are the purchase cost.
update public.market_store_items set required_badges=case
 when item_key in ('bg_press_box','avatar_keeper','frame_rookie','title_early_adopter') then 0
 when item_key in ('utility_watchlist_50','utility_compare_desk','bg_derby_night','title_value_hunter') then 2
 when item_key in ('utility_budget_planner','access_arena_pass','avatar_tactician','frame_hot_streak') then 4
 when item_key in ('utility_scout_notes','utility_badge_cabinet','formation_343','bg_champions_tunnel','title_market_mind') then 5
 when item_key in ('utility_watchlist_100','utility_reveal_lab','avatar_number_ten') then 7
 when item_key in ('utility_compare_pro','frame_invincible') then 9
 when item_key in ('utility_history_vault','avatar_market_ace') then 12
 when item_key in ('bg_legend_gallery','title_club_legend') then 14
 else required_badges end;

create table if not exists public.market_arena_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  skill_rating integer not null default 1000 check (skill_rating between 100 and 3000),
  matches_played integer not null default 0 check (matches_played >= 0),
  wins integer not null default 0 check (wins >= 0),
  draws integer not null default 0 check (draws >= 0),
  losses integer not null default 0 check (losses >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  best_streak integer not null default 0 check (best_streak >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.market_arena_queue (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gameweek_id uuid not null references public.market_gameweeks(id) on delete cascade,
  skill_rating integer not null,
  joined_at timestamptz not null default now()
);

create table if not exists public.market_arena_matches (
  id uuid primary key default gen_random_uuid(),
  gameweek_id uuid not null references public.market_gameweeks(id) on delete restrict,
  player_one_user_id uuid not null references auth.users(id) on delete cascade,
  player_two_user_id uuid not null references auth.users(id) on delete cascade,
  player_one_rating_before integer not null,
  player_two_rating_before integer not null,
  player_one_return_pct numeric(9,4),
  player_two_return_pct numeric(9,4),
  winner_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','completed','cancelled')),
  prize_credits integer not null default 75 check (prize_credits >= 0),
  participation_credits integer not null default 15 check (participation_credits >= 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (player_one_user_id <> player_two_user_id)
);
create index if not exists market_arena_queue_gameweek_rating_idx on public.market_arena_queue(gameweek_id,skill_rating,joined_at);
create index if not exists market_arena_matches_one_created_idx on public.market_arena_matches(player_one_user_id,created_at desc);
create index if not exists market_arena_matches_two_created_idx on public.market_arena_matches(player_two_user_id,created_at desc);

alter table public.market_arena_profiles enable row level security;
alter table public.market_arena_queue enable row level security;
alter table public.market_arena_matches enable row level security;
revoke all on table public.market_arena_profiles,public.market_arena_queue,public.market_arena_matches from public,anon,authenticated;
grant select on table public.market_arena_profiles,public.market_arena_queue,public.market_arena_matches to authenticated;
grant all on table public.market_arena_profiles,public.market_arena_queue,public.market_arena_matches to service_role;
create policy market_arena_profile_owner_read on public.market_arena_profiles for select to authenticated using ((select auth.uid())=user_id);
create policy market_arena_queue_owner_read on public.market_arena_queue for select to authenticated using ((select auth.uid())=user_id);
create policy market_arena_match_participant_read on public.market_arena_matches for select to authenticated
 using ((select auth.uid())=player_one_user_id or (select auth.uid())=player_two_user_id);

create table if not exists public.market_scout_notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  player_id uuid not null references public.market_players(id) on delete cascade,
  note text not null check (char_length(note) between 1 and 500),
  updated_at timestamptz not null default now(),
  primary key (user_id,player_id)
);
alter table public.market_scout_notes enable row level security;
revoke all on table public.market_scout_notes from public,anon,authenticated;
grant select on table public.market_scout_notes to authenticated;
grant all on table public.market_scout_notes to service_role;
create policy market_scout_notes_owner_read on public.market_scout_notes for select to authenticated
 using ((select auth.uid())=user_id);

create or replace function public.market_my_scout_notes()
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
 select coalesce(jsonb_agg(jsonb_build_object('player_id',p.app_player_id,'player_slug',p.slug,'note',n.note,'updated_at',n.updated_at) order by n.updated_at desc),'[]'::jsonb)
 from public.market_scout_notes n join public.market_players p on p.id=n.player_id
 where n.user_id=(select auth.uid())
$$;

create or replace function public.market_save_scout_note(p_player_slug text,p_note text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); player public.market_players;
begin
 if uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if not exists(select 1 from public.market_user_items where user_id=uid and item_key='utility_scout_notes') then raise exception 'SCOUT_NOTEBOOK_REQUIRED'; end if;
 if char_length(trim(coalesce(p_note,'')))>500 then raise exception 'NOTE_TOO_LONG'; end if;
 select p.* into player from public.market_players p
 join public.market_active_catalogues a on a.catalogue_id=p.catalogue_id and a.season_id=p.season_id
 where p.slug=p_player_slug or p.app_player_id::text=p_player_slug or p.provider_player_id=p_player_slug limit 1;
 if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
 if trim(coalesce(p_note,''))='' then
  delete from public.market_scout_notes where user_id=uid and player_id=player.id;
  return jsonb_build_object('saved',false,'player_id',player.app_player_id);
 end if;
 insert into public.market_scout_notes(user_id,player_id,note) values(uid,player.id,trim(p_note))
 on conflict(user_id,player_id) do update set note=excluded.note,updated_at=now();
 return jsonb_build_object('saved',true,'player_id',player.app_player_id);
end $$;

create or replace function public.market_toggle_watchlist(p_player_slug text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); player public.market_players; current_count integer; capacity integer:=20;
begin
 if uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select p.* into player from public.market_players p
 join public.market_active_catalogues a on a.catalogue_id=p.catalogue_id and a.season_id=p.season_id
 where p.slug=p_player_slug or p.app_player_id::text=p_player_slug or p.provider_player_id=p_player_slug limit 1;
 if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
 if exists(select 1 from public.market_watchlist where user_id=uid and player_id=player.id) then
  delete from public.market_watchlist where user_id=uid and player_id=player.id;
  return jsonb_build_object('watchlisted',false,'capacity',capacity);
 end if;
 if exists(select 1 from public.market_user_items where user_id=uid and item_key='utility_watchlist_100') then capacity:=100;
 elsif exists(select 1 from public.market_user_items where user_id=uid and item_key='utility_watchlist_50') then capacity:=50;
 end if;
 select count(*) into current_count from public.market_watchlist where user_id=uid;
 if current_count>=capacity then raise exception 'WATCHLIST_FULL:%',capacity; end if;
 insert into public.market_watchlist(user_id,player_id) values(uid,player.id);
 return jsonb_build_object('watchlisted',true,'capacity',capacity);
end $$;

create or replace function public.market_arena_resolve_my_matches()
returns integer language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); match_row record; one_change bigint; one_previous bigint;
  two_change bigint; two_previous bigint; one_pct numeric; two_pct numeric;
  one_expected numeric; two_expected numeric; one_new integer; two_new integer;
  resolved integer:=0; winner uuid;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  for match_row in
    select m.* from public.market_arena_matches m
    where m.status='pending' and (m.player_one_user_id=uid or m.player_two_user_id=uid)
    order by m.created_at for update
  loop
    select r.weekly_change_minor,r.previous_portfolio_value_minor into one_change,one_previous
      from public.market_gameweek_reveals r join public.market_portfolios p on p.id=r.portfolio_id
      where p.user_id=match_row.player_one_user_id and r.gameweek_id=match_row.gameweek_id limit 1;
    select r.weekly_change_minor,r.previous_portfolio_value_minor into two_change,two_previous
      from public.market_gameweek_reveals r join public.market_portfolios p on p.id=r.portfolio_id
      where p.user_id=match_row.player_two_user_id and r.gameweek_id=match_row.gameweek_id limit 1;
    if one_previous is null or two_previous is null then continue; end if;
    one_pct:=case when one_previous=0 then 0 else round((one_change::numeric/one_previous::numeric)*100,4) end;
    two_pct:=case when two_previous=0 then 0 else round((two_change::numeric/two_previous::numeric)*100,4) end;
    winner:=case when one_pct>two_pct then match_row.player_one_user_id when two_pct>one_pct then match_row.player_two_user_id else null end;
    one_expected:=1/(1+power(10::numeric,(match_row.player_two_rating_before-match_row.player_one_rating_before)::numeric/400));
    two_expected:=1-one_expected;
    one_new:=greatest(100,least(3000,round(match_row.player_one_rating_before+32*((case when winner=match_row.player_one_user_id then 1 when winner is null then .5 else 0 end)-one_expected))));
    two_new:=greatest(100,least(3000,round(match_row.player_two_rating_before+32*((case when winner=match_row.player_two_user_id then 1 when winner is null then .5 else 0 end)-two_expected))));
    insert into public.market_reward_wallets(user_id) values(match_row.player_one_user_id) on conflict do nothing;
    insert into public.market_reward_wallets(user_id) values(match_row.player_two_user_id) on conflict do nothing;
    update public.market_reward_wallets set balance=balance+(case when winner=user_id then match_row.prize_credits when winner is null then 35 else match_row.participation_credits end),
      lifetime_earned=lifetime_earned+(case when winner=user_id then match_row.prize_credits when winner is null then 35 else match_row.participation_credits end),updated_at=now()
      where user_id in(match_row.player_one_user_id,match_row.player_two_user_id);
    insert into public.market_arena_profiles(user_id) values(match_row.player_one_user_id) on conflict do nothing;
    insert into public.market_arena_profiles(user_id) values(match_row.player_two_user_id) on conflict do nothing;
    update public.market_arena_profiles set skill_rating=case when user_id=match_row.player_one_user_id then one_new else two_new end,
      matches_played=matches_played+1,wins=wins+(case when winner=user_id then 1 else 0 end),
      draws=draws+(case when winner is null then 1 else 0 end),losses=losses+(case when winner is not null and winner<>user_id then 1 else 0 end),
      current_streak=case when winner=user_id then current_streak+1 else 0 end,
      best_streak=greatest(best_streak,case when winner=user_id then current_streak+1 else 0 end),updated_at=now()
      where user_id in(match_row.player_one_user_id,match_row.player_two_user_id);
    update public.market_arena_matches set player_one_return_pct=one_pct,player_two_return_pct=two_pct,winner_user_id=winner,
      status='completed',completed_at=now() where id=match_row.id;
    resolved:=resolved+1;
  end loop;
  return resolved;
end $$;

create or replace function public.market_arena_join()
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); gw public.market_gameweeks; own_profile public.market_arena_profiles;
  opponent public.market_arena_queue; holding_count integer:=0; match_id uuid;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.market_user_items where user_id=uid and item_key='access_arena_pass') then raise exception 'ARENA_PASS_REQUIRED'; end if;
  select count(*) into holding_count from public.market_holdings h join public.market_portfolios p on p.id=h.portfolio_id where p.user_id=uid;
  if holding_count<>11 then raise exception 'FULL_XI_REQUIRED'; end if;
  select * into gw from public.market_gameweeks where state='open' order by week_number desc limit 1;
  if not found then raise exception 'NO_OPEN_GAMEWEEK'; end if;
  if exists(select 1 from public.market_arena_matches where status='pending' and (player_one_user_id=uid or player_two_user_id=uid)) then raise exception 'MATCH_ALREADY_ACTIVE'; end if;
  perform pg_advisory_xact_lock(hashtextextended('arena-matchmaking:'||gw.id::text,0));
  insert into public.market_arena_profiles(user_id) values(uid) on conflict do nothing;
  select * into own_profile from public.market_arena_profiles where user_id=uid for update;
  insert into public.market_arena_queue(user_id,gameweek_id,skill_rating) values(uid,gw.id,own_profile.skill_rating)
    on conflict(user_id) do update set gameweek_id=excluded.gameweek_id,skill_rating=excluded.skill_rating,joined_at=now();
  select q.* into opponent from public.market_arena_queue q
    where q.gameweek_id=gw.id and q.user_id<>uid
      and abs(q.skill_rating-own_profile.skill_rating)<=least(500,200+floor(extract(epoch from(now()-q.joined_at))/60)*25)
    order by abs(q.skill_rating-own_profile.skill_rating),q.joined_at limit 1 for update skip locked;
  if found then
    delete from public.market_arena_queue where user_id in(uid,opponent.user_id);
    insert into public.market_arena_matches(gameweek_id,player_one_user_id,player_two_user_id,player_one_rating_before,player_two_rating_before)
      values(gw.id,opponent.user_id,uid,opponent.skill_rating,own_profile.skill_rating) returning id into match_id;
    return jsonb_build_object('ok',true,'matched',true,'match_id',match_id,'gameweek_label',gw.label);
  end if;
  return jsonb_build_object('ok',true,'matched',false,'queued',true,'gameweek_label',gw.label);
end $$;

create or replace function public.market_arena_cancel_queue()
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); removed integer;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  delete from public.market_arena_queue where user_id=uid;
  get diagnostics removed=row_count;
  return jsonb_build_object('ok',true,'removed',removed>0);
end $$;

create or replace function public.market_my_arena()
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); profile_row public.market_arena_profiles; full_xi boolean:=false;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public.market_arena_resolve_my_matches();
  insert into public.market_arena_profiles(user_id) values(uid) on conflict do nothing;
  select * into profile_row from public.market_arena_profiles where user_id=uid;
  select count(*)=11 into full_xi from public.market_holdings h join public.market_portfolios p on p.id=h.portfolio_id where p.user_id=uid;
  return jsonb_build_object(
    'profile',to_jsonb(profile_row),
    'has_pass',exists(select 1 from public.market_user_items where user_id=uid and item_key='access_arena_pass'),
    'has_full_xi',full_xi,
    'queue',coalesce((select to_jsonb(q)||jsonb_build_object('gameweek_label',g.label) from public.market_arena_queue q join public.market_gameweeks g on g.id=q.gameweek_id where q.user_id=uid),'null'::jsonb),
    'matches',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'status',m.status,'gameweek_label',g.label,'created_at',m.created_at,
      'completed_at',m.completed_at,'my_return_pct',case when m.player_one_user_id=uid then m.player_one_return_pct else m.player_two_return_pct end,
      'opponent_return_pct',case when m.player_one_user_id=uid then m.player_two_return_pct else m.player_one_return_pct end,
      'won',case when m.status<>'completed' then null when m.winner_user_id is null then null else m.winner_user_id=uid end,
      'draw',m.status='completed' and m.winner_user_id is null,'opponent_name',coalesce(op.username,'Anonymous player'),
      'rating_before',case when m.player_one_user_id=uid then m.player_one_rating_before else m.player_two_rating_before end)
      order by m.created_at desc) from public.market_arena_matches m join public.market_gameweeks g on g.id=m.gameweek_id
      left join public.profiles op on op.id=case when m.player_one_user_id=uid then m.player_two_user_id else m.player_one_user_id end
      where m.player_one_user_id=uid or m.player_two_user_id=uid),'[]'::jsonb)
  );
end $$;

-- Expand the existing progression calculation with Arena milestones.
create or replace function public.market_refresh_my_progression()
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); pid uuid; start_balance bigint:=100000000; account_value bigint:=0;
  buys integer:=0; sales integer:=0; profitable_sales integer:=0; holding_count integer:=0;
  watch_count integer:=0; league_count integer:=0; reveal_count integer:=0; realised bigint:=0;
  arena_matches integer:=0; arena_wins integer:=0; row_def record; measured bigint; was_completed boolean:=false;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('progression:'||uid::text,0));
  insert into public.market_reward_wallets(user_id) values(uid) on conflict do nothing;
  insert into public.market_profile_preferences(user_id) values(uid) on conflict do nothing;
  select p.id,p.starting_balance_minor,p.total_portfolio_value_minor,p.realised_profit_minor
    into pid,start_balance,account_value,realised from public.market_portfolios p where p.user_id=uid order by p.created_at desc limit 1;
  if pid is not null then
    select count(*) filter(where transaction_type='buy'),count(*) filter(where transaction_type='sell'),
      count(*) filter(where transaction_type='sell' and executed_price_minor>holding_value_before_minor)
      into buys,sales,profitable_sales from public.market_transactions where portfolio_id=pid;
    select count(*),count(distinct s.competition_key) into holding_count,league_count
      from public.market_holdings h join public.market_players mp on mp.id=h.player_id join public.market_seasons s on s.id=mp.season_id where h.portfolio_id=pid;
    select count(*) into reveal_count from public.market_gameweek_reveals where portfolio_id=pid;
  end if;
  select count(*) into watch_count from public.market_watchlist where user_id=uid;
  select count(*),count(*) filter(where winner_user_id=uid) into arena_matches,arena_wins from public.market_arena_matches
    where status='completed' and (player_one_user_id=uid or player_two_user_id=uid);
  for row_def in select * from public.market_challenge_definitions where active order by sort_order loop
    measured:=case row_def.challenge_key
      when 'first_signing' then buys when 'first_sale' then sales when 'squad_three' then holding_count when 'squad_five' then holding_count
      when 'full_xi' then holding_count when 'signing_five' then buys when 'signing_twentyfive' then buys when 'sale_five' then sales
      when 'first_profit' then profitable_sales when 'profit_three' then profitable_sales when 'trade_ten' then buys+sales
      when 'trade_fifty' then buys+sales when 'trade_hundred' then buys+sales when 'watch_one' then watch_count
      when 'watch_five' then watch_count when 'watch_ten' then watch_count when 'three_leagues' then league_count
      when 'reveal_one' then reveal_count when 'reveal_five' then reveal_count when 'reveal_ten' then reveal_count
      when 'gain_one_million' then greatest(0,account_value-start_balance) when 'gain_five_million' then greatest(0,account_value-start_balance)
      when 'profit_one_million' then greatest(0,realised) when 'profit_ten_million' then greatest(0,realised)
      when 'arena_first' then arena_matches when 'arena_five' then arena_matches when 'arena_win' then arena_wins when 'arena_wins_ten' then arena_wins else 0 end;
    select exists(select 1 from public.market_user_challenges c where c.user_id=uid and c.challenge_key=row_def.challenge_key and c.completed_at is not null) into was_completed;
    insert into public.market_user_challenges(user_id,challenge_key,progress,completed_at)
      values(uid,row_def.challenge_key,least(measured,row_def.target),case when measured>=row_def.target then now() end)
    on conflict(user_id,challenge_key) do update set progress=greatest(public.market_user_challenges.progress,excluded.progress),
      completed_at=coalesce(public.market_user_challenges.completed_at,excluded.completed_at),updated_at=now();
    if measured>=row_def.target and not was_completed then
      update public.market_reward_wallets set balance=balance+row_def.reward_credits,lifetime_earned=lifetime_earned+row_def.reward_credits,updated_at=now() where user_id=uid;
    end if;
  end loop;
  return public.market_my_progression();
end $$;

create or replace function public.market_set_showcase_badges(p_challenge_keys text[])
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); key text; n integer:=0; max_badges integer:=3;
begin
 if uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if exists(select 1 from public.market_user_items where user_id=uid and item_key='utility_badge_cabinet') then max_badges:=5; end if;
 if coalesce(array_length(p_challenge_keys,1),0)>max_badges then raise exception 'SHOWCASE_LIMIT'; end if;
 if coalesce(array_length(p_challenge_keys,1),0)<>coalesce((select count(distinct x) from unnest(p_challenge_keys) x),0) then raise exception 'DUPLICATE_BADGE'; end if;
 update public.market_user_challenges set showcased=false,showcased_order=null,updated_at=now() where user_id=uid;
 foreach key in array coalesce(p_challenge_keys,array[]::text[]) loop
   n:=n+1;
   update public.market_user_challenges set showcased=true,showcased_order=n,updated_at=now()
    where user_id=uid and challenge_key=key and completed_at is not null;
   if not found then raise exception 'BADGE_NOT_EARNED'; end if;
 end loop;
 return jsonb_build_object('ok',true,'count',n,'limit',max_badges);
end $$;

create or replace function public.market_equip_reward(p_item_key text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); item public.market_store_items; prefs public.market_profile_preferences;
begin
 if uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select i.* into item from public.market_store_items i join public.market_user_items u on u.item_key=i.item_key where u.user_id=uid and i.item_key=p_item_key;
 if not found then raise exception 'ITEM_NOT_OWNED'; end if;
 if item.item_type not in('background','avatar','frame','title') then raise exception 'ITEM_NOT_EQUIPPABLE'; end if;
 insert into public.market_profile_preferences(user_id) values(uid) on conflict do nothing;
 update public.market_profile_preferences set
  active_background=case when item.item_type='background' then item.item_key else active_background end,
  active_avatar=case when item.item_type='avatar' then item.item_key else active_avatar end,
  active_frame=case when item.item_type='frame' then item.item_key else active_frame end,
  active_title=case when item.item_type='title' then item.item_key else active_title end,updated_at=now()
  where user_id=uid returning * into prefs;
 return to_jsonb(prefs);
end $$;

create or replace function public.market_public_profile(p_username text)
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
 with target as (select id,username,rating,xp,quizzes_completed,perfect_quizzes,current_streak,longest_streak,created_at from public.profiles where lower(username)=lower(p_username) and username is not null limit 1),
 prefs as (select coalesce(pp.show_badges,true) show_badges,coalesce(pp.show_market_stats,true) show_market_stats,
   coalesce(pp.show_activity,false) show_activity,pp.active_background,pp.active_avatar,pp.active_frame,pp.active_title,coalesce(pp.active_formation,'4-3-3') active_formation
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

create or replace function public.market_purchase_reward(p_item_key text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); item public.market_store_items; wallet public.market_reward_wallets;
 trades integer:=0; reveals integer:=0; badges integer:=0;
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
 select count(*) into badges from public.market_user_challenges where user_id=uid and completed_at is not null;
 if badges<item.required_badges or trades<item.required_trades or reveals<item.required_reveals then raise exception 'ITEM_LOCKED'; end if;
 select * into wallet from public.market_reward_wallets where user_id=uid for update;
 if wallet.balance<item.price_credits then raise exception 'NOT_ENOUGH_REWARD_CREDITS'; end if;
 update public.market_reward_wallets set balance=balance-item.price_credits,
  lifetime_spent=lifetime_spent+item.price_credits,updated_at=now() where user_id=uid;
 insert into public.market_user_items(user_id,item_key) values(uid,p_item_key);
 return jsonb_build_object('ok',true,'item_key',p_item_key,'balance',wallet.balance-item.price_credits);
end $$;

create or replace function public.market_set_reward_celebrations(p_enabled boolean)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); result public.market_profile_preferences;
begin
 if uid is null then raise exception 'AUTH_REQUIRED'; end if;
 insert into public.market_profile_preferences(user_id,reward_celebrations) values(uid,coalesce(p_enabled,true))
 on conflict(user_id) do update set reward_celebrations=excluded.reward_celebrations,updated_at=now()
 returning * into result;
 return to_jsonb(result);
end $$;

revoke all on function public.market_arena_resolve_my_matches(),public.market_arena_join(),public.market_arena_cancel_queue(),public.market_my_arena() from public,anon,authenticated;
grant execute on function public.market_arena_join(),public.market_arena_cancel_queue(),public.market_my_arena() to authenticated;
revoke all on function public.market_arena_resolve_my_matches() from public,anon,authenticated;
grant execute on function public.market_arena_resolve_my_matches() to service_role;
revoke all on function public.market_refresh_my_progression(),public.market_set_showcase_badges(text[]),public.market_equip_reward(text) from public,anon,authenticated;
grant execute on function public.market_refresh_my_progression(),public.market_set_showcase_badges(text[]),public.market_equip_reward(text) to authenticated;
revoke all on function public.market_public_profile(text) from public,anon,authenticated;
grant execute on function public.market_public_profile(text) to anon,authenticated;
revoke all on function public.market_purchase_reward(text) from public,anon,authenticated;
grant execute on function public.market_purchase_reward(text) to authenticated;
revoke all on function public.market_set_reward_celebrations(boolean) from public,anon,authenticated;
grant execute on function public.market_set_reward_celebrations(boolean) to authenticated;
revoke all on function public.market_my_scout_notes(),public.market_save_scout_note(text,text),public.market_toggle_watchlist(text) from public,anon,authenticated;
grant execute on function public.market_my_scout_notes(),public.market_save_scout_note(text,text),public.market_toggle_watchlist(text) to authenticated;
alter function public.market_arena_join() set statement_timeout='5s';
alter function public.market_my_arena() set statement_timeout='5s';
alter function public.market_arena_resolve_my_matches() set statement_timeout='5s';
alter function public.market_arena_join() set lock_timeout='2s';
alter function public.market_save_scout_note(text,text) set statement_timeout='4s';
alter function public.market_toggle_watchlist(text) set statement_timeout='4s';

commit;
