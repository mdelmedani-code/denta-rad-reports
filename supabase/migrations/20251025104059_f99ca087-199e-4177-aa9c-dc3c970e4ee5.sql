-- Add new columns to reports table
ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_content JSONB;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS clinical_history TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS technique TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS findings TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS impression TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS recommendations TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS attached_images TEXT[];
ALTER TABLE reports ADD COLUMN IF NOT EXISTS is_signed BOOLEAN DEFAULT false;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS signed_by TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS signature_hash TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS template_used TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS last_saved_at TIMESTAMPTZ;

-- Create report_templates table
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  template_type TEXT NOT NULL,
  clinical_history TEXT,
  technique TEXT,
  findings TEXT,
  impression TEXT,
  recommendations TEXT,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  use_count INTEGER DEFAULT 0
);

-- Create report_snippets table
CREATE TABLE IF NOT EXISTS report_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  shortcut TEXT,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  use_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create report_images table
CREATE TABLE IF NOT EXISTS report_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id),
  image_url TEXT NOT NULL,
  caption TEXT,
  position INTEGER,
  section TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create signature_audit table
CREATE TABLE IF NOT EXISTS signature_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id),
  case_id UUID REFERENCES cases(id),
  signer_id UUID REFERENCES auth.users(id),
  signer_name TEXT NOT NULL,
  signer_credentials TEXT,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  signature_hash TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  verification_token TEXT UNIQUE
);

-- Create report_versions table
CREATE TABLE IF NOT EXISTS report_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  clinical_history TEXT,
  technique TEXT,
  findings TEXT,
  impression TEXT,
  recommendations TEXT,
  attached_images TEXT[],
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  saved_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on all new tables
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_snippets ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for report_templates
CREATE POLICY "Reporters can view templates" ON report_templates
  FOR SELECT USING (get_current_user_role() IN ('admin', 'reporter'));

CREATE POLICY "Reporters can create templates" ON report_templates
  FOR INSERT WITH CHECK (get_current_user_role() IN ('admin', 'reporter'));

CREATE POLICY "Reporters can update templates" ON report_templates
  FOR UPDATE USING (get_current_user_role() IN ('admin', 'reporter'));

-- RLS Policies for report_snippets
CREATE POLICY "Reporters can view snippets" ON report_snippets
  FOR SELECT USING (get_current_user_role() IN ('admin', 'reporter'));

CREATE POLICY "Reporters can create snippets" ON report_snippets
  FOR INSERT WITH CHECK (get_current_user_role() IN ('admin', 'reporter'));

CREATE POLICY "Reporters can update snippets" ON report_snippets
  FOR UPDATE USING (get_current_user_role() IN ('admin', 'reporter'));

-- RLS Policies for report_images
CREATE POLICY "Reporters can manage report images" ON report_images
  FOR ALL USING (get_current_user_role() IN ('admin', 'reporter'));

-- RLS Policies for signature_audit
CREATE POLICY "Anyone can verify signatures" ON signature_audit
  FOR SELECT USING (true);

CREATE POLICY "Reporters can sign reports" ON signature_audit
  FOR INSERT WITH CHECK (get_current_user_role() IN ('admin', 'reporter'));

-- RLS Policies for report_versions
CREATE POLICY "Reporters can view versions" ON report_versions
  FOR SELECT USING (get_current_user_role() IN ('admin', 'reporter'));

CREATE POLICY "System can create versions" ON report_versions
  FOR INSERT WITH CHECK (get_current_user_role() IN ('admin', 'reporter'));

-- Insert default templates
INSERT INTO report_templates (name, description, category, template_type, clinical_history, technique, findings, impression, recommendations, is_default)
VALUES 
(
  'Standard CBCT Report',
  'Default template for routine CBCT scans',
  'full_report',
  'cbct_standard',
  'Patient referred for CBCT assessment of [area/tooth]. Clinical concern: [reason for referral].',
  'CBCT examination performed using [Scanner Model/Type].
Field of view: [Small/Medium/Large] FOV
Voxel size: 0.3mm isotropic
Slice thickness: 0.3mm
Images reconstructed in axial, sagittal, and coronal planes.',
  'REGION OF INTEREST:
[Describe findings systematically]

ADDITIONAL STRUCTURES:
Maxillary sinuses: [Normal aeration / describe pathology]
Temporomandibular joints: [If visible]
Surrounding bone: [Normal / describe abnormalities]

No additional significant pathology identified.',
  '1. [Primary finding]
2. [Secondary finding]
3. [Additional findings as needed]',
  'Clinical correlation recommended.
[Specific treatment recommendations based on findings]
Follow-up as deemed appropriate by the referring clinician.',
  true
),
(
  'Implant Planning Report',
  'Template for dental implant site assessment',
  'full_report',
  'implant_planning',
  'Patient referred for CBCT assessment for dental implant planning at site(s): [specify teeth/sites].',
  'CBCT examination performed using [Scanner Model].
Field of view: [Small/Medium] FOV optimized for implant planning
Voxel size: 0.2-0.3mm isotropic
Images reconstructed with cross-sectional views perpendicular to proposed implant sites.',
  'SITE: [Tooth number/site]

BONE DIMENSIONS:
- Bucco-lingual width: [X] mm
- Mesio-distal width: [X] mm  
- Available bone height: [X] mm
- Distance to vital structures: [X] mm

BONE QUALITY:
- Cortical bone: [Thin/Normal/Thick]
- Trabecular density: [Low/Medium/High] (Lekholm & Zarb Type [I-IV])

ANATOMICAL CONSIDERATIONS:
- Maxillary sinus: [Distance/relationship]
- Inferior alveolar canal: [Distance/relationship]
- Mental foramen: [Location if relevant]
- Adjacent teeth: [Root positions]

RIDGE MORPHOLOGY:
- [Favorable/Undercut/Concavity noted]',
  'Site [tooth/area] is [favorable/requires augmentation/not suitable] for implant placement.

Recommended implant dimensions: [Length] mm × [Diameter] mm

[Additional findings or concerns]',
  'Implant placement [can proceed / requires bone augmentation / alternative treatment recommended].

If augmentation needed: [Specify type - ridge augmentation, sinus lift, etc.]

Clinical correlation and surgical planning recommended.',
  false
),
(
  'TMJ Assessment Report',
  'Template for temporomandibular joint evaluation',
  'full_report',
  'tmj',
  'Patient referred for CBCT assessment of temporomandibular joints. Clinical presentation: [pain/clicking/locking/etc.].',
  'CBCT examination performed using [Scanner Model].
Field of view: [Medium/Large] FOV including bilateral TMJs
Images reconstructed in corrected sagittal and coronal planes through each joint.',
  'RIGHT TMJ:
- Condylar position: [Centered/Anteriorly positioned/Posteriorly positioned]
- Condylar morphology: [Normal/Flattening/Erosion/Osteophyte formation]
- Joint space: [Maintained/Narrowed]
- Cortical integrity: [Intact/Disrupted]

LEFT TMJ:
- Condylar position: [Centered/Anteriorly positioned/Posteriorly positioned]
- Condylar morphology: [Normal/Flattening/Erosion/Osteophyte formation]
- Joint space: [Maintained/Narrowed]
- Cortical integrity: [Intact/Disrupted]

COMPARATIVE FINDINGS:
[Symmetry/Asymmetry noted]',
  '1. Right TMJ: [Normal/Degenerative changes/Specific pathology]
2. Left TMJ: [Normal/Degenerative changes/Specific pathology]
3. [Overall assessment]',
  'Clinical correlation with symptoms recommended.
[Specific management suggestions based on findings]
Consider referral to TMJ specialist if indicated.',
  false
),
(
  'Sinus Assessment Report',
  'Template for maxillary sinus evaluation',
  'full_report',
  'sinus',
  'Patient referred for CBCT assessment of maxillary sinuses. Clinical concern: [sinusitis/pre-implant/other].',
  'CBCT examination performed using [Scanner Model].
Field of view: [Medium/Large] FOV including maxillary sinuses
Images reconstructed in axial, sagittal, and coronal planes.',
  'RIGHT MAXILLARY SINUS:
- Aeration: [Normal/Reduced]
- Mucosal thickening: [None/Mild/Moderate/Severe - X mm]
- Floor morphology: [Flat/Irregular/Septations present]
- Ostiomeatal complex: [Patent/Obstructed]
- Additional findings: [Air-fluid level/polyp/retention cyst]

LEFT MAXILLARY SINUS:
- Aeration: [Normal/Reduced]
- Mucosal thickening: [None/Mild/Moderate/Severe - X mm]
- Floor morphology: [Flat/Irregular/Septations present]
- Ostiomeatal complex: [Patent/Obstructed]
- Additional findings: [Air-fluid level/polyp/retention cyst]

NASAL CAVITY:
- Septum: [Midline/Deviated]
- Turbinates: [Normal/Hypertrophied]',
  '1. Right maxillary sinus: [Normal/Findings]
2. Left maxillary sinus: [Normal/Findings]
3. [Clinical significance]',
  'Clinical correlation recommended.
[If pathology found: Consider ENT referral if significant pathology identified.]
[If pre-implant: Sinus floor distance adequate for implant placement / Sinus lift recommended]',
  false
);

-- Insert default snippets
INSERT INTO report_snippets (name, shortcut, content, category) VALUES
-- ANATOMY SNIPPETS
('Normal Maxillary Sinuses', 'ns', 'Bilateral maxillary sinuses demonstrate normal aeration with no significant mucosal thickening. Ostiomeatal complexes appear patent.', 'anatomy'),
('Normal TMJs', 'ntmj', 'Bilateral temporomandibular joints appear within normal limits with centered condylar positioning and intact cortical margins.', 'anatomy'),
('Normal Bone Density', 'nbd', 'Surrounding bone demonstrates normal trabecular pattern with intact cortical continuity.', 'anatomy'),
('Normal IAN', 'nian', 'Inferior alveolar neurovascular canal is clearly identified with normal course and caliber.', 'anatomy'),

-- PATHOLOGY SNIPPETS
('Apical Periodontitis', 'ap', 'A well-defined periapical radiolucency is noted measuring approximately [X] mm in diameter. The buccal cortical plate appears [intact/perforated].', 'pathology'),
('Vertical Root Fracture', 'vrf', 'A vertical root fracture is identified extending from the crown to the apex with associated bone loss.', 'pathology'),
('Horizontal Root Fracture', 'hrf', 'A horizontal root fracture is noted at approximately the [apical/middle/coronal] third of the root.', 'pathology'),
('Periodontal Bone Loss', 'pbl', 'Generalized horizontal bone loss is evident with loss of approximately [X]% of bone support.', 'pathology'),
('Impacted Tooth', 'imp', 'The tooth is impacted in a [horizontal/vertical/mesioangular/distoangular] position.', 'pathology'),
('Sinus Mucosal Thickening', 'smt', 'Mucosal thickening measuring up to [X] mm is noted along the floor of the maxillary sinus.', 'pathology'),
('Retained Root', 'rr', 'A retained root fragment is identified measuring approximately [X] mm in length.', 'pathology'),

-- RECOMMENDATION SNIPPETS
('Clinical Correlation', 'cc', 'Clinical correlation recommended.', 'recommendation'),
('Endodontic Treatment', 'endo', 'Endodontic evaluation and treatment may be considered based on clinical assessment.', 'recommendation'),
('Extraction Recommended', 'ext', 'Extraction recommended given poor prognosis.', 'recommendation'),
('Surgical Referral', 'surg', 'Surgical consultation recommended for definitive management.', 'recommendation'),
('Follow-up', 'fu', 'Follow-up imaging in [timeframe] recommended to assess progression.', 'recommendation'),
('No Treatment', 'nt', 'No active treatment indicated at this time. Routine monitoring recommended.', 'recommendation'),

-- TECHNIQUE SNIPPETS
('Small FOV', 'sfov', 'CBCT examination performed using small field of view (5×5 cm).', 'technique'),
('Medium FOV', 'mfov', 'CBCT examination performed using medium field of view (8×8 cm).', 'technique'),
('Large FOV', 'lfov', 'CBCT examination performed using large field of view (16×16 cm).', 'technique'),
('Standard Resolution', 'sres', 'Voxel size: 0.3mm isotropic, slice thickness: 0.3mm. Images reconstructed in axial, sagittal, and coronal planes.', 'technique');

-- Create storage bucket for report images
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-images', 'report-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for report images
CREATE POLICY "Authenticated users can upload report images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'report-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can view report images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'report-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their report images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'report-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their report images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'report-images' 
  AND auth.role() = 'authenticated'
);