-- A catalogue sync writes several idempotent batches. Only one such writer may
-- run at a time, preventing two cron/manual invocations from interleaving.
update public.market_processing_runs
set status = 'failed',
    finished_at = now(),
    error_message = coalesce(error_message, 'Catalogue synchronization was stale when the overlap lock was installed.'),
    report = coalesce(report, '{}'::jsonb) || jsonb_build_object(
      'recoverable', true,
      'failure_stage', 'stale_run_recovery'
    )
where run_type = 'catalogue_sync'
  and status = 'running'
  and started_at < now() - interval '15 minutes';

create unique index if not exists market_processing_runs_one_catalogue_sync_idx
  on public.market_processing_runs ((run_type))
  where run_type = 'catalogue_sync' and status = 'running';

comment on index public.market_processing_runs_one_catalogue_sync_idx is
  'Prevents overlapping catalogue writers; stale runs are failed and retried idempotently.';
