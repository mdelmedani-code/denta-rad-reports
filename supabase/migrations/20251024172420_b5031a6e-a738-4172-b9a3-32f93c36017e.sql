-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop existing cron job if it exists
DO $$
BEGIN
  PERFORM cron.unschedule('retry-failed-dropbox-syncs');
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Create cron job without authentication (JWT verification disabled in config.toml)
SELECT cron.schedule(
  'retry-failed-dropbox-syncs',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
        url := 'https://swusayoygknritombbwg.supabase.co/functions/v1/retry-failed-syncs',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{"triggered_by": "cron"}'::jsonb
    ) as request_id;
  $$
);