import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, AlertCircle, ExternalLink, Maximize, Settings } from "lucide-react";
import { getOHIFConfig } from "@/config/pacs";

interface OrthancOHIFViewerProps {
  studyInstanceUID?: string;
  caseId?: string;
  onClose?: () => void;
  className?: string;
  fullscreen?: boolean;
}

export const OrthancOHIFViewer = ({ 
  studyInstanceUID, 
  caseId, 
  onClose, 
  className = "",
  fullscreen = false 
}: OrthancOHIFViewerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ohifConfig, setOhifConfig] = useState<any>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializeOHIF = async () => {
      try {
        setIsLoading(true);
        
        // Get OHIF configuration for Orthanc
        const config = getOHIFConfig(studyInstanceUID);
        setOhifConfig(config);
        
        console.log('OHIF Configuration for Orthanc:', config);
        
        // For now, show configuration until Orthanc is deployed
        setIsLoading(false);
        
      } catch (error) {
        console.error('Failed to initialize OHIF viewer:', error);
        setError('Failed to initialize DICOM viewer');
        setIsLoading(false);
      }
    };

    initializeOHIF();
  }, [studyInstanceUID]);

  const openInNewTab = () => {
    if (studyInstanceUID) {
      const url = `/viewer?studyInstanceUID=${studyInstanceUID}`;
      window.open(url, '_blank');
    } else if (caseId) {
      const url = `/viewer?caseId=${caseId}`;
      window.open(url, '_blank');
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full h-[600px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium">Loading OHIF Viewer...</p>
          <p className="text-sm text-muted-foreground">Connecting to PACS system</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full h-[600px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <AlertCircle className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-red-500 mb-2">Viewer Error</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-gray-900 ${className}`}>
      {/* Header */}
      {!fullscreen && (
        <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-4">
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-gray-700">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-white">DICOM Viewer</h2>
              <p className="text-sm text-gray-300">
                {studyInstanceUID ? `Study: ${studyInstanceUID.slice(-12)}...` : `Case: ${caseId}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={openInNewTab}
              className="text-white border-gray-600 hover:bg-gray-700"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="text-white border-gray-600 hover:bg-gray-700"
            >
              <Maximize className="h-4 w-4 mr-2" />
              Fullscreen
            </Button>
          </div>
        </div>
      )}

      {/* OHIF Viewer Container */}
      <div className="flex-1 relative" ref={viewerContainerRef}>
        {ohifConfig ? (
          <div className="h-full flex items-center justify-center bg-gray-900 text-white">
            <div className="text-center max-w-2xl p-8">
              <div className="mb-6">
                <Settings className="h-20 w-20 mx-auto mb-4 text-blue-400" />
                <h3 className="text-2xl font-bold mb-2">OHIF + Orthanc Integration Ready</h3>
                <p className="text-gray-300 mb-6">
                  The viewer is configured to connect to your Orthanc PACS server. 
                  Deploy Orthanc with DICOMweb plugin to enable full functionality.
                </p>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 mb-6 text-left">
                <h4 className="font-semibold mb-3 text-blue-400">Configuration Preview:</h4>
                <div className="space-y-2 text-sm font-mono">
                  <div><span className="text-yellow-400">WADO-RS:</span> {ohifConfig.dataSources[0].configuration.wadoRoot}</div>
                  <div><span className="text-yellow-400">QIDO-RS:</span> {ohifConfig.dataSources[0].configuration.qidoRoot}</div>
                  {studyInstanceUID && (
                    <div><span className="text-yellow-400">Study UID:</span> {studyInstanceUID}</div>
                  )}
                </div>
              </div>

              <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4">
                <h5 className="font-semibold text-blue-300 mb-2">Next Steps:</h5>
                <ol className="text-sm text-left space-y-1 text-gray-300">
                  <li>1. Deploy Orthanc server with DICOMweb plugin</li>
                  <li>2. Configure SSL and authentication</li>
                  <li>3. Update PACS endpoints in configuration</li>
                  <li>4. Test DICOM upload and viewing workflow</li>
                </ol>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-400">Loading viewer configuration...</p>
          </div>
        )}
      </div>
    </div>
  );
};