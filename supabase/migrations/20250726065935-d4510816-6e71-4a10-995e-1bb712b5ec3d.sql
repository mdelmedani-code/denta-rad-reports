-- Temporarily disable the trigger to insert test data
ALTER TABLE cases DISABLE TRIGGER notify_new_case_trigger;

-- Insert test case
INSERT INTO cases (
  patient_name,
  clinical_question,
  status,
  urgency,
  field_of_view,
  clinic_id,
  patient_dob,
  patient_internal_id,
  file_path,
  upload_date,
  created_at,
  updated_at
) VALUES (
  'John Smith',
  'Evaluation of third molar extraction site. Patient reports pain and swelling 2 weeks post-extraction. Please assess for dry socket, infection, or retained root fragments.',
  'uploaded',
  'urgent',
  'up_to_8x8',
  'ace3acab-54c6-4667-ac8e-23f5141c8e87',
  '1985-03-15',
  'PAT-2024-001',
  '/test-scans/john-smith-cbct-scan.dcm',
  NOW(),
  NOW(),
  NOW()
);

-- Add another test case
INSERT INTO cases (
  patient_name,
  clinical_question,
  status,
  urgency,
  field_of_view,
  clinic_id,
  patient_dob,
  patient_internal_id,
  file_path,
  upload_date,
  created_at,
  updated_at
) VALUES (
  'Sarah Johnson',
  'Pre-implant assessment for tooth #19. Patient requires evaluation of bone density and nerve proximity for implant placement planning.',
  'uploaded',
  'standard',
  'up_to_5x5',
  'ace3acab-54c6-4667-ac8e-23f5141c8e87',
  '1978-08-22',
  'PAT-2024-002',
  '/test-scans/sarah-johnson-cbct-scan.dcm',
  NOW(),
  NOW(),
  NOW()
);

-- Re-enable the trigger
ALTER TABLE cases ENABLE TRIGGER notify_new_case_trigger;