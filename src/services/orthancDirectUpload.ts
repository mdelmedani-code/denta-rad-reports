import { getCurrentPACSConfig } from "@/config/pacs";
import { supabase } from "@/integrations/supabase/client";

export interface OrthancUploadResult {
  success: boolean;
  studyInstanceUID?: string;
  seriesInstanceUID?: string;
  sopInstanceUID?: string;
  orthancId?: string;
  error?: string;
}

/**
 * Upload DICOM file(s) directly to Orthanc PACS server
 */
export const uploadToOrthancPACS = async (
  files: File | File[],
  caseId: string
): Promise<OrthancUploadResult> => {
  const pacsConfig = getCurrentPACSConfig();
  
  try {
    const fileArray = Array.isArray(files) ? files : [files];
    const uploadResults = [];
    
    for (const file of fileArray) {
      console.log(`Uploading ${file.name} to Orthanc PACS via proxy...`);
      
      console.log(`Processing file: ${file.name}, size: ${file.size} bytes`);
      
      // Check file size limit (5MB) - Conservative limit for Supabase Edge Functions
      const MAX_EDGE_PAYLOAD = 5 * 1024 * 1024; // 5MB
      if (file.size > MAX_EDGE_PAYLOAD) {
        throw new Error(`File ${file.name} exceeds maximum allowed size of 5MB. Large files are not supported due to platform limitations.`);
      }
      
      try {
        // Convert file to base64 for edge function
        console.log(`File object:`, {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        });
        
        // Check if file is still accessible
        if (!file || file.size === 0) {
          throw new Error(`File ${file.name} is not accessible or empty`);
        }
        
        const fileBuffer = await file.arrayBuffer();
        console.log(`File buffer created, size: ${fileBuffer.byteLength} bytes`);
        
        // Efficient base64 conversion using built-in methods
        const bytes = new Uint8Array(fileBuffer);
        const base64File = btoa(String.fromCharCode(...bytes));
        console.log(`Base64 conversion complete, original: ${fileBuffer.byteLength}, base64: ${base64File.length}`);
        
        // Use Supabase Edge Function as proxy to avoid CORS/Mixed Content issues
        const { data, error: functionError } = await supabase.functions.invoke('orthanc-proxy', {
          body: {
            fileName: file.name,
            fileData: base64File,
            contentType: file.type
          }
        });
        
        if (functionError) {
          throw new Error(`Upload failed for ${file.name}: ${functionError.message}`);
        }
        
        if (!data) {
          throw new Error(`Upload failed for ${file.name}: No data returned`);
        }
        
        uploadResults.push(data);
        console.log(`Successfully uploaded ${file.name}:`, data);
        
      } catch (conversionError) {
        console.error('File conversion error:', conversionError);
        throw new Error(`Failed to process file ${file.name}: ${conversionError instanceof Error ? conversionError.message : 'Unknown error'}`);
      }
    }
    
    // Return info from first uploaded file
    const firstResult = uploadResults[0];
    
    console.log('First upload result:', firstResult);
    
    return {
      success: true,
      orthancId: firstResult.ID,
      studyInstanceUID: firstResult.ParentStudy, // Use ParentStudy instead of StudyInstanceUID
      seriesInstanceUID: firstResult.ParentSeries, // Use ParentSeries instead of SeriesInstanceUID  
      sopInstanceUID: firstResult.ID // Use the instance ID itself
    };
    
  } catch (error) {
    console.error('Orthanc upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
};

/**
 * Get all studies from Orthanc PACS
 */
export const getOrthancStudies = async (): Promise<any[]> => {
  const pacsConfig = getCurrentPACSConfig();
  
  try {
    const response = await fetch(`http://116.203.35.168:8042/studies`, {
      headers: {
        'Authorization': pacsConfig.auth.headers.Authorization,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch studies: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching Orthanc studies:', error);
    return [];
  }
};

/**
 * Get study details from Orthanc
 */
export const getOrthancStudyDetails = async (studyId: string): Promise<any> => {
  const pacsConfig = getCurrentPACSConfig();
  
  try {
    const response = await fetch(`http://116.203.35.168:8042/studies/${studyId}`, {
      headers: {
        'Authorization': pacsConfig.auth.headers.Authorization,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch study details: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching study details:', error);
    return null;
  }
};

/**
 * Upload file and integrate with DentaRad case management
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
  }
) => {
  // Upload to Orthanc PACS
  const uploadResult = await uploadToOrthancPACS(files, 'temp-case-id');
  
  if (!uploadResult.success) {
    throw new Error(`PACS upload failed: ${uploadResult.error}`);
  }
  
  return {
    orthancResult: uploadResult,
    studyInstanceUID: uploadResult.studyInstanceUID,
    message: `Successfully uploaded to PACS. Study UID: ${uploadResult.studyInstanceUID}`
  };
};