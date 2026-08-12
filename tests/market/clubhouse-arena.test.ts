// @vitest-environment node
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/20260811215800_clubhouse_economy_and_arena.sql', 'utf8')
const celebration = readFileSync('components/market/market-reward-celebration.tsx', 'utf8')
const db = new PGlite()

const userOne = '00000000-0000-4000-8000-000000000001'
const userTwo = '00000000-0000-4000-8000-000000000002'
const userThree = '00000000-0000-4000-8000-000000000003'
const seasonId = '10000000-0000-4000-8000-000000000001'
const gameweekId = '20000000-0000-4000-8000-000000000001'

beforeAll(async () => {
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table public.market_reward_wallets(user_id uuid primary key references auth.users(id),balance integer not null default 0,lifetime_earned integer not null default 0,lifetime_spent integer not null default 0,updated_at timestamptz not null default now());
    create table public.market_challenge_definitions(challenge_key text primary key,title text not null,description text not null,badge_name text not null,icon_key text not null,target integer not null,reward_credits integer not null,sort_order integer not null unique,active boolean not null default true);
    create table public.market_user_challenges(user_id uuid not null references auth.users(id),challenge_key text not null references public.market_challenge_definitions(challenge_key),progress integer not null default 0,completed_at timestamptz,showcased boolean not null default false,showcased_order smallint check(showcased_order between 1 and 3),updated_at timestamptz not null default now(),primary key(user_id,challenge_key));
    create table public.market_store_items(item_key text primary key,item_type text not null check(item_type in('background','avatar','frame','formation')),name text not null,description text not null,price_credits integer not null,required_trades integer not null default 0,required_reveals integer not null default 0,sort_order integer not null unique,active boolean not null default true);
    create table public.market_user_items(user_id uuid not null references auth.users(id),item_key text not null references public.market_store_items(item_key),purchased_at timestamptz not null default now(),primary key(user_id,item_key));
    create table public.market_profile_preferences(user_id uuid primary key references auth.users(id),show_badges boolean not null default true,show_market_stats boolean not null default true,show_activity boolean not null default false,active_background text references public.market_store_items(item_key),active_avatar text references public.market_store_items(item_key),active_frame text references public.market_store_items(item_key),active_formation text not null default '4-3-3',updated_at timestamptz not null default now());
    create table public.market_gameweeks(id uuid primary key,gameweek_key text unique,week_number integer,label text,state text,opens_at timestamptz,closes_at timestamptz);
    create table public.market_seasons(id uuid primary key,competition_key text);
    create table public.market_clubs(id uuid primary key default gen_random_uuid(),name text);
    create table public.market_players(id uuid primary key default gen_random_uuid(),season_id uuid references public.market_seasons(id),club_id uuid references public.market_clubs(id),catalogue_id uuid,app_player_id integer,provider_player_id text,slug text,display_name text,position_group text,current_price_minor integer default 0);
    create table public.market_active_catalogues(catalogue_id uuid,season_id uuid references public.market_seasons(id));
    create table public.market_portfolios(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),starting_balance_minor bigint,total_portfolio_value_minor bigint,realised_profit_minor bigint,created_at timestamptz default now());
    create table public.market_holdings(id uuid primary key default gen_random_uuid(),portfolio_id uuid references public.market_portfolios(id),player_id uuid references public.market_players(id));
    create table public.market_transactions(id uuid primary key default gen_random_uuid(),portfolio_id uuid references public.market_portfolios(id),transaction_type text,executed_price_minor bigint,holding_value_before_minor bigint);
    create table public.market_watchlist(user_id uuid references auth.users(id),player_id uuid);
    create table public.market_gameweek_reveals(id uuid primary key default gen_random_uuid(),portfolio_id uuid references public.market_portfolios(id),gameweek_id uuid references public.market_gameweeks(id),previous_portfolio_value_minor integer,new_portfolio_value_minor integer,cash_after_minor integer,invested_after_minor integer,weekly_change_minor integer,holding_movements jsonb default '[]');
    create table public.profiles(id uuid primary key references auth.users(id),username text,rating integer default 1000,xp integer default 0,quizzes_completed integer default 0,perfect_quizzes integer default 0,current_streak integer default 0,longest_streak integer default 0,created_at timestamptz default now());
    create function public.market_my_progression() returns jsonb language sql as $$ select '{}'::jsonb $$;
  `)
  await db.exec(migration)
})

afterAll(async () => db.close())

describe('Clubhouse economy and Arena migration', () => {
  it('installs the expanded reward catalogue and protected Arena tables', async () => {
    const rewards = await db.query<{ count: number }>(`select count(*)::int count from public.market_store_items where item_key in('access_arena_pass','utility_badge_cabinet','title_club_legend','utility_compare_desk','utility_scout_notes','utility_reveal_lab','utility_history_vault')`)
    expect(rewards.rows[0]?.count).toBe(7)
    const challenges = await db.query<{ count: number }>(`select count(*)::int count from public.market_challenge_definitions where challenge_key like 'arena_%'`)
    expect(challenges.rows[0]?.count).toBe(4)
  })

  it('queues the first eligible player and atomically pairs the second', async () => {
    await db.exec(`
      insert into auth.users(id) values('${userOne}'),('${userTwo}');
      insert into public.profiles(id,username) values('${userOne}','First XI'),('${userTwo}','Second XI');
      insert into public.market_seasons(id,competition_key) values('${seasonId}','premier-league');
      insert into public.market_gameweeks(id,gameweek_key,week_number,label,state,opens_at,closes_at) values('${gameweekId}','gw-1',1,'Gameweek 1','open',now()-interval '1 day',now()+interval '5 days');
      insert into public.market_portfolios(id,user_id,starting_balance_minor,total_portfolio_value_minor,realised_profit_minor)
        values('30000000-0000-4000-8000-000000000001','${userOne}',100000000,100000000,0),('30000000-0000-4000-8000-000000000002','${userTwo}',100000000,100000000,0);
      insert into public.market_players(id,season_id,position_group) select gen_random_uuid(),'${seasonId}','MID' from generate_series(1,22);
      insert into public.market_holdings(portfolio_id,player_id) select '30000000-0000-4000-8000-000000000001',id from public.market_players limit 11;
      insert into public.market_holdings(portfolio_id,player_id) select '30000000-0000-4000-8000-000000000002',id from public.market_players offset 11 limit 11;
      insert into public.market_user_items(user_id,item_key) values('${userOne}','access_arena_pass'),('${userTwo}','access_arena_pass');
      select set_config('request.jwt.claim.sub','${userOne}',false);
      select public.market_arena_join();
    `)
    expect((await db.query<{ count: number }>('select count(*)::int count from public.market_arena_queue')).rows[0]?.count).toBe(1)
    await db.exec(`select set_config('request.jwt.claim.sub','${userTwo}',false); select public.market_arena_join();`)
    expect((await db.query<{ count: number }>('select count(*)::int count from public.market_arena_queue')).rows[0]?.count).toBe(0)
    expect((await db.query<{ count: number }>('select count(*)::int count from public.market_arena_matches where status=\'pending\'')).rows[0]?.count).toBe(1)
  })

  it('enforces watchlist capacity upgrades and keeps scout notes account-private', async () => {
    const catalogueId = '40000000-0000-4000-8000-000000000001'
    const targetId = '50000000-0000-4000-8000-000000000001'
    await db.exec(`
      insert into public.market_active_catalogues(catalogue_id,season_id) values('${catalogueId}','${seasonId}');
      insert into public.market_players(id,season_id,catalogue_id,app_player_id,provider_player_id,slug,display_name,position_group)
        values('${targetId}','${seasonId}','${catalogueId}',9999,'provider-9999','toolbox-target','Toolbox Target','MID');
      insert into public.market_watchlist(user_id,player_id) select '${userTwo}',id from public.market_players where id<>'${targetId}' limit 20;
      select set_config('request.jwt.claim.sub','${userTwo}',false);
    `)
    await expect(db.query(`select public.market_toggle_watchlist('toolbox-target')`)).rejects.toThrow(/WATCHLIST_FULL:20/)

    await db.exec(`
      insert into public.market_user_items(user_id,item_key) values('${userOne}','utility_watchlist_50'),('${userOne}','utility_scout_notes');
      insert into public.market_watchlist(user_id,player_id) select '${userOne}',id from public.market_players where id<>'${targetId}' limit 20;
      select set_config('request.jwt.claim.sub','${userOne}',false);
      select public.market_toggle_watchlist('toolbox-target');
      select public.market_save_scout_note('toolbox-target','Strong recent minutes; check next Reveal.');
    `)
    expect((await db.query<{ count: number }>(`select count(*)::int count from public.market_watchlist where user_id='${userOne}'`)).rows[0]?.count).toBe(21)
    const ownNotes = await db.query<{ notes: Array<{ player_id: number; note: string }> }>('select public.market_my_scout_notes() notes')
    expect(ownNotes.rows[0]?.notes[0]).toMatchObject({ player_id: 9999, note: 'Strong recent minutes; check next Reveal.' })
    await db.exec(`select set_config('request.jwt.claim.sub','${userTwo}',false);`)
    expect((await db.query<{ notes: unknown[] }>('select public.market_my_scout_notes() notes')).rows[0]?.notes).toEqual([])
  })

  it('requires reputation badges before Style Credits can buy a tiered upgrade', async () => {
    await db.exec(`
      insert into auth.users(id) values('${userThree}');
      insert into public.profiles(id,username) values('${userThree}','Fresh Account');
      insert into public.market_portfolios(user_id,starting_balance_minor,total_portfolio_value_minor,realised_profit_minor) values('${userThree}',100000000,100000000,0);
      insert into public.market_store_items(item_key,item_type,name,description,price_credits,required_trades,required_reveals,required_badges,sort_order)
        values('test_tier_gate','utility','Tier gate','Test-only tier gate',10,0,0,2,999);
      insert into public.market_reward_wallets(user_id,balance,lifetime_earned) values('${userThree}',100,100);
      select set_config('request.jwt.claim.sub','${userThree}',false);
    `)
    await expect(db.query(`select public.market_purchase_reward('test_tier_gate')`)).rejects.toThrow(/ITEM_LOCKED/)
    await db.exec(`
      insert into public.market_user_challenges(user_id,challenge_key,progress,completed_at)
        values('${userThree}','squad_three',3,now()),('${userThree}','signing_five',5,now())
        on conflict(user_id,challenge_key) do update set completed_at=now();
      select public.market_purchase_reward('test_tier_gate');
    `)
    expect((await db.query<{ count: number }>(`select count(*)::int count from public.market_user_items where user_id='${userThree}' and item_key='test_tier_gate'`)).rows[0]?.count).toBe(1)
    await db.exec(`delete from public.market_user_items where user_id='${userThree}'; delete from public.market_user_challenges where user_id='${userThree}'; delete from public.market_profile_preferences where user_id='${userThree}'; delete from public.market_reward_wallets where user_id='${userThree}'; delete from public.market_portfolios where user_id='${userThree}'; delete from public.profiles where id='${userThree}'; delete from auth.users where id='${userThree}'; delete from public.market_store_items where item_key='test_tier_gate';`)
  })

  it('settles on percentage gameweek movement and mints prizes without debiting either player', async () => {
    await db.exec(`
      insert into public.market_gameweek_reveals(portfolio_id,gameweek_id,previous_portfolio_value_minor,new_portfolio_value_minor,cash_after_minor,invested_after_minor,weekly_change_minor)
        values('30000000-0000-4000-8000-000000000001','${gameweekId}',100000000,102000000,0,102000000,2000000),
              ('30000000-0000-4000-8000-000000000002','${gameweekId}',100000000,101000000,0,101000000,1000000);
      select set_config('request.jwt.claim.sub','${userOne}',false);
      select public.market_my_arena();
    `)
    const match = await db.query<{ status: string; winner_user_id: string }>('select status,winner_user_id::text from public.market_arena_matches')
    expect(match.rows[0]).toMatchObject({ status: 'completed', winner_user_id: userOne })
    const wallets = await db.query<{ user_id: string; balance: number }>('select user_id::text,balance from public.market_reward_wallets order by user_id')
    expect(wallets.rows).toEqual([{ user_id: userOne, balance: 75 }, { user_id: userTwo, balance: 15 }])
    const ratings = await db.query<{ user_id: string; skill_rating: number }>('select user_id::text,skill_rating from public.market_arena_profiles order by user_id')
    expect(ratings.rows[0]!.skill_rating).toBeGreaterThan(1000)
    expect(ratings.rows[1]!.skill_rating).toBeLessThan(1000)
  })

  it('never debits the loser or transfers a participant stake', () => {
    expect(migration).not.toMatch(/entry_fee|stake_minor|wager/i)
    expect(migration).toContain("participation_credits integer not null default 15")
    expect(migration).toContain("weekly_change_minor")
  })

  it('keeps reward celebrations skippable, optional and quiet by default', () => {
    expect(celebration).toContain('Skip reward celebration')
    expect(celebration).toContain('Always skip reward celebrations')
    expect(celebration).toContain('motion-reduce:')
    expect(celebration).not.toMatch(/new Audio|<audio|\.play\(/)
  })
})
