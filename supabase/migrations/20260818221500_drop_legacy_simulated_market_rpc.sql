-- The original Phase 2 prototype exposed a security-definer simulation RPC to
-- authenticated users. Production no longer contains this function, but this
-- migration makes that safety property explicit and protects new environments
-- that may have replayed the legacy root-level SQL file.

drop function if exists public.market_apply_simulated_matchweek(text, jsonb, text);
