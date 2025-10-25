-- Add version tracking to reports table
ALTER TABLE reports ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS is_superseded BOOLEAN DEFAULT false;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES reports(id);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS supersedes UUID REFERENCES reports(id);

-- Add version tracking to signature_audit
ALTER TABLE signature_audit ADD COLUMN IF NOT EXISTS report_version INTEGER DEFAULT 1;
ALTER TABLE signature_audit ADD COLUMN IF NOT EXISTS is_superseded BOOLEAN DEFAULT false;
ALTER TABLE signature_audit ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES signature_audit(id);

-- Add column to track if report can be reopened
ALTER TABLE reports ADD COLUMN IF NOT EXISTS can_reopen BOOLEAN DEFAULT true;

-- Create index for version queries
CREATE INDEX IF NOT EXISTS idx_reports_supersedes ON reports(supersedes);
CREATE INDEX IF NOT EXISTS idx_reports_version ON reports(case_id, version);
CREATE INDEX IF NOT EXISTS idx_signature_audit_report_version ON signature_audit(report_id, report_version);

-- Function to create new version when reopening
CREATE OR REPLACE FUNCTION public.create_report_version(
  p_original_report_id UUID,
  p_new_version_number INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_report_id UUID;
  v_original_report RECORD;
BEGIN
  -- Get original report
  SELECT * INTO v_original_report
  FROM reports
  WHERE id = p_original_report_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original report not found';
  END IF;
  
  -- Create new version
  INSERT INTO reports (
    case_id,
    clinical_history,
    technique,
    findings,
    impression,
    recommendations,
    version,
    supersedes,
    is_signed,
    author_id
  ) VALUES (
    v_original_report.case_id,
    v_original_report.clinical_history,
    v_original_report.technique,
    v_original_report.findings,
    v_original_report.impression,
    v_original_report.recommendations,
    p_new_version_number,
    p_original_report_id,
    false,
    v_original_report.author_id
  ) RETURNING id INTO v_new_report_id;
  
  -- Mark original as superseded
  UPDATE reports
  SET is_superseded = true,
      superseded_by = v_new_report_id
  WHERE id = p_original_report_id;
  
  -- Mark original signature as superseded
  UPDATE signature_audit
  SET is_superseded = true,
      superseded_by = (
        SELECT id FROM signature_audit 
        WHERE report_id = v_new_report_id 
        ORDER BY signed_at DESC 
        LIMIT 1
      )
  WHERE report_id = p_original_report_id
    AND is_superseded = false;
  
  RETURN v_new_report_id;
END;
$$;

-- Function to get version chain
CREATE OR REPLACE FUNCTION public.get_report_version_chain(p_report_id UUID)
RETURNS TABLE (
  id UUID,
  version INTEGER,
  signed_at TIMESTAMPTZ,
  signed_by TEXT,
  is_superseded BOOLEAN,
  is_current BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_report_id UUID := p_report_id;
  v_original_report_id UUID;
BEGIN
  -- Find the original (first) report in the chain
  WITH RECURSIVE version_chain AS (
    -- Base case: start with the given report
    SELECT r.id, r.supersedes
    FROM reports r
    WHERE r.id = p_report_id
    
    UNION ALL
    
    -- Recursive case: follow supersedes links backward
    SELECT r.id, r.supersedes
    FROM reports r
    INNER JOIN version_chain vc ON r.id = vc.supersedes
  )
  SELECT vc.id INTO v_original_report_id
  FROM version_chain vc
  WHERE vc.supersedes IS NULL;
  
  -- Return all versions starting from the original
  RETURN QUERY
  WITH RECURSIVE forward_chain AS (
    -- Base case: start with original
    SELECT 
      r.id,
      r.version,
      r.is_superseded,
      r.superseded_by
    FROM reports r
    WHERE r.id = COALESCE(v_original_report_id, p_report_id)
    
    UNION ALL
    
    -- Recursive case: follow superseded_by links forward
    SELECT 
      r.id,
      r.version,
      r.is_superseded,
      r.superseded_by
    FROM reports r
    INNER JOIN forward_chain fc ON r.id = fc.superseded_by
  )
  SELECT 
    fc.id,
    fc.version,
    sa.signed_at,
    sa.signer_name,
    fc.is_superseded,
    (fc.id = v_current_report_id) as is_current
  FROM forward_chain fc
  LEFT JOIN signature_audit sa ON sa.report_id = fc.id
  ORDER BY fc.version ASC;
END;
$$;