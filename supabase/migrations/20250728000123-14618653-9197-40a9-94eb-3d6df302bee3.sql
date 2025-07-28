-- Add RLS policy for admins to delete cases
CREATE POLICY "Admins can delete all cases" ON public.cases
FOR DELETE 
USING (get_current_user_role() = 'admin');