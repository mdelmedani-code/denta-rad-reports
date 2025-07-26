import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Maximize2, Minimize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const initializeViewer = async () => {
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

        setImageUrl(signedUrlData.signedUrl);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading DICOM file:', error);
        setError('Failed to load DICOM images');
        setIsLoading(false);
      }
    };

    initializeViewer();
  }, [filePath]);

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
          <CardTitle>DICOM Viewer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading DICOM images...</span>
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
          <CardTitle>DICOM Viewer</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>DICOM Viewer</CardTitle>
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
          {imageUrl ? (
            <div className="w-full h-full flex items-center justify-center">
              <img 
                src={imageUrl}
                alt="DICOM Image"
                className="max-w-full max-h-full object-contain"
                style={{ filter: 'invert(1)' }} // Medical images are often inverted
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-white">
              <p>No image available</p>
            </div>
          )}
          
          {/* Basic DICOM viewer controls overlay */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 rounded-lg p-2">
            <div className="flex items-center gap-2 text-white text-sm">
              <span>Case ID: {caseId}</span>
              <span>•</span>
              <span>CBCT Scan</span>
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-muted-foreground">
          <p><strong>Note:</strong> This is a basic DICOM viewer. For advanced features like windowing, measurements, and 3D reconstruction, consider integrating a professional DICOM viewer like OHIF Viewer or Cornerstone.js.</p>
        </div>
      </CardContent>
    </Card>
  );
};