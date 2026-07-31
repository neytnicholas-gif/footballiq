do $t$ begin
 if (select count(*) from public.market_transactions where idempotency_key='nonprod-concurrent-same-key')<>1 then raise exception 'SAME_KEY_TRANSACTION_COUNT_FAILED'; end if;
 if (select count(*) from public.market_holdings h join public.market_portfolios p on p.id=h.portfolio_id where p.user_id='00000000-0000-4000-8000-000000000901')<>1 then raise exception 'SAME_KEY_HOLDING_COUNT_FAILED'; end if;
 if (select cash_balance_minor from public.market_portfolios where user_id='00000000-0000-4000-8000-000000000901')<>1100 then raise exception 'SAME_KEY_DOUBLE_CHARGE'; end if;
 if (select count(*) from public.market_transactions t join public.market_portfolios p on p.id=t.portfolio_id where p.user_id='00000000-0000-4000-8000-000000000902')<>1 then raise exception 'CONFLICT_TRANSACTION_COUNT_FAILED'; end if;
 if (select count(*) from public.market_holdings h join public.market_portfolios p on p.id=h.portfolio_id where p.user_id='00000000-0000-4000-8000-000000000902')<>1 then raise exception 'CONFLICT_HOLDING_COUNT_FAILED'; end if;
 if (select cash_balance_minor from public.market_portfolios where user_id='00000000-0000-4000-8000-000000000902')<>1100 then raise exception 'CONFLICT_DOUBLE_CHARGE'; end if;
end $t$;
