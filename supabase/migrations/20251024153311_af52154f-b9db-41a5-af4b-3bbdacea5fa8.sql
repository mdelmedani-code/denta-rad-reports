-- ============================================
-- PERFORMANCE OPTIMIZATION: Single Health Metrics Query
-- ============================================

CREATE OR REPLACE FUNCTION public.get_health_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  orphaned_data JSONB;
  failed_syncs_data JSONB;
  stale_data JSONB;
  unprocessed_data JSONB;
BEGIN
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
$$;

COMMENT ON FUNCTION public.get_health_metrics() IS 
  'Performance-optimized health metrics collection. Returns all 4 health checks in a single query to reduce database round trips.';

-- ============================================
-- TABLE DOCUMENTATION
-- ============================================

COMMENT ON TABLE public.security_audit_log IS 
  'Audit trail for GDPR compliance (Articles 30, 32). Logs all data access and modification operations. Retention: 7 years per healthcare regulations.';

COMMENT ON TABLE public.cases IS 
  'Primary case management table. Stores CBCT scan metadata and processing status. Patient data is pseudonymized after 8-year retention period.';

COMMENT ON TABLE public.reports IS 
  'Diagnostic reports linked to cases. Versioned to maintain audit trail of report changes. PDF generation and digital signatures managed here.';

COMMENT ON TABLE public.profiles IS 
  'Extended user profile data. Links to auth.users via id. Contains role-based access control and notification preferences.';

COMMENT ON TABLE public.clinics IS 
  'Clinic organization data. Used for multi-tenancy and billing aggregation.';

COMMENT ON TABLE public.invoices IS 
  'Billing records for completed reports. Links to Stripe for payment processing.';

COMMENT ON TABLE public.auth_secrets IS 
  'Encrypted MFA secrets and backup codes. Highly sensitive - access restricted to authenticated user only.';

COMMENT ON TABLE public.login_attempts IS 
  'Login attempt tracking for rate limiting and security monitoring. Auto-cleaned after 24 hours.';

COMMENT ON TABLE public.notifications IS 
  'System and user notifications. Supports email delivery and in-app display.';

COMMENT ON TABLE public.case_annotations IS 
  'Drawing and measurement annotations on DICOM images. Used by radiologists for report creation.';

COMMENT ON TABLE public.report_shares IS 
  'Temporary secure share links for reports. Auto-expire after 7 days for security.';

-- ============================================
-- COLUMN DOCUMENTATION (Key Fields)
-- ============================================

COMMENT ON COLUMN public.cases.field_of_view IS 
  'CBCT scan field of view size. Used for pricing calculation via calculate_case_price() function.';

COMMENT ON COLUMN public.cases.urgency IS 
  'Priority level (standard/urgent). Urgent cases incur £50 surcharge and receive priority processing.';

COMMENT ON COLUMN public.cases.status IS 
  'Case lifecycle state machine: uploaded → in_progress → report_ready. Triggers notifications on status changes.';

COMMENT ON COLUMN public.cases.synced_to_dropbox IS 
  'Dropbox sync status flag. Used by health monitoring to detect stale uploads (>1 hour without sync).';

COMMENT ON COLUMN public.cases.pregenerated_zip_path IS 
  'Path to pre-generated DICOM zip in storage. Improves download performance by avoiding real-time ZIP creation.';

COMMENT ON COLUMN public.reports.is_latest IS 
  'Version control flag. Only one report per case should have is_latest=true. Managed by mark_previous_reports_not_latest() trigger.';

COMMENT ON COLUMN public.reports.signed_off_by IS 
  'Digital signature: UUID of admin who signed off report. Links to profiles table for signatory details.';

COMMENT ON COLUMN public.security_audit_log.severity IS 
  'Log severity level (info/warn/error/critical). Used for filtering and alerting. Critical severity triggers immediate admin notification.';