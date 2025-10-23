-- Phase 1: Add report versioning and metadata tracking

-- Add version tracking to reports table
ALTER TABLE reports ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS is_latest BOOLEAN DEFAULT true;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS previous_version_id UUID REFERENCES reports(id);

-- Add SR validation tracking to cases table
ALTER TABLE cases ADD COLUMN IF NOT EXISTS sr_validated BOOLEAN DEFAULT false;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS sr_validation_errors JSONB;

-- Create index for faster search queries
CREATE INDEX IF NOT EXISTS idx_cases_patient_name ON cases(patient_name);
CREATE INDEX IF NOT EXISTS idx_cases_upload_date ON cases(upload_date);
CREATE INDEX IF NOT EXISTS idx_cases_status_urgency ON cases(status, urgency);
CREATE INDEX IF NOT EXISTS idx_reports_version ON reports(case_id, version);

-- Phase 2: Report templates system

-- Create report templates table
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  indication_type TEXT NOT NULL,
  template_content JSONB NOT NULL,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on report_templates
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage templates"
ON report_templates FOR ALL
USING (get_current_user_role() = 'admin');

CREATE POLICY "All authenticated users can view templates"
ON report_templates FOR SELECT
USING (auth.role() = 'authenticated');

-- Insert default templates for different findings
INSERT INTO report_templates (name, indication_type, template_content, sections) VALUES
(
  'General CBCT Report',
  'general',
  '{"description": "Standard CBCT diagnostic report for general findings"}'::jsonb,
  '[
    {"title": "Clinical Information", "fields": ["patient_demographics", "clinical_question"]},
    {"title": "Technical Parameters", "fields": ["field_of_view", "voxel_size", "exposure_settings"]},
    {"title": "Findings", "fields": ["anatomical_structures", "pathological_findings"]},
    {"title": "Impression", "fields": ["summary", "recommendations"]}
  ]'::jsonb
),
(
  'Pathology Screening',
  'pathology',
  '{"description": "Detailed pathology screening and analysis"}'::jsonb,
  '[
    {"title": "Clinical Information", "fields": ["patient_demographics", "clinical_question"]},
    {"title": "Lesion Analysis", "fields": ["location", "size", "borders", "density"]},
    {"title": "Differential Diagnosis", "fields": ["primary_diagnosis", "differential"]},
    {"title": "Recommendations", "fields": ["follow_up", "referrals"]}
  ]'::jsonb
),
(
  'Implant Planning',
  'implant_planning',
  '{"description": "Pre-surgical implant planning report"}'::jsonb,
  '[
    {"title": "Clinical Information", "fields": ["patient_demographics", "implant_sites"]},
    {"title": "Bone Assessment", "fields": ["bone_height", "bone_width", "bone_density"]},
    {"title": "Anatomical Considerations", "fields": ["nerve_position", "sinus_proximity"]},
    {"title": "Surgical Planning", "fields": ["implant_dimensions", "placement_recommendations"]}
  ]'::jsonb
),
(
  'TMJ Analysis',
  'tmj_analysis',
  '{"description": "Temporomandibular joint evaluation"}'::jsonb,
  '[
    {"title": "Clinical Information", "fields": ["patient_demographics", "symptoms"]},
    {"title": "Joint Morphology", "fields": ["condyle_shape", "fossa_eminence", "joint_space"]},
    {"title": "Degenerative Changes", "fields": ["arthritic_changes", "remodeling"]},
    {"title": "Functional Assessment", "fields": ["range_of_motion", "disc_position"]}
  ]'::jsonb
),
(
  'Airway Analysis',
  'airway_analysis',
  '{"description": "Upper airway assessment for OSA screening"}'::jsonb,
  '[
    {"title": "Clinical Information", "fields": ["patient_demographics", "sleep_symptoms"]},
    {"title": "Airway Measurements", "fields": ["minimum_cross_section", "volume", "length"]},
    {"title": "Anatomical Findings", "fields": ["soft_palate", "tongue_position", "adenoid_tonsil"]},
    {"title": "Risk Assessment", "fields": ["osa_risk", "recommendations"]}
  ]'::jsonb
);

-- Phase 3: Backup monitoring table
CREATE TABLE IF NOT EXISTS backup_monitoring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL,
  backup_date TIMESTAMPTZ DEFAULT now(),
  file_count INTEGER,
  total_size BIGINT,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on backup_monitoring
ALTER TABLE backup_monitoring ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view backup logs"
ON backup_monitoring FOR SELECT
USING (get_current_user_role() = 'admin');

CREATE POLICY "System can insert backup logs"
ON backup_monitoring FOR INSERT
WITH CHECK (true);

-- Add retention policy tracking
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL,
  retention_days INTEGER NOT NULL,
  archive_after_days INTEGER,
  compliance_standard TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on retention policies
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage retention policies"
ON data_retention_policies FOR ALL
USING (get_current_user_role() = 'admin');

-- Insert default retention policies
INSERT INTO data_retention_policies (resource_type, retention_days, archive_after_days, compliance_standard) VALUES
('cbct_scans', 2555, 1825, 'HIPAA - 7 years minimum'),
('reports', 2555, 1825, 'HIPAA - 7 years minimum'),
('audit_logs', 2555, 1825, 'HIPAA - 7 years minimum'),
('case_metadata', 3650, 2555, 'Extended retention - 10 years');

-- Create function to mark old report versions as not latest
CREATE OR REPLACE FUNCTION mark_previous_reports_not_latest()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark all previous versions as not latest
  UPDATE reports 
  SET is_latest = false
  WHERE case_id = NEW.case_id 
    AND id != NEW.id 
    AND is_latest = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for report versioning
DROP TRIGGER IF EXISTS trigger_mark_previous_reports ON reports;
CREATE TRIGGER trigger_mark_previous_reports
  AFTER INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION mark_previous_reports_not_latest();