begin;

do $$
declare ddl text;
begin
  select pg_get_functiondef('public.market_apply_verified_gameweek(text,text,integer,timestamptz,timestamptz,jsonb)'::regprocedure) into ddl;
  ddl:=replace(ddl,'current_value_minor=mp.current_price_minor','current_value_minor=held_player.current_price_minor');
  ddl:=replace(ddl,'unrealised_profit_minor=mp.current_price_minor-h.purchase_price_minor','unrealised_profit_minor=held_player.current_price_minor-h.purchase_price_minor');
  ddl:=replace(ddl,'from public.market_players mp where mp.id=h.player_id','from public.market_players held_player where held_player.id=h.player_id');
  ddl:=replace(ddl,'''player_id'',mp.app_player_id','''player_id'',held_player.app_player_id');
  ddl:=replace(ddl,'''player_name'',mp.display_name','''player_name'',held_player.display_name');
  ddl:=replace(ddl,'''position'',mp.position_group','''position'',held_player.position_group');
  ddl:=replace(ddl,'''current_value'',mp.current_price_minor','''current_value'',held_player.current_price_minor');
  ddl:=replace(ddl,'''delta'',mp.current_price_minor-coalesce(ve.previous_price_minor,mp.current_price_minor)','''delta'',held_player.current_price_minor-coalesce(ve.previous_price_minor,held_player.current_price_minor)');
  ddl:=replace(ddl,'((mp.current_price_minor-h.purchase_price_minor)','((held_player.current_price_minor-h.purchase_price_minor)');
  ddl:=replace(ddl,'order by mp.display_name','order by held_player.display_name');
  ddl:=replace(ddl,'join public.market_players mp on mp.id=h.player_id','join public.market_players held_player on held_player.id=h.player_id');
  ddl:=replace(ddl,'v.player_id=mp.id','v.player_id=held_player.id');
  execute ddl;
end $$;

commit;
