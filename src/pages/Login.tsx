import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";
import { validatePasswordStrength } from "@/utils/passwordStrength";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn } = useAuth();

  useEffect(() => {
    // Check if user is already logged in and route based on role to avoid loops
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Look up role from user_roles
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (roleData?.role === 'clinic') {
        navigate("/dashboard");
        return;
      }

      if (roleData?.role === 'admin') {
        // Send admins to admin area to prevent /login <> /dashboard loop
        navigate("/reporter", { replace: true });
        return;
      }

      // Unknown/non-clinic role: sign out so clinic login page stays usable
      setError("You are logged in with a non-clinic account. Please use Admin Login or sign in with a clinic account.");
      await supabase.auth.signOut();
    };
    checkUser();
  }, [navigate]);

  // Ensure the login page waits for initial auth state to settle
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().finally(() => {
      if (mounted) setIsCheckingAuth(false);
    });
    return () => { mounted = false; };
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (isSignUp) {
        // Validate password strength for sign up
        const strength = validatePasswordStrength(password);
        if (!strength.valid) {
          setError(strength.errors[0] || 'Please choose a stronger password');
          setIsLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`
          }
        });
        
        if (error) throw error;
        
        toast({
          title: "Registration successful",
          description: "Please check your email to confirm your account.",
        });
      } else {
        // Use the useAuth signIn method which includes rate limiting
        const { data, error } = await signIn(email, password);
        
        if (error) throw error;
        
        // Determine role and route accordingly
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data?.user?.id)
          .maybeSingle();
        
        toast({
          title: "Login successful",
          description: "Welcome back!",
        });
        navigate(roleData?.role === 'admin' ? "/reporter" : "/dashboard", { replace: true });
      }
    } catch (error: any) {
      setError(error.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first");
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      toast({
        title: "Password reset email sent",
        description: "Check your email for reset instructions.",
      });
    } catch (error: any) {
      setError(error.message || "An error occurred");
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4">
      <div className="absolute top-6 left-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {isSignUp ? "Create Account" : "Clinic Login"}
          </CardTitle>
          <CardDescription className="text-center">
            {isSignUp 
              ? "Register your clinic for secure CBCT reporting access"
              : "Access your secure clinic portal"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="clinic@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {isSignUp && (
                <div className="mt-2">
                  <PasswordStrengthMeter password={password} />
                </div>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <div className="mt-4 space-y-2">
            <Button
              variant="link"
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-sm"
            >
              {isSignUp 
                ? "Already have an account? Sign in"
                : "Need an account? Register here"
              }
            </Button>
            
            {!isSignUp && (
              <Button
                variant="link"
                onClick={handleForgotPassword}
                className="w-full text-sm text-muted-foreground"
              >
                Forgot your password?
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;