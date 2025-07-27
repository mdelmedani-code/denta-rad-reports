import { getCurrentPACSConfig } from "@/config/pacs";

/**
 * Verify that a study exists in Orthanc PACS
 */
export const verifyOrthancStudy = async (studyId: string): Promise<boolean> => {
  try {
    const pacsConfig = getCurrentPACSConfig();
    
    const response = await fetch(`http://116.203.35.168:8042/studies/${studyId}`, {
      headers: {
        'Authorization': pacsConfig.auth.headers.Authorization,
        'Accept': 'application/json'
      }
    });

    return response.ok;
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
    const pacsConfig = getCurrentPACSConfig();
    
    const response = await fetch(`http://116.203.35.168:8042/studies/${studyId}`, {
      headers: {
        'Authorization': pacsConfig.auth.headers.Authorization,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Study not found: ${response.statusText}`);
    }

    return await response.json();
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
    const pacsConfig = getCurrentPACSConfig();
    
    const response = await fetch(`http://116.203.35.168:8042/system`, {
      headers: {
        'Authorization': pacsConfig.auth.headers.Authorization,
        'Accept': 'application/json'
      }
    });

    return response.ok;
  } catch (error) {
    console.error('Orthanc connection failed:', error);
    return false;
  }
};