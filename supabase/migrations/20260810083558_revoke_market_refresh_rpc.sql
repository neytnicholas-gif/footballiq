-- Portfolio reads now calculate live totals without mutating rows. Prevent
-- authenticated clients from invoking the obsolete write-heavy refresh path.
revoke all on function public.market_refresh_my_portfolio()
  from public, anon, authenticated;
