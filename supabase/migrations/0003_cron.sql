-- Heartbeat: POST /api/cron/tick every 10 minutes. Source of truth:
-- docs/techspec.md §9.1. It also keeps the free project from pausing.
--
-- Store these secrets in Vault once (run manually, never committed):
--   select vault.create_secret('<CRON_SECRET>', 'cron_secret');
--   select vault.create_secret('https://<name>.vercel.app', 'app_url');

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'bloom-tick',
  '*/10 * * * *',                                       -- UTC; every 10 minutes
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'app_url') || '/api/cron/tick',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body    := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
