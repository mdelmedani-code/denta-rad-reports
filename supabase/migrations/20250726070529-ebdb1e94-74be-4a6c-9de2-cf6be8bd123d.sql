-- Reset test cases back to uploaded status
UPDATE cases 
SET status = 'uploaded' 
WHERE patient_name IN ('John Smith', 'Sarah Johnson');