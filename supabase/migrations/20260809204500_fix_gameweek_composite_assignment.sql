begin;

create or replace function public.market_current_gameweek()
returns public.market_gameweeks language sql stable security invoker set search_path=pg_catalog,public
as $$
  select g.* from public.market_gameweeks g
  where now() >= g.opens_at and now() < g.closes_at and g.state in ('open','revealed')
  order by g.opens_at desc limit 1
$$;

create or replace function public.market_my_gameweek_status()
returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$
declare uid uuid:=auth.uid(); g public.market_gameweeks; p public.market_portfolios; a public.market_gameweek_allowances;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into g from public.market_ensure_current_gameweek();
  select * into p from public.market_portfolios where user_id=uid order by created_at desc limit 1;
  if p.id is not null then
    insert into public.market_gameweek_allowances(portfolio_id,gameweek_id) values(p.id,g.id) on conflict do nothing;
    select * into a from public.market_gameweek_allowances where portfolio_id=p.id and gameweek_id=g.id;
  end if;
  return jsonb_build_object('gameweek_id',g.id,'gameweek_key',g.gameweek_key,'week_number',g.week_number,'label',g.label,
    'state',g.state,'opens_at',g.opens_at,'closes_at',g.closes_at,'signings_used',coalesce(a.signings_used,0),
    'signings_remaining',11-coalesce(a.signings_used,0),'sales_count',coalesce(a.sales_count,0),'maximum_signings',11);
end $$;

create or replace function public.market_record_gameweek_trade(p_portfolio_id uuid,p_transaction_type text)
returns void language plpgsql security definer set search_path=pg_catalog,public
as $$
declare g public.market_gameweeks; a public.market_gameweek_allowances;
begin
  select * into g from public.market_ensure_current_gameweek();
  if g.state not in ('open','revealed') then raise exception 'GAMEWEEK_LOCKED'; end if;
  insert into public.market_gameweek_allowances(portfolio_id,gameweek_id) values(p_portfolio_id,g.id) on conflict do nothing;
  select * into a from public.market_gameweek_allowances where portfolio_id=p_portfolio_id and gameweek_id=g.id for update;
  if p_transaction_type='buy' then
    if a.signings_used>=11 then raise exception 'GAMEWEEK_TRANSFER_LIMIT'; end if;
    update public.market_gameweek_allowances set signings_used=signings_used+1,updated_at=now() where portfolio_id=p_portfolio_id and gameweek_id=g.id;
  elsif p_transaction_type='sell' then
    update public.market_gameweek_allowances set sales_count=sales_count+1,updated_at=now() where portfolio_id=p_portfolio_id and gameweek_id=g.id;
  else raise exception 'INVALID_TRANSACTION_TYPE'; end if;
end $$;

commit;
