-- Fix security model for get_health_metrics function
-- Change from SECURITY DEFINER to SECURITY INVOKER for better security posture

DROP FUNCTION IF EXISTS public.get_health_metrics();

CREATE OR REPLACE FUNCTION public.get_health_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER  -- ✅ Changed from DEFINER to INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
BEGIN
  -- Verify admin access (required since we're now SECURITY INVOKER)
  IF get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Collect all metrics in a single query using subqueries
  WITH metrics AS (
    SELECT
      -- Orphaned uploads (>24h, not completed)
      (
        SELECT jsonb_build_object(
          'count', COUNT(*),
          'cases', jsonb_agg(
            jsonb_build_object(
              'id', id,
              'folder', folder_name,
              'created_at', created_at
            )
          ) FILTER (WHERE true)
        )
        FROM (
          SELECT id, folder_name, created_at
          FROM cases
          WHERE upload_completed = false
            AND created_at < NOW() - INTERVAL '24 hours'
          LIMIT 5
        ) orphaned
      ) AS orphaned_uploads,
      
      -- Failed syncs (sync warnings in last 7 days)
      (
        SELECT jsonb_build_object(
          'count', COUNT(*),
          'cases', jsonb_agg(
            jsonb_build_object(
              'id', id,
              'folder', folder_name,
              'warning', sync_warnings
            )
          ) FILTER (WHERE true)
        )
        FROM (
          SELECT id, folder_name, sync_warnings
          FROM cases
          WHERE sync_warnings IS NOT NULL
            AND created_at >= NOW() - INTERVAL '7 days'
          LIMIT 5
        ) failed
      ) AS failed_syncs,
      
      -- Stale cases (uploaded but not synced >1h)
      (
        SELECT jsonb_build_object(
          'count', COUNT(*),
          'cases', jsonb_agg(
            jsonb_build_object(
              'id', id,
              'folder', folder_name,
              'created_at', created_at
            )
          ) FILTER (WHERE true)
        )
        FROM (
          SELECT id, folder_name, created_at
          FROM cases
          WHERE synced_to_dropbox = false
            AND status = 'uploaded'
            AND created_at < NOW() - INTERVAL '1 hour'
          LIMIT 5
        ) stale
      ) AS stale_cases,
      
      -- Unprocessed uploads (uploaded >48h)
      (
        SELECT jsonb_build_object(
          'count', COUNT(*),
          'cases', jsonb_agg(
            jsonb_build_object(
              'id', id,
              'folder', folder_name,
              'created_at', created_at
            )
          ) FILTER (WHERE true)
        )
        FROM (
          SELECT id, folder_name, created_at
          FROM cases
          WHERE status = 'uploaded'
            AND created_at < NOW() - INTERVAL '48 hours'
          LIMIT 5
        ) unprocessed
      ) AS unprocessed_uploads,
      
      -- Get actual counts for all conditions
      (
        SELECT COUNT(*)
        FROM cases
        WHERE upload_completed = false
          AND created_at < NOW() - INTERVAL '24 hours'
      ) AS orphaned_count,
      
      (
        SELECT COUNT(*)
        FROM cases
        WHERE sync_warnings IS NOT NULL
          AND created_at >= NOW() - INTERVAL '7 days'
      ) AS failed_syncs_count,
      
      (
        SELECT COUNT(*)
        FROM cases
        WHERE synced_to_dropbox = false
          AND status = 'uploaded'
          AND created_at < NOW() - INTERVAL '1 hour'
      ) AS stale_count,
      
      (
        SELECT COUNT(*)
        FROM cases
        WHERE status = 'uploaded'
          AND created_at < NOW() - INTERVAL '48 hours'
      ) AS unprocessed_count
  )
  SELECT jsonb_build_object(
    'orphaned_uploads', orphaned_uploads || jsonb_build_object('total_count', orphaned_count),
    'failed_syncs', failed_syncs || jsonb_build_object('total_count', failed_syncs_count),
    'stale_cases', stale_cases || jsonb_build_object('total_count', stale_count),
    'unprocessed_uploads', unprocessed_uploads || jsonb_build_object('total_count', unprocessed_count)
  ) INTO result
  FROM metrics;
  
  RETURN result;
END;
$function$;

COMMENT ON FUNCTION public.get_health_metrics() IS 'Retrieves system health metrics in a single optimized query. Admin access required. Uses SECURITY INVOKER for least-privilege security model.';