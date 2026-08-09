alter table public.profiles
  add column if not exists plan text not null default 'free',
  add column if not exists subscription_status text,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists subscription_started_at timestamptz,
  add column if not exists subscription_expires_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_plan_check,
  add constraint profiles_plan_check check (plan in ('free', 'pro'));

comment on column public.profiles.plan is
  'Application membership tier. Authorization must not rely on user-editable JWT metadata.';
