-- Delete all existing report templates
DELETE FROM report_templates;

-- Create a single standard report template
INSERT INTO report_templates (
  id,
  name,
  description,
  category,
  template_type,
  clinical_history,
  technique,
  findings,
  impression,
  is_default,
  use_count
) VALUES (
  gen_random_uuid(),
  'Standard Report Template',
  'Default template for all CBCT reports',
  'general',
  'standard',
  NULL, -- Clinical history should never be overwritten by template
  '<h3>TECHNIQUE:</h3><p>Enter technique details here...</p>',
  '<h3>FINDINGS:</h3><p>Enter findings here...</p>',
  '<h3>IMPRESSION:</h3><p>Enter impression here...</p>',
  true,
  0
);