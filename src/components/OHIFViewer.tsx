import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface OHIFViewerProps {
  caseId: string;
  studyInstanceUID?: string;
  onClose?: () => void;
  className?: string;
}

export const OHIFViewer = ({ caseId, studyInstanceUID, onClose, className = "" }: OHIFViewerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializeOHIF = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get case data to retrieve Orthanc study ID
        const { data: caseData, error: caseError } = await supabase
          .from('cases')
          .select('orthanc_study_id, patient_name')
          .eq('id', caseId)
          .single();

        if (caseError || !caseData) {
          throw new Error('Case not found');
        }

        if (!caseData.orthanc_study_id) {
          throw new Error('No DICOM data available - case not uploaded to PACS');
        }

        console.log('Case data:', caseData);
        console.log('Using Orthanc Study ID:', caseData.orthanc_study_id);

        // Configure OHIF to connect directly to Orthanc
        const orthancUrl = 'http://116.203.35.168:8042'; // Direct Orthanc connection
        const studyUID = caseData.orthanc_study_id;
        
        // Build OHIF viewer URL with direct Orthanc DICOMweb endpoints
        // Note: OHIF.org viewer supports direct Orthanc connections
        const viewerUrl = `https://viewer.ohif.org/viewer?StudyInstanceUIDs=${studyUID}&url=${orthancUrl}/dicom-web`;
        
        console.log('OHIF Viewer URL:', viewerUrl);
        
        if (containerRef.current) {
          containerRef.current.innerHTML = ''; // Clear previous content
          
          const iframe = document.createElement('iframe');
          iframe.src = viewerUrl;
          iframe.style.width = '100%';
          iframe.style.height = '100%';
          iframe.style.border = 'none';
          iframe.allow = 'fullscreen';
          
          iframe.onload = () => {
            console.log('OHIF iframe loaded');
            setIsLoading(false);
          };
          
          iframe.onerror = () => {
            console.error('OHIF iframe failed to load');
            setError('Failed to load OHIF viewer');
            setIsLoading(false);
          };
          
          containerRef.current.appendChild(iframe);
          
          // Fallback timeout in case onload doesn't fire
          setTimeout(() => {
            if (isLoading) {
              setIsLoading(false);
            }
          }, 10000);
        }

      } catch (err) {
        console.error('Error initializing OHIF:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize OHIF viewer');
        setIsLoading(false);
      }
    };

    initializeOHIF();
  }, [caseId, studyInstanceUID, isLoading]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Loading OHIF Viewer...</p>
          <p className="text-sm text-gray-400">Connecting to Orthanc PACS...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <p className="text-lg font-medium text-red-500 mb-2">Error Loading Viewer</p>
          <p className="text-sm text-gray-400 mb-4">{error}</p>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full bg-black ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-2">
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-gray-700">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-white text-lg font-semibold">OHIF Medical Imaging Viewer</h1>
          <span className="text-gray-400 text-sm">(Connected to Orthanc PACS)</span>
        </div>
      </div>

      {/* OHIF Viewer Container */}
      <div 
        ref={containerRef}
        className="w-full"
        style={{ height: 'calc(100vh - 80px)' }}
      />
    </div>
  );
};