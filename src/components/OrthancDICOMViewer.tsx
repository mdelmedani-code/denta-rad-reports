import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw, ExternalLink, AlertCircle } from "lucide-react";
import { getCurrentPACSConfig } from "@/config/pacs";

interface OrthancDICOMViewerProps {
  caseId: string;
  studyInstanceUID?: string;
  onClose?: () => void;
  className?: string;
}

export const OrthancDICOMViewer = ({ 
  caseId, 
  studyInstanceUID, 
  onClose, 
  className = "" 
}: OrthancDICOMViewerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studies, setStudies] = useState<any[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pacsConfig = getCurrentPACSConfig();

  // Fetch studies from Orthanc
  useEffect(() => {
    const fetchStudies = async () => {
      try {
        setIsLoading(true);
        
        // Fetch studies from Orthanc REST API
        const response = await fetch(`http://116.203.35.168:8042/studies`, {
          headers: {
            'Authorization': pacsConfig.auth.headers.Authorization,
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch studies: ${response.statusText}`);
        }
        
        const studyList = await response.json();
        console.log('Available studies:', studyList);
        setStudies(studyList);
        
        if (studyList.length === 0) {
          setError('No DICOM studies found in PACS. Please upload DICOM files first.');
          setIsLoading(false);
          return;
        }
        
        // Load OHIF viewer with the first study or specified study
        const targetStudy = studyInstanceUID 
          ? studyList.find(s => s.MainDicomTags?.StudyInstanceUID === studyInstanceUID)
          : studyList[0];
          
        if (!targetStudy) {
          setError('Specified study not found in PACS');
          setIsLoading(false);
          return;
        }
        
        loadOHIFViewer(targetStudy);
        
      } catch (error) {
        console.error('Error fetching studies:', error);
        setError(`Failed to connect to PACS: ${error.message}`);
        setIsLoading(false);
      }
    };

    fetchStudies();
  }, [caseId, studyInstanceUID]);

  const loadOHIFViewer = (study: any) => {
    try {
      const studyUID = study.MainDicomTags?.StudyInstanceUID || study.ID;
      
      // Construct OHIF viewer URL pointing to our Orthanc server
      const ohifUrl = `http://116.203.35.168:8042/ui/viewer/${studyUID}`;
      
      console.log('Loading OHIF viewer with URL:', ohifUrl);
      
      if (iframeRef.current) {
        iframeRef.current.src = ohifUrl;
        
        // Set up iframe load event
        iframeRef.current.onload = () => {
          setIsLoading(false);
          toast.success('DICOM study loaded successfully');
        };
        
        iframeRef.current.onerror = () => {
          setError('Failed to load OHIF viewer');
          setIsLoading(false);
        };
      }
      
    } catch (error) {
      console.error('Error loading OHIF viewer:', error);
      setError(`Failed to load viewer: ${error.message}`);
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setError(null);
    window.location.reload();
  };

  const openInNewTab = () => {
    if (studies.length > 0) {
      const studyUID = studies[0].MainDicomTags?.StudyInstanceUID || studies[0].ID;
      const ohifUrl = `http://116.203.35.168:8042/ui/viewer/${studyUID}`;
      window.open(ohifUrl, '_blank');
    }
  };

  if (error) {
    return (
      <Card className="w-full h-[800px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-16 w-16 mx-auto text-red-500" />
          <h3 className="text-lg font-semibold text-red-500">Connection Error</h3>
          <p className="text-sm text-muted-foreground max-w-md">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Connection
            </Button>
            {onClose && (
              <Button onClick={onClose} variant="ghost">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-background border-b">
        <div className="flex items-center gap-2">
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h2 className="text-lg font-semibold">DICOM Viewer</h2>
          <div className="text-sm text-muted-foreground">
            Connected to DentaRad PACS
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={openInNewTab} variant="outline" size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* OHIF Viewer Container */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-background flex items-center justify-center z-10">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-lg font-medium">Loading DICOM Viewer...</p>
              <p className="text-sm text-muted-foreground">
                Connecting to PACS server and loading study data
              </p>
            </div>
          </div>
        )}
        
        <iframe
          ref={iframeRef}
          className="w-full h-full border-0"
          title="OHIF DICOM Viewer"
          sandbox="allow-same-origin allow-scripts allow-forms allow-downloads"
        />
      </div>
    </div>
  );
};