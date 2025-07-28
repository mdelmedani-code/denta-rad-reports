-- Add RLS policy for reporters to view all cases
CREATE POLICY "Reporters can view all cases" ON public.cases
FOR SELECT 
USING (get_current_user_role() = 'reporter');

-- Add RLS policy for reporters to update case status
CREATE POLICY "Reporters can update case status" ON public.cases
FOR UPDATE 
USING (get_current_user_role() = 'reporter');