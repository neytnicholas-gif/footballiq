create table if not exists public.market_preview_value_experiments (
  player_id uuid primary key references public.market_players(id) on delete cascade,
  app_player_id bigint not null unique,
  previous_value_minor bigint not null check (previous_value_minor between 4000000 and 15000000),
  current_value_minor bigint not null check (current_value_minor between 4000000 and 15000000),
  rating numeric(4,2) not null check (rating between 0 and 10),
  minutes_played integer not null check (minutes_played between 1 and 130),
  experiment_label text not null,
  active boolean not null default true,
  applied_at timestamptz not null default now(),
  check (abs(current_value_minor - previous_value_minor) <= 300000),
  check (mod(previous_value_minor, 100000) = 0),
  check (mod(current_value_minor, 100000) = 0)
);

alter table public.market_preview_value_experiments enable row level security;
revoke all on table public.market_preview_value_experiments from anon, authenticated;
grant select, insert, update, delete on table public.market_preview_value_experiments to service_role;

comment on table public.market_preview_value_experiments is
  'Preview-only controlled valuation evidence. Service-role access only; never a provider fixture claim.';
