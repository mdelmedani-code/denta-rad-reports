import bcrypt from 'bcryptjs';
import { supabase } from '@/integrations/supabase/client';

export async function verifyBackupCode(inputCode: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    // Get user's backup codes
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('backup_codes')
      .eq('id', user.id)
      .single();
    
    if (error || !profile?.backup_codes) {
      throw new Error('No backup codes found');
    }
    
    const hashedCodes: string[] = Array.isArray(profile.backup_codes) ? profile.backup_codes as string[] : [];
    
    // Check each code
    for (let i = 0; i < hashedCodes.length; i++) {
      const isMatch = await bcrypt.compare(inputCode, hashedCodes[i]);
      
      if (isMatch) {
        // Remove used code
        hashedCodes.splice(i, 1);
        
        // Update database
        await supabase
          .from('profiles')
          .update({ backup_codes: hashedCodes })
          .eq('id', user.id);
        
        return true;
      }
    }
    
    return false; // No match found
    
  } catch (error) {
    console.error('Backup code verification error:', error);
    return false;
  }
}

export async function getRemainingBackupCodesCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('backup_codes')
      .eq('id', user.id)
      .single();
    
    const codes = profile?.backup_codes;
    return Array.isArray(codes) ? codes.length : 0;
  } catch {
    return 0;
  }
}
