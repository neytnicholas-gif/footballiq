begin;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC unless the creator's
-- default privileges say otherwise. Make future application functions fail
-- closed; every browser or service RPC must be granted deliberately.
alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;

commit;
