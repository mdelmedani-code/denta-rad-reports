import { supabase } from "@/integrations/supabase/client";

/**
 * Trigger ZIP generation in background without blocking upload completion
 */
const triggerBackgroundZipGeneration = (caseId: string, filePath: string) => {
  // Fire and forget - don't await this call
  supabase.functions
    .invoke('pregenerate-case-zip', {
      body: { caseId, filePath }
    })
    .then((response) => {
      console.log('Background ZIP generation triggered:', response);
    })
    .catch((error) => {
      console.error('Failed to trigger background ZIP generation:', error);
    });
};

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
 * Upload DICOM files to Supabase storage
 */
export const uploadDICOMFiles = async (
  files: File | File[],
  caseId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  const fileArray = Array.isArray(files) ? files : [files];
  
  try {
    console.log(`Starting upload of ${fileArray.length} files to Supabase storage`);
    
    const totalSize = fileArray.reduce((sum, f) => sum + f.size, 0);
    let completedSize = 0;
    const storagePaths: string[] = [];
    
    if (onProgress) {
      onProgress({
        bytesUploaded: 0,
        bytesTotal: totalSize,
        percentage: 0,
        stage: 'uploading'
      });
    }
    
    // Upload files sequentially to track progress properly
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      console.log(`Uploading file ${i + 1}/${fileArray.length}: ${file.name}`);
      
      // Create unique file path
      const fileExt = file.name.split('.').pop() || 'dcm';
      const fileName = `${caseId}/${Date.now()}_${i}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('cbct-scans')
        .upload(fileName, file);
        
      if (uploadError) {
        throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
      }
      
      storagePaths.push(fileName);
      completedSize += file.size;
      
      if (onProgress) {
        onProgress({
          bytesUploaded: completedSize,
          bytesTotal: totalSize,
          percentage: Math.round((completedSize / totalSize) * 100),
          stage: completedSize === totalSize ? 'complete' : 'uploading'
        });
      }
    }
    
    console.log(`Successfully uploaded ${fileArray.length} files to storage`);
    
    return {
      success: true,
      storagePaths
    };
    
  } catch (error) {
    console.error('Storage upload error:', error);
    
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
 * Create case record and upload to Supabase storage
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
  
  // Create case record first to get an ID for file organization
  const tempCaseId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Upload to Supabase storage
  const uploadResult = await uploadDICOMFiles(files, tempCaseId, (progress) => {
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
    throw new Error(`File upload failed: ${uploadResult.error}`);
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
    // Create the case record in Supabase
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
        file_path: uploadResult.storagePaths?.[0] || null, // Store first file path as primary
        status: 'uploaded' as any
      })
      .select()
      .maybeSingle();
    
    if (caseError) {
      console.error('Case creation error:', caseError);
      throw new Error(`Failed to create case record: ${caseError.message}`);
    }
    
    console.log('Case created successfully:', caseData);
    
    // Trigger ZIP generation in background (don't await)
    triggerBackgroundZipGeneration(caseData.id, uploadResult.storagePaths?.[0] || '');
    
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
      uploadResult: uploadResult,
      storagePaths: uploadResult.storagePaths,
      message: `Successfully uploaded ${uploadResult.storagePaths?.length || 0} files and created case.`
    };
    
  } catch (error) {
    console.error('Case creation failed:', error);
    throw new Error(`Upload successful but case creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};