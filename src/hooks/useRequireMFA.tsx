import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useRequireMFA() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    async function checkMFA() {
      if (!user) return;

      // Skip on MFA setup page
      if (location.pathname === '/mfa-setup') return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('mfa_enabled, mfa_enforced_at')
          .eq('id', user.id)
          .single();

        if (!profile?.mfa_enabled || !profile?.mfa_enforced_at) {
          navigate('/mfa-setup', { replace: true });
        }
      } catch (error) {
        console.error('MFA check error:', error);
      }
    }

    checkMFA();
  }, [user, navigate, location]);
}
