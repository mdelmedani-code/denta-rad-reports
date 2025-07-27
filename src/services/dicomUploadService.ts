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
 * Upload DICOM files using the most appropriate method based on file size
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
      
      let result: UploadResult;
      
      if (file.size <= SMALL_FILE_THRESHOLD) {
        // Use direct upload for smaller files
        result = await uploadSmallFile(file, caseId, onProgress);
      } else {
        // Use resumable upload for larger files
        result = await uploadLargeFile(file, caseId, onProgress);
      }
      
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
 * Upload small files directly using Supabase Storage
 */
const uploadSmallFile = async (
  file: File,
  caseId: string,
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
    
    // Upload to Supabase Storage
    const fileName = `${caseId}/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('cbct-scans')
      .upload(fileName, file, {
        contentType: 'application/dicom',
        upsert: false
      });
    
    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }
    
    if (onProgress) {
      onProgress({
        bytesUploaded: file.size * 0.7,
        bytesTotal: file.size,
        percentage: 70,
        stage: 'processing'
      });
    }
    
    // Process the uploaded file
    const result = await processUploadedFile(uploadData.path, file.name, onProgress);
    
    return result;
    
  } catch (error) {
    console.error('Small file upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Small file upload failed'
    };
  }
};

/**
 * Upload large files using TUS resumable upload
 */
const uploadLargeFile = async (
  file: File,
  caseId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  return new Promise((resolve) => {
    const fileName = `${caseId}/${Date.now()}-${file.name}`;
    
    const upload = new tus.Upload(file, {
      endpoint: `https://${SUPABASE_PROJECT_ID}.supabase.co/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      metadata: {
        filename: file.name,
        contentType: 'application/dicom',
        bucketName: 'cbct-scans',
        objectName: fileName,
      },
      headers: {
        authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      onError: (error) => {
        console.error('TUS upload failed:', error);
        resolve({
          success: false,
          error: `Resumable upload failed: ${error.message}`
        });
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const percentage = Math.round((bytesUploaded / bytesTotal) * 70); // Reserve 30% for processing
        
        if (onProgress) {
          onProgress({
            bytesUploaded,
            bytesTotal,
            percentage,
            stage: 'uploading'
          });
        }
      },
      onSuccess: async () => {
        try {
          console.log('TUS upload completed, processing file...');
          
          if (onProgress) {
            onProgress({
              bytesUploaded: file.size,
              bytesTotal: file.size,
              percentage: 70,
              stage: 'processing'
            });
          }
          
          // Process the uploaded file
          const result = await processUploadedFile(fileName, file.name, onProgress);
          resolve(result);
          
        } catch (error) {
          console.error('Post-upload processing failed:', error);
          resolve({
            success: false,
            error: error instanceof Error ? error.message : 'Post-upload processing failed'
          });
        }
      }
    });
    
    upload.start();
  });
};

/**
 * Process uploaded file and forward to Orthanc
 */
const processUploadedFile = async (
  storagePath: string,
  fileName: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  try {
    // Call edge function to process the file
    const { data, error } = await supabase.functions.invoke('process-dicom-upload', {
      body: {
        storagePath,
        fileName,
        bucketName: 'cbct-scans'
      }
    });
    
    if (error) {
      throw new Error(`Processing failed: ${error.message}`);
    }
    
    if (!data || !data.success) {
      throw new Error(data?.error || 'Processing failed');
    }
    
    if (onProgress) {
      onProgress({
        bytesUploaded: 0, // Will be set by caller
        bytesTotal: 0,    // Will be set by caller
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
    console.error('File processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'File processing failed'
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