begin;

-- Cover reward/profile foreign keys reported by the live database advisor.
-- These keep catalogue deletes and equipped-item joins bounded as the beta grows.
create index if not exists market_profile_preferences_active_avatar_idx
  on public.market_profile_preferences(active_avatar)
  where active_avatar is not null;
create index if not exists market_profile_preferences_active_background_idx
  on public.market_profile_preferences(active_background)
  where active_background is not null;
create index if not exists market_profile_preferences_active_frame_idx
  on public.market_profile_preferences(active_frame)
  where active_frame is not null;
create index if not exists market_user_challenges_challenge_key_idx
  on public.market_user_challenges(challenge_key);
create index if not exists market_user_items_item_key_idx
  on public.market_user_items(item_key);

commit;
