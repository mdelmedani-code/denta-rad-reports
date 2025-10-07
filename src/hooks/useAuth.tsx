import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { checkLoginRateLimit, recordLoginAttempt, getUserIPAddress } from '@/services/authRateLimiter';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Check rate limit FIRST
      const rateLimit = await checkLoginRateLimit(email);
      
      if (!rateLimit.allowed) {
        const errorMessage = `Account temporarily locked due to too many failed login attempts. ` +
          `Please try again in ${rateLimit.lockoutMinutes} minutes.`;
        
        toast({
          title: 'Account Locked',
          description: errorMessage,
          variant: 'destructive',
          duration: 10000
        });
        
        return { 
          data: null, 
          error: new Error(errorMessage) 
        };
      }
      
      // Get IP for logging
      const ipAddress = await getUserIPAddress();
      
      // Attempt login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      // Record attempt
      await recordLoginAttempt(email, !error, ipAddress || undefined);
      
      if (error) {
        toast({
          title: 'Login Failed',
          description: 'Invalid email or password',
          variant: 'destructive'
        });
        
        return { data, error };
      }
      
      return { data, error };
      
    } catch (error) {
      console.error('Sign in error:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Login failed') 
      };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, signIn }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};