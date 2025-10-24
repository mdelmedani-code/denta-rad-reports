-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to automatically retry failed Dropbox syncs every 5 minutes
SELECT cron.schedule(
  'retry-failed-dropbox-syncs',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://swusayoygknritombbwg.supabase.co/functions/v1/retry-failed-syncs',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3dXNheW95Z2tucml0b21iYndnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTkzMjEsImV4cCI6MjA2OTAzNTMyMX0.sOAz9isiZUp8BmFVDQRV-G16iWc0Rk8mM9obUKko2dY"}'::jsonb,
        body:='{"triggered_by": "cron"}'::jsonb
    ) as request_id;
  $$
);