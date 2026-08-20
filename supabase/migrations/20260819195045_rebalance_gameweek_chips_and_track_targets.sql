begin;

-- Store the exact multiplier at confirmation time. This keeps every chip
-- immutable and lets Position Pulse balance itself across 2-, 3- and
-- 4-player position groups instead of favouring one formation.
alter table public.market_gameweek_chip_plays
  add column if not exists multiplier_basis_points integer;

update public.market_gameweek_chip_plays
set multiplier_basis_points = case chip_key
  when 'triple_shout' then 30000
  when 'power_pair' then 20000
  when 'position_pulse' then least(
    30000,
    10000 + round(20000.0 / greatest(cardinality(target_holding_ids), 1))::integer
  )
  when 'full_xi_surge' then 12000
  when 'lockdown' then 0
  else 10000
end
where multiplier_basis_points is null;

alter table public.market_gameweek_chip_plays
  alter column multiplier_basis_points set not null;

alter table public.market_gameweek_chip_plays
  drop constraint if exists market_gameweek_chip_plays_multiplier_check;
alter table public.market_gameweek_chip_plays
  add constraint market_gameweek_chip_plays_multiplier_check
  check (multiplier_basis_points between 0 and 30000);

create or replace function public.market_set_gameweek_chip_multiplier()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  new.multiplier_basis_points := case new.chip_key
    when 'triple_shout' then 30000
    when 'power_pair' then 20000
    when 'position_pulse' then least(
      30000,
      10000 + round(20000.0 / greatest(cardinality(new.target_holding_ids), 1))::integer
    )
    when 'full_xi_surge' then 12000
    when 'lockdown' then 0
    else 10000
  end;
  return new;
end;
$$;

drop trigger if exists market_set_gameweek_chip_multiplier_trigger
  on public.market_gameweek_chip_plays;
create trigger market_set_gameweek_chip_multiplier_trigger
before insert on public.market_gameweek_chip_plays
for each row execute function public.market_set_gameweek_chip_multiplier();

revoke all on function public.market_set_gameweek_chip_multiplier()
  from public, anon, authenticated;

-- Return live target state as well as the immutable confirmation snapshot.
-- The UI can now explain exactly which sold targets can still receive a result.
create or replace function public.market_my_gameweek_chip()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  g public.market_gameweeks;
  p public.market_portfolios;
  play public.market_gameweek_chip_plays;
  deadline timestamptz;
  live_targets jsonb := '[]'::jsonb;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into g from public.market_ensure_current_gameweek();
  deadline := public.market_gameweek_chip_deadline(g.id);
  select portfolio.* into p
  from public.market_portfolios portfolio
  join public.market_settings settings on settings.active_season_id = portfolio.season_id and settings.id = 1
  where portfolio.user_id = uid
  limit 1;

  if p.id is not null then
    select * into play from public.market_gameweek_chip_plays
    where portfolio_id = p.id and transfer_gameweek_id = g.id;
  end if;

  if play.id is not null then
    select coalesce(jsonb_agg(
      target.value || jsonb_build_object(
        'still_held', exists (
          select 1 from public.market_holdings holding
          where holding.id = (target.value->>'holding_id')::uuid
            and holding.portfolio_id = play.portfolio_id
        ),
        'events_applied', (
          select count(*)::integer
          from public.market_holding_value_adjustments adjustment
          where adjustment.chip_play_id = play.id
            and adjustment.holding_id = (target.value->>'holding_id')::uuid
        )
      ) order by target.ordinality
    ), '[]'::jsonb)
    into live_targets
    from jsonb_array_elements(play.target_snapshot) with ordinality target(value, ordinality);
  end if;

  return jsonb_build_object(
    'gameweek_id', g.id,
    'gameweek_key', g.gameweek_key,
    'label', g.label,
    'deadline_at', deadline,
    'can_play', play.id is null and g.state in ('open', 'revealed') and now() < deadline,
    'chip_used', play.id is not null,
    'active_chip', case when play.id is null then null else jsonb_build_object(
      'id', play.id,
      'chip_key', play.chip_key,
      'target_position', play.target_position,
      'targets', live_targets,
      'multiplier_basis_points', play.multiplier_basis_points,
      'state', play.state,
      'activated_at', play.activated_at,
      'first_applied_at', play.first_applied_at,
      'total_adjustment_minor', play.total_adjustment_minor
    ) end
  );
end;
$$;

revoke all on function public.market_my_gameweek_chip()
  from public, anon, authenticated;
grant execute on function public.market_my_gameweek_chip() to authenticated;
alter function public.market_my_gameweek_chip() set statement_timeout = '4s';

-- Apply the multiplier stored on the play instead of recalculating rules later.
create or replace function public.market_record_gameweek_chip_adjustment()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target record;
  adjustment integer;
begin
  for target in
    select play.id as chip_play_id, play.multiplier_basis_points, holding.id as holding_id
    from public.market_gameweek_chip_plays play
    join public.market_gameweeks transfer_week on transfer_week.id = play.transfer_gameweek_id
    join public.market_holdings holding
      on holding.portfolio_id = play.portfolio_id
     and holding.player_id = new.player_id
     and holding.id = any(play.target_holding_ids)
    where play.state in ('armed', 'applied')
      and date_trunc('week', transfer_week.opens_at at time zone 'Europe/Brussels')
        = date_trunc('week', new.effective_at at time zone 'Europe/Brussels')
  loop
    adjustment := round(
      new.price_change_minor::numeric * (target.multiplier_basis_points - 10000) / 10000
    )::integer;

    insert into public.market_holding_value_adjustments(
      chip_play_id, holding_id, valuation_event_id, base_movement_minor,
      multiplier_basis_points, adjustment_minor
    ) values (
      target.chip_play_id, target.holding_id, new.id, new.price_change_minor,
      target.multiplier_basis_points, adjustment
    ) on conflict (chip_play_id, holding_id, valuation_event_id) do nothing;

    if found then
      update public.market_gameweek_chip_plays
      set state = 'applied',
        first_applied_at = coalesce(first_applied_at, now()),
        last_applied_at = now(),
        total_adjustment_minor = total_adjustment_minor + adjustment
      where id = target.chip_play_id;
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function public.market_record_gameweek_chip_adjustment()
  from public, anon, authenticated;

-- A single-target chip cannot remain misleadingly "armed" after that copy is
-- sold. Multi-target chips stay active while at least one confirmed copy remains.
create or replace function public.market_void_chip_without_held_targets()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.market_gameweek_chip_plays play
  set state = 'void'
  where play.portfolio_id = old.portfolio_id
    and play.state = 'armed'
    and old.id = any(play.target_holding_ids)
    and not exists (
      select 1 from public.market_holdings holding
      where holding.portfolio_id = play.portfolio_id
        and holding.id = any(play.target_holding_ids)
    );
  return old;
end;
$$;

drop trigger if exists market_void_chip_without_held_targets_trigger
  on public.market_holdings;
create trigger market_void_chip_without_held_targets_trigger
after delete on public.market_holdings
for each row execute function public.market_void_chip_without_held_targets();

revoke all on function public.market_void_chip_without_held_targets()
  from public, anon, authenticated;

comment on column public.market_gameweek_chip_plays.multiplier_basis_points is
  'Immutable chip multiplier selected at confirmation; 10000 equals normal movement.';
comment on function public.market_void_chip_without_held_targets() is
  'Ends an armed chip after its final confirmed held copy is sold.';

commit;
