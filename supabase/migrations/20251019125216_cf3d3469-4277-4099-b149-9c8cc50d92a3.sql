-- Backfill user_roles for any clinic users without roles
-- Cast through text since user_role and app_role are different enum types
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, p.role::text::app_role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
WHERE ur.user_id IS NULL
  AND p.role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;