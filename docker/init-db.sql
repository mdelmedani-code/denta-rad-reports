-- Initialize DentaRad PACS Database
-- This script runs automatically when PostgreSQL starts for the first time

-- Set timezone
SET timezone = 'UTC';

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant permissions to orthanc user
GRANT ALL PRIVILEGES ON DATABASE orthanc TO orthanc;
GRANT ALL PRIVILEGES ON SCHEMA public TO orthanc;

-- Create audit table for tracking access
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id VARCHAR(255),
    action VARCHAR(50),
    resource VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    study_instance_uid VARCHAR(255),
    series_instance_uid VARCHAR(255),
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_study ON audit_log(study_instance_uid);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);

-- Create function to log DICOM access
CREATE OR REPLACE FUNCTION log_dicom_access(
    p_user_id VARCHAR(255),
    p_action VARCHAR(50),
    p_resource VARCHAR(255),
    p_ip_address INET DEFAULT NULL,
    p_study_uid VARCHAR(255) DEFAULT NULL,
    p_series_uid VARCHAR(255) DEFAULT NULL,
    p_success BOOLEAN DEFAULT TRUE,
    p_error_message TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_log (
        user_id, action, resource, ip_address, 
        study_instance_uid, series_instance_uid, 
        success, error_message
    ) VALUES (
        p_user_id, p_action, p_resource, p_ip_address,
        p_study_uid, p_series_uid,
        p_success, p_error_message
    );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions on audit functions
GRANT EXECUTE ON FUNCTION log_dicom_access TO orthanc;
GRANT ALL ON TABLE audit_log TO orthanc;
GRANT ALL ON SEQUENCE audit_log_id_seq TO orthanc;

-- Insert initial setup log
INSERT INTO audit_log (user_id, action, resource, success) 
VALUES ('system', 'SETUP', 'database_initialized', TRUE);