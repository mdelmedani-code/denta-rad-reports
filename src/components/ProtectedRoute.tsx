import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRequireTerms } from "@/hooks/useRequireTerms";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'clinic' | 'admin' | 'reporter';
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const navigate = useNavigate();
  
  // Enforce security requirements for authenticated users
  useRequireTerms();
  useSessionTimeout();

  useEffect(() => {
    const checkUserRole = async () => {
      if (user) {
        try {
          // Use new user_roles table instead of profiles.role
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();
          
          setUserRole(roleData?.role || null);
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole(null);
        }
      }
      setRoleLoading(false);
    };

    if (!loading) {
      checkUserRole();
    }
  }, [user, loading]);

  useEffect(() => {
    if (!loading && !roleLoading) {
      if (!user) {
        navigate(requiredRole === 'admin' ? "/admin/login" : "/login");
      } else if (requiredRole) {
        // Check if user has required role or higher privileges
        const hasAccess = 
          userRole === requiredRole || 
          (userRole === 'admin' && (requiredRole === 'reporter' || requiredRole === 'admin')) ||
          (userRole === 'reporter' && requiredRole === 'reporter');
        
        if (!hasAccess) {
          // Redirect based on role mismatch
          if (requiredRole === 'admin' && userRole !== 'admin') {
            navigate("/admin/login");
          } else if (requiredRole === 'clinic' && userRole !== 'clinic') {
            navigate("/login");
          } else if (requiredRole === 'reporter' && userRole === 'clinic') {
            navigate("/dashboard");
          }
        }
      }
    }
  }, [user, userRole, loading, roleLoading, navigate, requiredRole]);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Check if user has access (admin has access to all, reporter has access to reporter routes)
  const hasAccess = !requiredRole || 
    userRole === requiredRole || 
    (userRole === 'admin' && (requiredRole === 'reporter' || requiredRole === 'admin')) ||
    (userRole === 'reporter' && requiredRole === 'reporter');

  if (!user || !hasAccess) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;