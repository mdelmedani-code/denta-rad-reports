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
    console.log(`Starting parallel upload of ${fileArray.length} files`);
    
    if (onProgress) {
      onProgress({
        bytesUploaded: 0,
        bytesTotal: fileArray.reduce((sum, f) => sum + f.size, 0),
        percentage: 0,
        stage: 'uploading'
      });
    }
    
    // Upload all files in parallel with concurrency limit
    const BATCH_SIZE = 5; // Process 5 files at a time to avoid overwhelming the server
    const uploadResults = [];
    const totalSize = fileArray.reduce((sum, f) => sum + f.size, 0);
    let completedSize = 0;
    
    for (let i = 0; i < fileArray.length; i += BATCH_SIZE) {
      const batch = fileArray.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(fileArray.length/BATCH_SIZE)}: ${batch.length} files`);
      
      const batchPromises = batch.map(async (file, batchIndex) => {
        const globalIndex = i + batchIndex;
        console.log(`Uploading file ${globalIndex + 1}/${fileArray.length}: ${file.name}`);
        
        const result = await uploadDirectToOrthanc(file);
        
        if (result.success) {
          completedSize += file.size;
          
          // Update overall progress after each completed file
          if (onProgress) {
            onProgress({
              bytesUploaded: completedSize,
              bytesTotal: totalSize,
              percentage: Math.round((completedSize / totalSize) * 100),
              stage: completedSize === totalSize ? 'complete' : 'uploading'
            });
          }
        }
        
        return result;
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      // Check for any failures in this batch
      const failed = batchResults.find(r => !r.success);
      if (failed) {
        throw new Error(failed.error || 'Batch upload failed');
      }
      
      uploadResults.push(...batchResults);
    }
    
    // Return info from first uploaded file
    const firstResult = uploadResults[0];
    
    if (onProgress) {
      onProgress({
        bytesUploaded: totalSize,
        bytesTotal: totalSize,
        percentage: 100,
        stage: 'complete'
      });
    }
    
    console.log(`Successfully uploaded ${uploadResults.length} files to Orthanc`);
    
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
 * Upload file directly to Orthanc via edge function with retry logic
 */
const uploadDirectToOrthanc = async (
  file: File,
  onProgress?: (progress: UploadProgress) => void,
  retryCount: number = 0
): Promise<UploadResult> => {
  const maxRetries = 3;
  const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
  
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
      
      // If it's a server error and we haven't exhausted retries, try again
      if (response.status >= 500 && retryCount < maxRetries) {
        console.log(`Upload attempt ${retryCount + 1} failed, retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return uploadDirectToOrthanc(file, onProgress, retryCount + 1);
      }
      
      throw new Error(`Upload failed after ${retryCount + 1} attempts: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      // If it's a connection error and we haven't exhausted retries, try again
      if (data.error?.includes('error sending request') && retryCount < maxRetries) {
        console.log(`Upload attempt ${retryCount + 1} failed with connection error, retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return uploadDirectToOrthanc(file, onProgress, retryCount + 1);
      }
      
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
    console.error(`Direct upload error (attempt ${retryCount + 1}):`, error);
    
    // If it's a network error and we haven't exhausted retries, try again
    if (retryCount < maxRetries && (
      error instanceof TypeError || 
      (error instanceof Error && error.message.includes('fetch'))
    )) {
      console.log(`Upload attempt ${retryCount + 1} failed with network error, retrying in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return uploadDirectToOrthanc(file, onProgress, retryCount + 1);
    }
    
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
  console.log('=== STARTING UPLOAD AND CASE CREATION ===');
  
  // Upload to Orthanc using new service
  const uploadResult = await uploadDICOMFiles(files, 'temp-case-id', (progress) => {
    if (onProgress) {
      // Reserve 10% for case creation
      const uploadProgress = Math.round(progress.percentage * 0.9);
      onProgress({
        ...progress,
        percentage: uploadProgress,
        stage: progress.stage === 'complete' ? 'processing' : progress.stage
      });
    }
  });
  
  if (!uploadResult.success) {
    throw new Error(`DICOM upload failed: ${uploadResult.error}`);
  }
  
  console.log('Upload successful, creating case record...');
  
  // Update progress for case creation
  if (onProgress) {
    onProgress({
      bytesUploaded: 0,
      bytesTotal: 0,
      percentage: 95,
      stage: 'processing'
    });
  }
  
  try {
    // Create the case record in Supabase with proper PACS identifiers
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .insert({
        patient_name: patientData.patientName,
        patient_internal_id: patientData.patientInternalId || null,
        patient_dob: patientData.patientDob || null,
        clinical_question: patientData.clinicalQuestion,
        field_of_view: patientData.fieldOfView as any,
        urgency: patientData.urgency as any,
        clinic_id: patientData.clinicId,
        study_instance_uid: uploadResult.studyInstanceUID, // This is the key for PACS retrieval
        orthanc_study_id: uploadResult.orthancId,
        orthanc_series_id: uploadResult.seriesInstanceUID,
        orthanc_instance_ids: uploadResult.sopInstanceUID ? [uploadResult.sopInstanceUID] : null,
        status: 'uploaded' as any
      })
      .select()
      .maybeSingle();
    
    if (caseError) {
      console.error('Case creation error:', caseError);
      throw new Error(`Failed to create case record: ${caseError.message}`);
    }
    
    console.log('Case created successfully:', caseData);
    
    // Final progress update
    if (onProgress) {
      onProgress({
        bytesUploaded: 0,
        bytesTotal: 0,
        percentage: 100,
        stage: 'complete'
      });
    }
    
    return {
      caseId: caseData.id,
      orthancResult: uploadResult,
      studyInstanceUID: uploadResult.studyInstanceUID,
      message: `Successfully uploaded to PACS and created case. Study UID: ${uploadResult.studyInstanceUID}`
    };
    
  } catch (error) {
    console.error('Case creation failed:', error);
    throw new Error(`Upload successful but case creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};