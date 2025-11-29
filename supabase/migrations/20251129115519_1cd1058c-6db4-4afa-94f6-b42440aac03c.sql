-- Add DELETE policy for report_snippets to allow reporters to delete snippets
CREATE POLICY "Reporters can delete snippets"
ON public.report_snippets
FOR DELETE
TO authenticated
USING (get_current_user_role() = ANY (ARRAY['admin'::text, 'reporter'::text]));