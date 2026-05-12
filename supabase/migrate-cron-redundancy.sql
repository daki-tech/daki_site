-- =====================================================================
-- Cron redundancy + audit log
-- =====================================================================
--
-- Goal: stock-sync (and any future cron) must run daily even if one
-- delivery layer fails. Three layers, same endpoint, same Bearer secret:
--
--   1. Vercel cron    — primary (vercel.json, sends Authorization header
--                       automatically when CRON_SECRET env is set)
--   2. pg_cron        — secondary, runs from inside Supabase via pg_net
--                       (this migration)
--   3. cron-job.org   — tertiary, external (manual setup, see comments
--                       at the bottom of this file)
--
-- Every successful or failed run is recorded in `cron_runs` so it's
-- visible which layer actually fired.
--
-- BEFORE RUNNING THIS MIGRATION:
--   1. Set CRON_SECRET in Vercel env vars (any high-entropy string).
--   2. Replace the two placeholders below:
--        <<DAKI_BASE_URL>>       e.g. https://daki.fashion.ua
--        <<DAKI_CRON_SECRET>>    same value as Vercel CRON_SECRET
--   3. Run in Supabase SQL editor with service_role permissions.
--
-- Idempotent: safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Audit table — every cron invocation is logged here
-- ---------------------------------------------------------------------
create table if not exists public.cron_runs (
  id           bigserial primary key,
  job_name     text        not null,
  source       text        not null check (source in ('vercel', 'pg_cron', 'external', 'unknown')),
  ok           boolean     not null,
  duration_ms  integer     not null,
  started_at   timestamptz not null,
  error        text,
  created_at   timestamptz not null default now()
);

create index if not exists cron_runs_job_started_idx
  on public.cron_runs (job_name, started_at desc);

-- Locked down: only service_role reads/writes. Endpoint uses admin client.
alter table public.cron_runs enable row level security;

drop policy if exists cron_runs_service_role_all on public.cron_runs;
create policy cron_runs_service_role_all
  on public.cron_runs
  as permissive
  for all
  to service_role
  using (true)
  with check (true);

-- Auto-cleanup: keep 90 days of run history.
create or replace function public.cleanup_cron_runs()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.cron_runs
  where created_at < now() - interval '90 days';
$$;

-- ---------------------------------------------------------------------
-- 2. Enable required extensions
-- ---------------------------------------------------------------------
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;

-- ---------------------------------------------------------------------
-- 3. Schedule the redundancy job
--
-- Runs at 07:00 UTC daily — exactly one hour after the Vercel cron
-- defined in vercel.json ("0 6 * * *"). If Vercel fired successfully,
-- this is a harmless duplicate (sync is idempotent — it overwrites the
-- Google Sheet). If Vercel missed, this catches it.
-- ---------------------------------------------------------------------
select cron.unschedule('stock-sync-redundancy')
  where exists (select 1 from cron.job where jobname = 'stock-sync-redundancy');

select cron.schedule(
  'stock-sync-redundancy',
  '0 7 * * *',
  $$
  select net.http_get(
    url     := '<<DAKI_BASE_URL>>/api/cron/stock-sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <<DAKI_CRON_SECRET>>',
      'User-Agent',    'pg_net/supabase-cron'
    ),
    timeout_milliseconds := 60000
  );
  $$
);

-- Weekly cleanup of audit log (Sunday 03:00 UTC).
select cron.unschedule('cron-runs-cleanup')
  where exists (select 1 from cron.job where jobname = 'cron-runs-cleanup');

select cron.schedule(
  'cron-runs-cleanup',
  '0 3 * * 0',
  $$ select public.cleanup_cron_runs(); $$
);

-- ---------------------------------------------------------------------
-- 4. (Optional, tertiary layer) cron-job.org setup — do this in browser:
--
--   1. Sign up at https://cron-job.org (free tier: 3 jobs)
--   2. Create job:
--        URL:    <<DAKI_BASE_URL>>/api/cron/stock-sync
--        Method: GET
--        Schedule: every day at 08:00 UTC  (one hour after pg_cron)
--   3. Advanced → Headers → Add:
--        Authorization: Bearer <<DAKI_CRON_SECRET>>
--   4. Notifications → "On failure" → enter email.
--
-- Result: stock-sync gets three independent shots per day at 06/07/08
-- UTC. The endpoint is idempotent, so duplicates do nothing harmful.
-- Each run is visible in `cron_runs` with its source.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- 5. Verification queries (run manually after migration applies):
--
--   -- See scheduled jobs:
--   select jobname, schedule, active from cron.job;
--
--   -- See recent runs:
--   select job_name, source, ok, duration_ms, started_at, error
--   from public.cron_runs
--   order by started_at desc
--   limit 20;
--
--   -- See pg_net call history:
--   select * from net._http_response order by created desc limit 5;
-- ---------------------------------------------------------------------
