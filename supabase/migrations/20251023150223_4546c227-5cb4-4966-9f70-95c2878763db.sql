-- Undo Phase 2 and Phase 3 changes

-- Drop tables added in Phase 3
DROP TABLE IF EXISTS backup_monitoring CASCADE;
DROP TABLE IF EXISTS data_retention_policies CASCADE;

-- Drop table added in Phase 2
DROP TABLE IF EXISTS report_templates CASCADE;