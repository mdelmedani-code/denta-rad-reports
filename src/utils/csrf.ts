import { supabase } from '@/integrations/supabase/client';

const CSRF_TOKEN_KEY = 'csrf_token';
const CSRF_EXPIRY_KEY = 'csrf_expiry';
const TOKEN_LIFETIME_MS = 60 * 60 * 1000; // 1 hour

export async function getCSRFToken(): Promise<string> {
  // Check if we have a valid token in session storage
  const storedToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
  const storedExpiry = sessionStorage.getItem(CSRF_EXPIRY_KEY);
  
  if (storedToken && storedExpiry) {
    const expiryTime = parseInt(storedExpiry, 10);
    
    if (Date.now() < expiryTime) {
      // Token is still valid
      return storedToken;
    }
  }
  
  // Generate new token
  const token = crypto.randomUUID();
  const expiry = Date.now() + TOKEN_LIFETIME_MS;
  
  sessionStorage.setItem(CSRF_TOKEN_KEY, token);
  sessionStorage.setItem(CSRF_EXPIRY_KEY, expiry.toString());
  
  // Store token hash in database for verification
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    await supabase
      .from('profiles')
      .update({ 
        csrf_token: token,
        csrf_token_expires_at: new Date(expiry).toISOString()
      })
      .eq('id', user.id);
  }
  
  return token;
}

export function clearCSRFToken(): void {
  sessionStorage.removeItem(CSRF_TOKEN_KEY);
  sessionStorage.removeItem(CSRF_EXPIRY_KEY);
}

export async function verifyCSRFToken(token: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('csrf_token, csrf_token_expires_at')
      .eq('id', user.id)
      .single();
    
    if (!profile?.csrf_token || !profile?.csrf_token_expires_at) {
      return false;
    }
    
    // Check token matches
    if (profile.csrf_token !== token) {
      return false;
    }
    
    // Check not expired
    const expiryTime = new Date(profile.csrf_token_expires_at).getTime();
    if (Date.now() >= expiryTime) {
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('CSRF verification error:', error);
    return false;
  }
}
