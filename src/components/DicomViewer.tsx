import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Maximize2, Minimize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// OHIF Viewer imports
import { Viewer } from "@ohif/viewer";
import "@ohif/viewer/dist/index.css";

interface DicomViewerProps {
  caseId: string;
  filePath: string | null;
  className?: string;
}

export const DicomViewer = ({ caseId, filePath, className = "" }: DicomViewerProps) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [studyInstanceUID, setStudyInstanceUID] = useState<string | null>(null);

  // OHIF configuration
  const ohifConfig = {
    routerBasename: '/',
    showStudyBrowser: false,
    showWarningMessageForCrossOrigin: false,
    showCPUFallbackMessage: false,
    strictZSpacingForVolumeViewport: true,
    maxNumberOfWebWorkers: 3,
    omitQuotationForMultipartRequest: true,
    supportsWildcard: false,
    enableStudyLazyLoad: true,
    defaultDataSourceName: 'dicomweb',
    hotkeys: [
      {
        commandName: 'incrementActiveViewport',
        label: 'Next Viewport',
        keys: ['right'],
      },
      {
        commandName: 'decrementActiveViewport',
        label: 'Previous Viewport',
        keys: ['left'],
      },
    ],
    cornerstoneExtensionConfig: {},
    extensions: [],
    modes: [],
    customizationService: {},
  };

  // Data source configuration for OHIF
  const dataSource = {
    friendlyName: 'CBCT Scanner',
    namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
    sourceName: 'dicomweb',
    configuration: {
      name: 'DCM4CHEE',
      wadoUriRoot: window.location.origin,
      qidoRoot: window.location.origin,
      wadoRoot: window.location.origin,
      qidoSupportsIncludeField: false,
      supportsReject: false,
      imageRendering: 'wadors',
      thumbnailRendering: 'wadors',
      enableStudyLazyLoad: true,
      supportsFuzzyMatching: false,
      supportsWildcard: true,
      staticWado: true,
      singlepart: 'bulkdata,video',
      acceptHeader: ['multipart/related; type=application/octet-stream; transfer-syntax=*'],
    },
  };

  useEffect(() => {
    const initializeOHIFViewer = async () => {
      if (!filePath) {
        setError("No DICOM file available for this case");
        setIsLoading(false);
        return;
      }

      try {
        // Get the signed URL for the DICOM file
        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from('cbct-scans')
          .createSignedUrl(filePath, 3600); // 1 hour expiry

        if (urlError) throw urlError;

        // Generate a study instance UID for OHIF
        const studyUID = `1.2.826.0.1.3680043.8.498.${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;
        setStudyInstanceUID(studyUID);

        // If it's a ZIP file, we'll create a mock study for OHIF
        // In a real implementation, you'd extract the DICOM files and serve them via DICOMweb
        const study = {
          StudyInstanceUID: studyUID,
          StudyDate: new Date().toISOString().split('T')[0].replace(/-/g, ''),
          StudyTime: new Date().toTimeString().split(' ')[0].replace(/:/g, ''),
          AccessionNumber: caseId,
          PatientName: 'CBCT Patient',
          PatientID: caseId,
          StudyDescription: 'CBCT Scan',
          SeriesInstanceUID: `${studyUID}.1`,
          SeriesDescription: 'CBCT Series',
          Modality: 'CT',
          instances: [
            {
              SOPInstanceUID: `${studyUID}.1.1`,
              url: signedUrlData.signedUrl,
            },
          ],
        };

        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing OHIF viewer:', error);
        setError('Failed to initialize DICOM viewer');
        setIsLoading(false);
      }
    };

    initializeOHIFViewer();
  }, [filePath, caseId]);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (viewerRef.current?.requestFullscreen) {
        viewerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>OHIF DICOM Viewer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Initializing OHIF viewer...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>OHIF DICOM Viewer</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              {error}
            </AlertDescription>
          </Alert>
          <div className="mt-4 text-sm text-muted-foreground">
            <p><strong>Note:</strong> ZIP files require a DICOMweb server to extract and serve DICOM files. For production use, consider setting up Orthanc or dcm4chee DICOM server.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>OHIF DICOM Viewer</CardTitle>
        <Button
          onClick={toggleFullscreen}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </Button>
      </CardHeader>
      <CardContent>
        <div 
          ref={viewerRef}
          className="relative bg-black rounded-lg overflow-hidden"
          style={{ height: isFullscreen ? '100vh' : '600px' }}
        >
          {studyInstanceUID ? (
            <div className="w-full h-full">
              <Viewer
                config={ohifConfig}
                dataSources={[dataSource]}
                studyInstanceUIDs={[studyInstanceUID]}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-white">
              <div className="text-center">
                <p className="text-lg mb-2">Professional DICOM Viewer Ready</p>
                <p className="text-sm text-gray-300">Case ID: {caseId}</p>
                <p className="text-xs text-gray-400 mt-4">
                  Note: This integrates OHIF viewer for professional medical imaging visualization.
                  ZIP files require DICOMweb server setup for full functionality.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};