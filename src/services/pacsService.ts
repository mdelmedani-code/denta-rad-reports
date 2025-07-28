import { supabase } from "@/integrations/supabase/client";

export interface PACSStudy {
  id: string;
  studyInstanceUID: string;
  patientName: string;
  patientID: string;
  studyDate: string;
  studyTime: string;
  studyDescription: string;
  accessionNumber: string;
  seriesCount: number;
  instanceCount: number;
  series: PACSSeries[];
}

export interface PACSSeries {
  id: string;
  seriesInstanceUID: string;
  seriesDescription: string;
  modality: string;
  instanceCount: number;
  instances: PACSInstance[];
}

export interface PACSInstance {
  id: string;
  previewUrl: string;
  downloadUrl: string;
}

export interface PACSResult {
  success: boolean;
  study?: PACSStudy;
  error?: string;
}

/**
 * Retrieve PACS study data for a specific case
 */
export const getPACSStudyForCase = async (caseId: string): Promise<PACSResult> => {
  try {
    console.log('Getting PACS study for case:', caseId);
    
    // First, get the case data to retrieve the orthanc_study_id (which contains the study instance UID)
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('orthanc_study_id, patient_name')
      .eq('id', caseId)
      .maybeSingle();
    
    if (caseError) {
      throw new Error(`Failed to get case data: ${caseError.message}`);
    }
    
    if (!caseData) {
      throw new Error('Case not found');
    }
    
    if (!caseData.orthanc_study_id) {
      throw new Error('No study instance UID found for this case');
    }
    
    console.log('Found study instance UID:', caseData.orthanc_study_id);
    
    // Call the edge function to get study data from PACS
    const { data, error } = await supabase.functions.invoke('get-pacs-study', {
      body: {
        studyInstanceUID: caseData.orthanc_study_id
      }
    });
    
    if (error) {
      throw new Error(`PACS API error: ${error.message}`);
    }
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to retrieve study from PACS');
    }
    
    console.log('Successfully retrieved PACS study data');
    
    return {
      success: true,
      study: data.study
    };
    
  } catch (error) {
    console.error('Error getting PACS study:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve PACS study'
    };
  }
};

/**
 * Get the DICOM viewer URL for a case
 */
export const getDicomViewerUrl = async (caseId: string): Promise<string | null> => {
  try {
    const result = await getPACSStudyForCase(caseId);
    
    if (!result.success || !result.study) {
      console.error('Failed to get PACS study for viewer URL');
      return null;
    }
    
    // Create a viewer URL with the study instance UID
    const studyUID = result.study.studyInstanceUID;
    const pacsUrl = 'http://116.203.35.168:8042';
    
    // Return the OHIF viewer URL with the study
    return `/viewer?studyInstanceUIDs=${studyUID}&pacsUrl=${encodeURIComponent(pacsUrl)}`;
    
  } catch (error) {
    console.error('Error generating viewer URL:', error);
    return null;
  }
};

/**
 * Download DICOM files for a case
 */
export const downloadDicomFiles = async (caseId: string): Promise<void> => {
  try {
    const result = await getPACSStudyForCase(caseId);
    
    if (!result.success || !result.study) {
      throw new Error('Failed to retrieve PACS study data');
    }
    
    // Download all instances in the study
    for (const series of result.study.series) {
      for (const instance of series.instances) {
        // Create a download link and trigger download
        const link = document.createElement('a');
        link.href = instance.downloadUrl;
        link.download = `${result.study.patientName}_${series.seriesDescription}_${instance.id}.dcm`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Add a small delay between downloads to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
  } catch (error) {
    console.error('Error downloading DICOM files:', error);
    throw error;
  }
};