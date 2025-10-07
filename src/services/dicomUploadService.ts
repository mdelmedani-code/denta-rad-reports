/**
 * @deprecated This service is deprecated as of the Orthanc PACS removal.
 * Upload logic has been moved to the UploadCase.tsx component.
 * 
 * New workflow:
 * - Users upload ZIP files OR individual DICOM files
 * - Individual files are auto-zipped in the browser using JSZip
 * - Single ZIP is uploaded to Supabase Storage
 * - Edge function (extract-dicom-zip) extracts metadata
 * 
 * DO NOT USE THESE FUNCTIONS FOR NEW DEVELOPMENT.
 */

import { supabase } from "@/integrations/supabase/client";

export interface UploadResult {
  success: boolean;
  storagePaths?: string[];
  error?: string;
  progress?: number;
}

export interface UploadProgress {
  bytesUploaded: number;
  bytesTotal: number;
  percentage: number;
  stage: 'uploading' | 'processing' | 'complete' | 'error';
}

/**
 * @deprecated Use UploadCase component's handleSubmit instead
 * This function uploads files individually, which is no longer the recommended approach.
 */
export const uploadDICOMFiles = async (
  files: File | File[],
  caseId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  console.warn('⚠️ uploadDICOMFiles is deprecated. Use UploadCase component with ZIP upload instead.');
  
  throw new Error(
    'This function is deprecated. Please use the new ZIP-based upload in UploadCase.tsx. ' +
    'Individual file uploads are no longer supported.'
  );
};

/**
 * @deprecated Use UploadCase component's handleSubmit instead
 * This function is part of the old upload flow.
 */
export const uploadDICOMAndCreateCase = async (
  files: File | File[],
  patientData: {
    patientName: string;
    patientInternalId?: string;
    patientDob?: string;
    clinicalQuestion: string;
    fieldOfView: string;
    urgency: string;
    clinicId: string;
  },
  onProgress?: (progress: UploadProgress) => void
) => {
  console.warn('⚠️ uploadDICOMAndCreateCase is deprecated. Use UploadCase component with ZIP upload instead.');
  
  throw new Error(
    'This function is deprecated. Please use the new ZIP-based upload in UploadCase.tsx. ' +
    'The new workflow creates a ZIP from individual files in the browser, then uploads the ZIP.'
  );
};

// Utility functions (kept for potential reuse)

/**
 * Validate if a file is a DICOM file based on extension
 */
export function validateDICOMFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.dcm') || name.endsWith('.dicom') || !name.includes('.');
}

/**
 * Validate total file size
 */
export function validateFileSize(files: File[], maxSizeMB: number = 500): boolean {
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  return totalSize <= maxSizeMB * 1024 * 1024;
}

/**
 * Calculate total size of files in MB
 */
export function calculateTotalSizeMB(files: File[]): number {
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  return totalBytes / 1024 / 1024;
}
