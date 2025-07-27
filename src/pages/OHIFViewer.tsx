import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

declare global {
  interface Window {
    OHIFViewer: any;
  }
}

export const OHIFViewer = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studyData, setStudyData] = useState<any>(null);
  
  const studyInstanceUIDs = searchParams.get('StudyInstanceUIDs');
  const caseId = searchParams.get('caseId');
  
  console.log('OHIF Viewer - URL params:', { studyInstanceUIDs, caseId });

  useEffect(() => {
    if (!studyInstanceUIDs || !caseId) {
      setError('Missing required parameters: StudyInstanceUIDs and caseId');
      setIsLoading(false);
      return;
    }

    const loadStudyData = async () => {
      try {
        setIsLoading(true);
        
        // Test connection to our DICOMweb server for this case
        const testUrl = `https://swusayoygknritombbwg.supabase.co/functions/v1/dicomweb-server/studies?caseId=${caseId}`;
        console.log('Testing DICOMweb connection for case:', caseId);
        
        const response = await fetch(testUrl, {
          headers: {
            'Accept': 'application/dicom+json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`DICOMweb server error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('DICOMweb server response:', data);
        
        setStudyData({
          studyUID: studyInstanceUIDs,
          caseId: caseId,
          serverStatus: 'connected',
          studyCount: data.studies?.length || 1
        });
        
      } catch (error) {
        console.error('Error connecting to DICOMweb server:', error);
        setError(`Failed to connect to DICOMweb server: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadStudyData();
  }, [studyInstanceUIDs, caseId]);

  if (error) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Configuration Error</h2>
          <p className="text-red-400">{error}</p>
          <p className="text-sm text-gray-400 mt-4">
            Please ensure the viewer is launched with proper study parameters.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mb-4"></div>
          <h2 className="text-2xl font-bold mb-2">Loading DICOM Viewer</h2>
          <p className="text-gray-400">Connecting to DICOMweb server...</p>
          <p className="text-sm text-gray-500 mt-2">Study: {studyInstanceUIDs}</p>
          <p className="text-sm text-gray-500">Case: {caseId}</p>
        </div>
      </div>
    );
  }

  // For now, show a placeholder that demonstrates the connection works
  return (
    <div className="w-full h-screen bg-gray-900 text-white">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">DICOM Viewer</h1>
          <p className="text-gray-400">Connected to DentaRad DICOMweb Server</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Study Information Panel */}
          <div className="lg:col-span-1 bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Study Information</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-400">Study UID</label>
                <p className="text-sm text-white break-all">{studyInstanceUIDs}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400">Case ID</label>
                <p className="text-sm text-white">{caseId}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400">Status</label>
                <p className="text-sm text-green-400">Connected to DICOMweb Server</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400">Server</label>
                <p className="text-sm text-white">swusayoygknritombbwg.supabase.co</p>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Available Actions</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => {
                    const dicomUrl = `https://swusayoygknritombbwg.supabase.co/functions/v1/dicomweb-server/wado/studies/${studyInstanceUIDs}/series/series.${caseId}.1/instances/instance.${caseId}.1.1?caseId=${caseId}`;
                    window.open(dicomUrl, '_blank');
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
                >
                  Download DICOM Instance
                </button>
                <button 
                  onClick={() => {
                    const metadataUrl = `https://swusayoygknritombbwg.supabase.co/functions/v1/dicomweb-server/wado/studies/${studyInstanceUIDs}/series/series.${caseId}.1/instances/instance.${caseId}.1.1/metadata?caseId=${caseId}`;
                    window.open(metadataUrl, '_blank');
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
                >
                  View DICOM Metadata
                </button>
              </div>
            </div>
          </div>

          {/* Viewer Area */}
          <div className="lg:col-span-2 bg-black rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="w-64 h-64 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center mb-4">
                <div className="text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>DICOM Image Area</p>
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">DICOM Viewer Placeholder</h3>
              <p className="text-gray-400 mb-4">
                Connected to case: {caseId}
              </p>
              <p className="text-sm text-gray-500">
                This demonstrates successful connection to the DICOMweb backend.
                <br />
                A full OHIF integration would render the medical image here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};