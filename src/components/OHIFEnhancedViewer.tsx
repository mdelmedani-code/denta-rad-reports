import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { getOHIFConfig } from "@/config/ohif";

interface OHIFEnhancedViewerProps {
  caseId: string;
  filePath: string | null;
  onClose?: () => void;
  className?: string;
}

export const OHIFEnhancedViewer = ({ caseId, filePath, onClose, className = "" }: OHIFEnhancedViewerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!caseId) {
      setError('No case ID provided');
      setIsLoading(false);
      return;
    }

    // Just set a small delay to show loading state
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [caseId, filePath]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Loading OHIF Viewer...</p>
          <p className="text-sm text-gray-400">Initializing medical imaging viewer for case {caseId}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-medium text-red-500 mb-2">OHIF Viewer Error</h3>
          <p className="text-sm text-gray-400 mb-4">{error}</p>
          {onClose && (
            <Button variant="outline" onClick={onClose} className="text-white border-gray-600 hover:bg-gray-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Build the OHIF URL
  const isPACSStudy = filePath && (filePath.includes('1.2.840.10008') || filePath.length > 50);
  const studyUID = isPACSStudy ? filePath : `1.2.826.0.1.3680043.8.498.${caseId.replace(/-/g, '')}`;
  const ohifUrl = `/ohif-viewer?StudyInstanceUIDs=${studyUID}&caseId=${caseId}`;

  return (
    <div className={`w-full h-full bg-black ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-2 bg-gray-900 border-b border-gray-700 min-h-[48px]">
        <div className="flex items-center gap-2">
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-gray-700">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <span className="text-sm text-gray-300">OHIF Medical Imaging Viewer - Case {caseId}</span>
        </div>
      </div>

      {/* OHIF Viewer Iframe */}
      <iframe
        ref={iframeRef}
        src={ohifUrl}
        className="w-full h-full bg-black border-0"
        style={{ minHeight: 'calc(100vh - 48px)' }}
        title={`OHIF Viewer - Case ${caseId}`}
        onLoad={() => {
          console.log('OHIF viewer loaded successfully');
        }}
        onError={() => {
          setError('Failed to load OHIF viewer');
        }}
      />
    </div>
  );
};