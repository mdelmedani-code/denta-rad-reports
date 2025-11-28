-- Delete all related records first to avoid foreign key constraints
DELETE FROM case_annotations;
DELETE FROM report_versions;
DELETE FROM report_images;
DELETE FROM signature_audit;
DELETE FROM template_usage_log;
DELETE FROM reports;
DELETE FROM invoices;
DELETE FROM cases;

-- Reset the simple_id sequence
ALTER SEQUENCE cases_simple_id_seq RESTART WITH 1;