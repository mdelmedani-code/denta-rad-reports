import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
  stats?: {
    totalFiles: number;
    dicomFiles: number;
    compressionRatio: number;
  };
}

const MAX_SIZE = 500 * 1024 * 1024; // 500MB
const MIN_SIZE = 1 * 1024 * 1024; // 1MB
const MAX_COMPRESSION_RATIO = 100; // Prevent zip bombs
const MAX_FILES_IN_ZIP = 10000; // Prevent resource exhaustion

export async function validateDICOMZip(file: File): Promise<FileValidationResult> {
  const warnings: string[] = [];
  
  // 1. Check file extension
  if (!file.name.toLowerCase().endsWith('.zip')) {
    return {
      valid: false,
      error: 'Only ZIP files are allowed. Please upload a ZIP archive containing DICOM files.'
    };
  }
  
  // 2. Check file size limits
  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds 500MB limit.`
    };
  }
  
  if (file.size < MIN_SIZE) {
    return {
      valid: false,
      error: 'File is suspiciously small for a DICOM scan. Minimum size is 1MB.'
    };
  }
  
  // 3. Check ZIP magic bytes
  try {
    const buffer = await file.slice(0, 4).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // ZIP files start with "PK" (0x50 0x4B)
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4B) {
      return {
        valid: false,
        error: 'File is not a valid ZIP archive. Please ensure you are uploading a ZIP file.'
      };
    }
  } catch (error) {
    return {
      valid: false,
      error: 'Failed to read file. Please try again.'
    };
  }
  
  // 4. Validate ZIP contents
  try {
    const zip = await JSZip.loadAsync(file);
    const entries = Object.values(zip.files);
    
    // Check number of files
    if (entries.length > MAX_FILES_IN_ZIP) {
      return {
        valid: false,
        error: `ZIP contains too many files (${entries.length}). Maximum allowed is ${MAX_FILES_IN_ZIP}.`
      };
    }
    
    if (entries.length === 0) {
      return {
        valid: false,
        error: 'ZIP file is empty.'
      };
    }
    
    // Calculate total uncompressed size (zip bomb detection)
    let totalUncompressed = 0;
    let totalFiles = 0;
    
    for (const entry of entries) {
      if (!entry.dir) {
        totalFiles++;
        // Access internal data safely
        const entryData = (entry as any)._data;
        totalUncompressed += entryData?.uncompressedSize || 0;
      }
    }
    
    // Check compression ratio
    const compressionRatio = totalUncompressed / file.size;
    if (compressionRatio > MAX_COMPRESSION_RATIO) {
      return {
        valid: false,
        error: `Suspicious compression ratio (${compressionRatio.toFixed(1)}:1) detected. Possible zip bomb attack.`
      };
    }
    
    // Check for path traversal
    for (const entry of entries) {
      const name = entry.name;
      
      if (name.includes('..') || name.startsWith('/') || name.includes('\\..\\')) {
        return {
          valid: false,
          error: `Invalid file path detected: ${name}. Path traversal attempts are not allowed.`
        };
      }
      
      // Check for absolute paths (Windows)
      if (/^[A-Za-z]:/.test(name)) {
        return {
          valid: false,
          error: `Absolute file paths are not allowed: ${name}`
        };
      }
    }
    
    // Check for forbidden file types
    const forbiddenExtensions = [
      '.exe', '.sh', '.bat', '.cmd', '.scr', '.com',
      '.js', '.vbs', '.jar', '.app', '.dmg', '.deb',
      '.rpm', '.msi', '.dll', '.so', '.dylib'
    ];
    
    for (const entry of entries) {
      if (entry.dir) continue;
      
      const lower = entry.name.toLowerCase();
      for (const ext of forbiddenExtensions) {
        if (lower.endsWith(ext)) {
          return {
            valid: false,
            error: `Forbidden file type detected: ${entry.name}. Executable files are not allowed.`
          };
        }
      }
    }
    
    // 5. Validate DICOM content
    let dicomFileCount = 0;
    const maxFilesToCheck = Math.min(20, totalFiles); // Check up to 20 files
    let filesChecked = 0;
    
    for (const entry of entries) {
      if (entry.dir) continue;
      if (filesChecked >= maxFilesToCheck) break;
      
      const name = entry.name.toLowerCase();
      
      // DICOM files typically have .dcm extension or no extension
      const isDicomCandidate = 
        name.endsWith('.dcm') || 
        (!name.includes('.') && name.length > 0);
      
      if (isDicomCandidate) {
        filesChecked++;
        
        try {
          const content = await entry.async('uint8array');
          
          // Check DICOM magic bytes
          // DICOM Part 10 files have "DICM" at offset 128
          if (content.length > 132) {
            const dicm = String.fromCharCode(
              content[128], content[129], content[130], content[131]
            );
            
            if (dicm === 'DICM') {
              dicomFileCount++;
              
              // Additional DICOM validation
              // Check for File Meta Information Group Length (0002,0000)
              const hasMetaInfo = 
                content[132] === 0x02 && content[133] === 0x00 &&
                content[134] === 0x00 && content[135] === 0x00;
              
              if (!hasMetaInfo) {
                warnings.push(`File ${entry.name} has DICM header but invalid meta information`);
              }
            }
          }
        } catch (error) {
          warnings.push(`Could not read file: ${entry.name}`);
        }
      }
    }
    
    // Must contain at least one valid DICOM file
    if (dicomFileCount === 0) {
      return {
        valid: false,
        error: 'No valid DICOM files found in ZIP archive. Please ensure your ZIP contains DICOM scan files.'
      };
    }
    
    // Success
    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
      stats: {
        totalFiles,
        dicomFiles: dicomFileCount,
        compressionRatio: Math.round(compressionRatio * 10) / 10
      }
    };
    
  } catch (error) {
    console.error('ZIP validation error:', error);
    return {
      valid: false,
      error: 'Failed to validate ZIP contents. The file may be corrupted or invalid.'
    };
  }
}

// Helper function to get readable file size
export function getReadableFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Validate individual file before processing
export function isValidDICOMExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith('.zip');
}

// Rate limiting functions
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
