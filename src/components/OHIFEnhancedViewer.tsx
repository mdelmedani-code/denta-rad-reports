import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { buildOHIFUrl } from "@/config/ohif";

interface OHIFEnhancedViewerProps {
  caseId: string;
  filePath: string | null;
  onClose?: () => void;
  className?: string;
}

export const OHIFEnhancedViewer = ({ caseId, filePath, onClose, className = "" }: OHIFEnhancedViewerProps) => {
  const [iframeError, setIframeError] = useState(false);

  // Generate study UID for OHIF
  const isPACSStudy = filePath && (filePath.includes('1.2.840.10008') || filePath.length > 50);
  const studyUID = isPACSStudy ? filePath : `1.2.826.0.1.3680043.8.498.${caseId.replace(/-/g, '')}`;
  
  // Build OHIF URL
  const ohifUrl = buildOHIFUrl(caseId, studyUID);

  const handleIframeError = () => {
    setIframeError(true);
  };

  if (iframeError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <p className="text-lg font-medium text-red-500 mb-2">OHIF Viewer Error</p>
          <p className="text-sm text-gray-400 mb-4">Failed to load OHIF viewer</p>
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
        src={ohifUrl}
        className="w-full h-full border-0"
        style={{ minHeight: 'calc(100vh - 48px)' }}
        onError={handleIframeError}
        title="OHIF Medical Imaging Viewer"
      />
    </div>
  );
};