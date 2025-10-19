-- Create report content templates table
CREATE TABLE IF NOT EXISTS cbct_report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  indication_category text NOT NULL, -- e.g., "TMJ", "Implant Planning", "Pathology", "Airway"
  is_default boolean DEFAULT false,
  
  -- Template content (pre-written text with variables)
  clinical_history_template text,
  imaging_technique_template text,
  findings_template text NOT NULL,
  impression_template text NOT NULL,
  recommendations_template text,
  
  -- Metadata
  usage_count integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique constraint for default templates per category
CREATE UNIQUE INDEX idx_unique_default_per_category 
ON cbct_report_templates (indication_category) 
WHERE is_default = true;

-- Create indexes for performance
CREATE INDEX idx_templates_category ON cbct_report_templates(indication_category);
CREATE INDEX idx_templates_default ON cbct_report_templates(is_default) WHERE is_default = true;

-- Enable RLS
ALTER TABLE cbct_report_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage templates"
  ON cbct_report_templates
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Reporters can view templates"
  ON cbct_report_templates
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'reporter') OR has_role(auth.uid(), 'admin'));

-- Function to increment template usage
CREATE OR REPLACE FUNCTION increment_template_usage(template_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE cbct_report_templates
  SET usage_count = usage_count + 1,
      updated_at = now()
  WHERE id = template_id;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_cbct_report_templates_updated_at
  BEFORE UPDATE ON cbct_report_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample templates
INSERT INTO cbct_report_templates (
  name, 
  description, 
  indication_category, 
  is_default,
  findings_template,
  impression_template,
  recommendations_template
) VALUES 
(
  'TMJ - Internal Derangement',
  'Standard template for TMJ assessment with suspected disc issues',
  'TMJ',
  true,
  'Temporomandibular Joint Assessment:

Right TMJ:
- Condyle: Normal morphology without erosive changes or degenerative features
- Disc position: [CUSTOMIZE BASED ON IMAGES]
- Articular eminence: Normal configuration
- Joint space: [CUSTOMIZE]
- Effusion: [Present/Absent]

Left TMJ:
- Condyle: Normal morphology without erosive changes or degenerative features
- Disc position: [CUSTOMIZE BASED ON IMAGES]
- Articular eminence: Normal configuration
- Joint space: [CUSTOMIZE]
- Effusion: [Present/Absent]

Mandibular Condyles:
- Bilateral condyles demonstrate normal cortical integrity
- No evidence of resorption or ankylosis',
  '1. [SUMMARIZE MAIN FINDINGS]
2. Clinical correlation and further assessment recommended as clinically indicated',
  '- Clinical correlation recommended
- Further imaging or specialist referral if symptoms persist
- Follow-up assessment as per treating clinician''s discretion'
),
(
  'Implant - Standard Assessment',
  'General template for dental implant planning',
  'Implant Planning',
  true,
  'Implant Site Assessment - {clinical_question}:

Bone Quality and Quantity:
- Available bone height: [MEASURE] mm
- Available bone width: [MEASURE] mm
- Bone density: [D1/D2/D3/D4]

Anatomical Considerations:
- Distance to inferior alveolar nerve: [MEASURE] mm
- Distance to maxillary sinus: [MEASURE] mm if applicable
- Adjacent tooth roots: [EVALUATE]

Site Evaluation:
- Adequate bone volume for standard implant placement: [Yes/No]
- Bone augmentation required: [Yes/No - specify if needed]
- Sinus lift required: [Yes/No if applicable]',
  '1. [SUMMARIZE BONE AVAILABILITY AND QUALITY]
2. [RECOMMENDATIONS FOR IMPLANT SIZE AND APPROACH]
3. Surgical planning and clinical correlation recommended',
  '- Recommend [SIZE] mm diameter x [LENGTH] mm length implant
- Bone augmentation procedures as discussed if applicable
- Clinical assessment prior to implant placement
- Standard surgical protocols recommended'
),
(
  'Pathology - General Assessment',
  'Template for evaluating suspected pathological lesions',
  'Pathology',
  true,
  'Pathological Assessment:

Lesion Characteristics:
- Location: [SPECIFY ANATOMICAL LOCATION]
- Size: [MEASURE] mm in maximum dimension
- Margins: [Well-defined/Poorly-defined]
- Density: [Radiolucent/Radiopaque/Mixed]
- Effect on adjacent structures: [DESCRIBE]

Associated Findings:
- Cortical expansion: [Present/Absent]
- Cortical perforation: [Present/Absent]
- Tooth displacement: [Present/Absent]
- Root resorption: [Present/Absent]

Differential Diagnosis Considerations:
- [LIST POTENTIAL DIAGNOSES BASED ON IMAGING FEATURES]',
  '1. [PRIMARY IMAGING DIAGNOSIS]
2. Differential diagnoses include: [LIST]
3. Clinical and histopathological correlation essential for definitive diagnosis',
  '- Biopsy recommended for definitive diagnosis
- Referral to oral surgeon/oral medicine specialist
- Clinical correlation essential
- Follow-up imaging to assess progression if conservative management chosen'
);

-- Grant execute permission on function
GRANT EXECUTE ON FUNCTION increment_template_usage(uuid) TO authenticated;