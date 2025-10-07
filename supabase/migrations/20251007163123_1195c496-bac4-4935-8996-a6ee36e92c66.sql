-- =====================================================
-- Verify and Strengthen RLS Policies
-- =====================================================

-- Ensure RLS is enabled on all sensitive tables
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Function to test RLS policies (for security testing)
CREATE OR REPLACE FUNCTION test_rls_policies()
RETURNS TABLE(
  table_name TEXT,
  rls_enabled BOOLEAN,
  policy_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.relname::TEXT as table_name,
    c.relrowsecurity as rls_enabled,
    COUNT(p.polname) as policy_count
  FROM pg_class c
  LEFT JOIN pg_policy p ON p.polrelid = c.oid
  WHERE c.relname IN ('cases', 'reports', 'profiles', 'security_audit_log')
  GROUP BY c.relname, c.relrowsecurity
  ORDER BY c.relname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION test_rls_policies TO authenticated;

COMMENT ON FUNCTION test_rls_policies IS 'Verify RLS is enabled and policies exist on all sensitive tables';