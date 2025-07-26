-- Reset all cases that are stuck in progress back to uploaded
UPDATE cases 
SET status = 'uploaded' 
WHERE status = 'in_progress';