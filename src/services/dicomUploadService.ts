import { supabase } from "@/integrations/supabase/client";
import * as tus from "tus-js-client";

export interface UploadResult {
  success: boolean;
  studyInstanceUID?: string;
  seriesInstanceUID?: string;
  sopInstanceUID?: string;
  orthancId?: string;
  error?: string;
  progress?: number;
}

export interface UploadProgress {
  bytesUploaded: number;
  bytesTotal: number;
  percentage: number;
  stage: 'uploading' | 'processing' | 'complete' | 'error';
}

const SMALL_FILE_THRESHOLD = 6 * 1024 * 1024; // 6MB
const SUPABASE_PROJECT_ID = 'swusayoygknritombbwg';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3dXNheW95Z2tucml0b21iYndnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTkzMjEsImV4cCI6MjA2OTAzNTMyMX0.sOAz9isiZUp8BmFVDQRV-G16iWc0Rk8mM9obUKko2dY';

/**
 * Upload DICOM files directly to Orthanc via edge function
 */
export const uploadDICOMFiles = async (
  files: File | File[],
  caseId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  const fileArray = Array.isArray(files) ? files : [files];
  
  try {
    const uploadResults = [];
    
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      console.log(`Processing file ${i + 1}/${fileArray.length}: ${file.name}, size: ${file.size} bytes`);
      
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.dcm') && file.type !== 'application/dicom') {
        console.warn(`File ${file.name} may not be a DICOM file`);
      }
      
      // Upload directly to Orthanc via edge function
      const result = await uploadDirectToOrthanc(file, onProgress);
      
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }
      
      uploadResults.push(result);
    }
    
    // Return info from first uploaded file
    const firstResult = uploadResults[0];
    
    if (onProgress) {
      onProgress({
        bytesUploaded: fileArray.reduce((sum, f) => sum + f.size, 0),
        bytesTotal: fileArray.reduce((sum, f) => sum + f.size, 0),
        percentage: 100,
        stage: 'complete'
      });
    }
    
    return {
      success: true,
      orthancId: firstResult.orthancId,
      studyInstanceUID: firstResult.studyInstanceUID,
      seriesInstanceUID: firstResult.seriesInstanceUID,
      sopInstanceUID: firstResult.sopInstanceUID
    };
    
  } catch (error) {
    console.error('DICOM upload error:', error);
    
    if (onProgress) {
      onProgress({
        bytesUploaded: 0,
        bytesTotal: fileArray.reduce((sum, f) => sum + f.size, 0),
        percentage: 0,
        stage: 'error'
      });
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
};

/**
 * Upload file directly to Orthanc via edge function
 */
const uploadDirectToOrthanc = async (
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  try {
    if (onProgress) {
      onProgress({
        bytesUploaded: 0,
        bytesTotal: file.size,
        percentage: 0,
        stage: 'uploading'
      });
    }
    
    // Create FormData with the file
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', file.name);
    
    // Call edge function with binary data
    const response = await fetch(`https://swusayoygknritombbwg.supabase.co/functions/v1/direct-dicom-upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: formData
    });
    
    if (onProgress) {
      onProgress({
        bytesUploaded: file.size * 0.8,
        bytesTotal: file.size,
        percentage: 80,
        stage: 'processing'
      });
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Upload failed');
    }
    
    if (onProgress) {
      onProgress({
        bytesUploaded: file.size,
        bytesTotal: file.size,
        percentage: 100,
        stage: 'complete'
      });
    }
    
    return {
      success: true,
      orthancId: data.orthancId,
      studyInstanceUID: data.studyInstanceUID,
      seriesInstanceUID: data.seriesInstanceUID,
      sopInstanceUID: data.sopInstanceUID
    };
    
  } catch (error) {
    console.error('Direct upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Direct upload failed'
    };
  }
};

/**
 * Create case record and integrate with existing workflow
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
  // Upload to Orthanc using new service
  const uploadResult = await uploadDICOMFiles(files, 'temp-case-id', onProgress);
  
  if (!uploadResult.success) {
    throw new Error(`DICOM upload failed: ${uploadResult.error}`);
  }
  
  return {
    orthancResult: uploadResult,
    studyInstanceUID: uploadResult.studyInstanceUID,
    message: `Successfully uploaded to PACS. Study UID: ${uploadResult.studyInstanceUID}`
  };
};