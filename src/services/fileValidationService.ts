import { supabase } from '@/integrations/supabase/client';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_EXTENSIONS = ['.zip', '.dcm', '.dicom'];

// Magic bytes for file type validation
const FILE_SIGNATURES: Record<string, number[]> = {
  zip: [0x50, 0x4B, 0x03, 0x04], // PK..
  zip_empty: [0x50, 0x4B, 0x05, 0x06], // PK.. (empty archive)
  zip_spanned: [0x50, 0x4B, 0x07, 0x08], // PK.. (spanned archive)
};

async function readFileHeader(file: File): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const arr = new Uint8Array(e.target?.result as ArrayBuffer);
      resolve(Array.from(arr.slice(0, 4)));
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file.slice(0, 4));
  });
}

function matchesSignature(header: number[], signature: number[]): boolean {
  return signature.every((byte, i) => header[i] === byte);
}

export async function validateFile(file: File): Promise<{
  valid: boolean;
  error?: string;
}> {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 500MB limit. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  // Check file extension
  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  // Check magic bytes for ZIP files
  if (extension === '.zip') {
    try {
      const header = await readFileHeader(file);
      const isValidZip = Object.values(FILE_SIGNATURES).some(sig => 
        matchesSignature(header, sig)
      );
      
      if (!isValidZip) {
        return {
          valid: false,
          error: 'File appears to be corrupted or not a valid ZIP archive',
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: 'Unable to validate file format',
      };
    }
  }

  return { valid: true };
}

export async function checkUploadRateLimit(): Promise<{
  allowed: boolean;
  remaining: number;
  error?: string;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { allowed: false, remaining: 0, error: 'Not authenticated' };
    }

    // Check rate limit using database function
    const { data, error } = await supabase.rpc('check_upload_rate_limit', {
      _user_id: user.id
    });

    if (error) throw error;

    if (!data) {
      // Get current count
      const { data: uploads, error: countError } = await supabase
        .from('upload_rate_limits')
        .select('id')
        .eq('user_id', user.id)
        .gte('upload_timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (countError) throw countError;

      const count = uploads?.length || 0;
      const remaining = Math.max(0, 20 - count);

      return {
        allowed: count < 20,
        remaining,
        error: count >= 20 ? 'Upload limit reached (20 uploads per 24 hours)' : undefined,
      };
    }

    return {
      allowed: data,
      remaining: data ? 20 : 0,
      error: data ? undefined : 'Upload limit reached (20 uploads per 24 hours)',
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    return {
      allowed: false,
      remaining: 0,
      error: 'Unable to verify upload limit',
    };
  }
}

export async function recordUpload(fileSize: number, fileType: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('upload_rate_limits').insert({
      user_id: user.id,
      file_size: fileSize,
      file_type: fileType,
    });
  } catch (error) {
    console.error('Failed to record upload:', error);
  }
}
