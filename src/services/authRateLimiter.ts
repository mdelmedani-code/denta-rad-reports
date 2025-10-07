import { supabase } from '@/integrations/supabase/client';

export interface RateLimitResult {
  allowed: boolean;
  lockoutMinutes?: number;
  attempts?: number;
}

export async function checkLoginRateLimit(email: string): Promise<RateLimitResult> {
  try {
    const { data, error } = await supabase
      .rpc('is_account_locked', { p_email: email });
    
    if (error) {
      console.error('Rate limit check error:', error);
      // Fail secure - allow login but log
      return { allowed: true };
    }
    
    if (data && data.length > 0) {
      const result = data[0];
      
      if (result.locked) {
        const unlockAt = new Date(result.unlock_at);
        const minutesRemaining = Math.ceil(
          (unlockAt.getTime() - Date.now()) / 60000
        );
        
        return {
          allowed: false,
          lockoutMinutes: minutesRemaining,
          attempts: result.attempts
        };
      }
    }
    
    return { allowed: true };
    
  } catch (error) {
    console.error('Rate limit error:', error);
    return { allowed: true }; // Fail open (but log for monitoring)
  }
}

export async function recordLoginAttempt(
  email: string,
  successful: boolean,
  ipAddress?: string
) {
  try {
    await supabase.rpc('record_login_attempt', {
      p_email: email,
      p_successful: successful,
      p_ip_address: ipAddress || null,
      p_user_agent: navigator.userAgent
    });
  } catch (error) {
    console.error('Failed to record login attempt:', error);
  }
}

// Get user's IP address (best effort)
export async function getUserIPAddress(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const data = await response.json();
    return data.ip;
  } catch {
    return null;
  }
}
