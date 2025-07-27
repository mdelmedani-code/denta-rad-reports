import { supabase } from "@/integrations/supabase/client";
import { getCurrentPACSConfig, ORTHANC_UPLOAD_CONFIG } from "@/config/pacs";

export interface OrthancUploadResult {
  success: boolean;
  studyInstanceUID?: string;
  seriesInstanceUID?: string;
  sopInstanceUID?: string;
  orthancId?: string;
  error?: string;
}

/**
 * Upload DICOM file to Orthanc PACS server via STOW-RS
 * Currently falls back to Supabase storage during development
 */
export const uploadDICOMToOrthanc = async (
  file: File,
  caseId: string,
  userId: string
): Promise<OrthancUploadResult> => {
  const pacsConfig = getCurrentPACSConfig();
  
  try {
    // Check if we're using production Orthanc or development fallback
    if (pacsConfig.auth.type === 'orthanc') {
      return await uploadToOrthancSTOW(file, caseId);
    } else {
      // Development fallback: Upload to Supabase storage
      return await uploadToSupabaseStorage(file, caseId, userId);
    }
  } catch (error) {
    console.error('DICOM upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
};

/**
 * Upload to Orthanc PACS using STOW-RS protocol
 */
const uploadToOrthancSTOW = async (
  file: File,
  caseId: string
): Promise<OrthancUploadResult> => {
  const pacsConfig = getCurrentPACSConfig();
  
  // Validate file size
  if (file.size > ORTHANC_UPLOAD_CONFIG.maxFileSize) {
    throw new Error(`File size exceeds maximum allowed size of ${ORTHANC_UPLOAD_CONFIG.maxFileSize / (1024 * 1024)}MB`);
  }

  // Create multipart form data for STOW-RS
  const formData = new FormData();
  
  // Add DICOM file with proper content type
  formData.append('file', file, file.name);
  
  // Add metadata
  const metadata = {
    caseId,
    uploadedAt: new Date().toISOString(),
    originalFilename: file.name,
    fileSize: file.size
  };
  
  formData.append('metadata', JSON.stringify(metadata));

  const response = await fetch(pacsConfig.dicomweb.stowRs, {
    method: 'POST',
    headers: {
      'Accept': 'application/dicom+json',
      ...pacsConfig.auth.headers
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Orthanc upload failed: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  
  // Extract DICOM UIDs from Orthanc response
  const studyInstanceUID = result.ReferencedSOPSequence?.[0]?.ReferencedSOPInstanceUID;
  const seriesInstanceUID = result.ReferencedSOPSequence?.[0]?.ReferencedSeriesInstanceUID;
  const sopInstanceUID = result.ReferencedSOPSequence?.[0]?.ReferencedSOPInstanceUID;

  return {
    success: true,
    studyInstanceUID,
    seriesInstanceUID,
    sopInstanceUID,
    orthancId: result.ID
  };
};

/**
 * Development fallback: Upload to Supabase storage
 */
const uploadToSupabaseStorage = async (
  file: File,
  caseId: string,
  userId: string
): Promise<OrthancUploadResult> => {
  // Generate file path
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  
  // Upload to Supabase storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('cbct-scans')
    .upload(fileName, file);

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  // Generate synthetic DICOM UIDs for development
  const timestamp = Date.now();
  const studyInstanceUID = `1.2.840.10008.${timestamp}.1.${caseId}`;
  const seriesInstanceUID = `1.2.840.10008.${timestamp}.2.${caseId}`;
  const sopInstanceUID = `1.2.840.10008.${timestamp}.3.${caseId}`;

  return {
    success: true,
    studyInstanceUID,
    seriesInstanceUID, 
    sopInstanceUID,
    orthancId: uploadData.path
  };
};

/**
 * Query study metadata from Orthanc via QIDO-RS
 */
export const queryOrthancStudies = async (
  studyInstanceUID?: string,
  patientName?: string
): Promise<any[]> => {
  const pacsConfig = getCurrentPACSConfig();
  
  if (pacsConfig.auth.type !== 'orthanc') {
    // Development fallback
    console.log('Development mode: QIDO-RS query not available');
    return [];
  }

  let queryUrl = pacsConfig.dicomweb.qidoRs + '/studies';
  const params = new URLSearchParams();
  
  if (studyInstanceUID) {
    params.append('StudyInstanceUID', studyInstanceUID);
  }
  if (patientName) {
    params.append('PatientName', patientName);
  }
  
  if (params.toString()) {
    queryUrl += '?' + params.toString();
  }

  const response = await fetch(queryUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/dicom+json',
      ...pacsConfig.auth.headers
    }
  });

  if (!response.ok) {
    throw new Error(`QIDO-RS query failed: ${response.status}`);
  }

  return await response.json();
};

/**
 * Delete study from Orthanc
 */
export const deleteOrthancStudy = async (studyInstanceUID: string): Promise<boolean> => {
  const pacsConfig = getCurrentPACSConfig();
  
  if (pacsConfig.auth.type !== 'orthanc') {
    console.log('Development mode: Study deletion not available');
    return false;
  }

  // Note: Orthanc doesn't use standard DICOM delete - uses its own REST API
  const deleteUrl = `${pacsConfig.dicomweb.wadoRs.replace('/dicom-web/wado', '')}/studies/${studyInstanceUID}`;

  const response = await fetch(deleteUrl, {
    method: 'DELETE',
    headers: pacsConfig.auth.headers
  });

  return response.ok;
};

/**
 * Generate OHIF viewer URL for a study
 */
export const generateOHIFViewerURL = (
  studyInstanceUID: string,
  baseUrl?: string
): string => {
  const viewerBase = baseUrl || `${window.location.origin}/viewer`;
  return `${viewerBase}?studyInstanceUID=${studyInstanceUID}`;
};