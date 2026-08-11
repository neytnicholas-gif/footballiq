begin;

update public.market_challenge_definitions
set description = case challenge_key
  when 'three_leagues' then 'Own players from all three Verdict XI leagues.'
  when 'gain_one_million' then 'Grow total account value by 1.0m VX.'
  when 'profit_ten_million' then 'Bank 10.0m VX of realised game profit.'
  else description
end
where challenge_key in ('three_leagues', 'gain_one_million', 'profit_ten_million');

commit;
