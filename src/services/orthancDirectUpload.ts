import { getCurrentPACSConfig } from "@/config/pacs";

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
      console.log(`Uploading ${file.name} to Orthanc PACS...`);
      
      // Upload using Orthanc's REST API /instances endpoint
      const orthancUrl = `https://116.203.35.168:443/instances`;
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(orthancUrl, {
        method: 'POST',
        headers: {
          'Authorization': pacsConfig.auth.headers.Authorization
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed for ${file.name}: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      uploadResults.push(result);
      
      console.log(`Successfully uploaded ${file.name}:`, result);
    }
    
    // Return info from first uploaded file
    const firstResult = uploadResults[0];
    
    return {
      success: true,
      orthancId: firstResult.ID,
      studyInstanceUID: firstResult.StudyInstanceUID,
      seriesInstanceUID: firstResult.SeriesInstanceUID,
      sopInstanceUID: firstResult.SOPInstanceUID
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