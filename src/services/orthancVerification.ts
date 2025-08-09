import { supabase } from "@/integrations/supabase/client";

/**
 * Verify that a study exists in Orthanc PACS using the proxy
 */
export const verifyOrthancStudy = async (studyId: string): Promise<boolean> => {
  try {
    console.log('Verifying study in Orthanc via DICOMweb QIDO:', studyId);
    
    // Use DICOMweb QIDO endpoint via full URL to the proxy
    const proxyUrl = `https://swusayoygknritombbwg.supabase.co/functions/v1/dicomweb-proxy/studies?StudyInstanceUID=${encodeURIComponent(studyId)}`;
    const res = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3dXNheW95Z2tucml0b21iYndnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTkzMjEsImV4cCI6MjA2OTAzNTMyMX0.sOAz9isiZUp8BmFVDQRV-G16iWc0Rk8mM9obUKko2dY',
        'Accept': 'application/dicom+json'
      }
    });

    if (!res.ok) {
      console.error('QIDO verification error:', res.status, await res.text());
      return false;
    }

    const data = await res.json();

    // DICOMweb QIDO returns an array, check if study exists
    if (Array.isArray(data) && data.length > 0) {
      console.log('Study verification successful:', data[0]);
      return true;
    }

    console.log('Study not found in QIDO response');
    return false;
  } catch (error) {
    console.error('Error verifying Orthanc study:', error);
    return false;
  }
};

/**
 * Get study details from Orthanc to confirm upload
 */
export const getOrthancStudyInfo = async (studyId: string): Promise<any> => {
  try {
    const { data, error } = await supabase.functions.invoke('get-pacs-study', {
      body: { studyInstanceUID: studyId }
    });
    if (error) {
      throw new Error(error.message);
    }
    return data ?? null;
  } catch (error) {
    console.error('Error getting Orthanc study info:', error);
    return null;
  }
};

/**
 * Check if Orthanc is accessible
 */
export const checkOrthancConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('test-orthanc-connection');
    if (error) throw error;
    return Boolean((data as any)?.success ?? false);
  } catch (error) {
    console.error('Orthanc connection failed:', error);
    return false;
  }
};