alter table public.market_settings
  add column if not exists market_status text not null default 'open';

alter table public.market_settings
  drop constraint if exists market_settings_market_status_check;

alter table public.market_settings
  add constraint market_settings_market_status_check
  check (market_status in ('open','updating','paused'));

comment on column public.market_settings.market_status is
  'Operational trading switch enforced by market_holdings_require_open_market.';
