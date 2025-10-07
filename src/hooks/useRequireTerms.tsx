import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useRequireTerms() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    async function checkTerms() {
      if (!user) return;

      // Skip on terms page
      if (location.pathname === '/terms-of-service') return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('terms_accepted_at, terms_version')
          .eq('id', user.id)
          .single();

        if (!profile?.terms_accepted_at) {
          navigate('/terms-of-service', { replace: true });
        }
      } catch (error) {
        console.error('Terms check error:', error);
      }
    }

    checkTerms();
  }, [user, navigate, location]);
}
