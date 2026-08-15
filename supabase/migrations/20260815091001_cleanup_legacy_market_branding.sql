begin;

-- Keep reward copy aligned with the public Early Shout identity.
update public.market_challenge_definitions
set description = 'Own players from all three Early Shout leagues.'
where challenge_key = 'three_leagues'
  and description is distinct from 'Own players from all three Early Shout leagues.';

-- The four-argument replacement adds the independent roster privacy choice.
-- Removing this obsolete overload prevents clients from continuing to use an
-- incomplete privacy contract and reduces the public RPC surface.
drop function if exists public.market_update_profile_preferences(boolean, boolean, boolean);

commit;
