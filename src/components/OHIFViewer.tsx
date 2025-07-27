import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

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

        // Create OHIF iframe integration
        const viewerUrl = `https://viewer.ohif.org/viewer?StudyInstanceUIDs=${studyInstanceUID || 'default'}&url=https://swusayoygknritombbwg.supabase.co/functions/v1/dicomweb-server/cases/${caseId}`;
        
        if (containerRef.current) {
          const iframe = document.createElement('iframe');
          iframe.src = viewerUrl;
          iframe.style.width = '100%';
          iframe.style.height = '100%';
          iframe.style.border = 'none';
          iframe.allow = 'fullscreen';
          
          containerRef.current.appendChild(iframe);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing OHIF:', err);
        setError('Failed to initialize OHIF viewer');
        setIsLoading(false);
      }
    };

    initializeOHIF();
  }, [caseId, studyInstanceUID]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Loading OHIF Viewer...</p>
          <p className="text-sm text-gray-400">Initializing medical imaging viewer</p>
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