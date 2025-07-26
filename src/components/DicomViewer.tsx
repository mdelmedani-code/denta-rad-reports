import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Maximize2, Minimize2, ExternalLink, Download, Eye, ArrowLeft, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AnnotationViewer } from "./AnnotationViewer";
import { OHIFEnhancedViewer } from "./OHIFEnhancedViewer";

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
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [showOHIFViewer, setShowOHIFViewer] = useState(false);
  const [savedAnnotations, setSavedAnnotations] = useState<any[]>([]);

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

        setFileUrl(signedUrlData.signedUrl);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading DICOM file:', error);
        setError('Failed to load DICOM file');
        setIsLoading(false);
      }
    };

    initializeViewer();
  }, [filePath]);

  // Load saved annotations from enhanced viewer
  useEffect(() => {
    const loadAnnotations = async () => {
      try {
        const { data, error } = await supabase
          .from('case_annotations')
          .select('*')
          .eq('case_id', caseId)
          .eq('annotation_type', 'ohif_enhanced')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSavedAnnotations(data || []);
      } catch (error) {
        console.error('Error loading annotations:', error);
      }
    };

    if (caseId) {
      loadAnnotations();
    }
  }, [caseId]);

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

  const openOHIFViewer = () => {
    if (!fileUrl) return;
    
    // Create OHIF viewer URL with our case data
    // We'll create a simple OHIF configuration that can load our DICOM file
    const ohifConfig = {
      studyInstanceUIDs: [`1.2.826.0.1.3680043.8.498.${Date.now()}`],
      seriesInstanceUIDs: [`1.2.826.0.1.3680043.8.498.${Date.now()}.1`],
      sopInstanceUIDs: [`1.2.826.0.1.3680043.8.498.${Date.now()}.1.1`],
      url: fileUrl,
      caseId: caseId,
      patientName: `Patient-${caseId}`,
      studyDescription: 'CBCT Scan'
    };

    // Open OHIF in a new window that can be moved to different screens
    const ohifUrl = `/ohif-viewer?config=${encodeURIComponent(JSON.stringify(ohifConfig))}`;
    window.open(ohifUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=no,status=no');
  };

  const handleDownload = () => {
    if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = filePath?.split('/').pop() || 'dicom-file.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const openExternalViewer = () => {
    // Open a new window with instructions for external DICOM viewers
    const instructions = `
      <html>
        <head><title>DICOM Viewer Instructions</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px;">
          <h2>Professional DICOM Viewing Options</h2>
          <p>To view this CBCT scan professionally, download the file and use one of these recommended DICOM viewers:</p>
          
          <h3>Free DICOM Viewers:</h3>
          <ul>
            <li><strong>3D Slicer</strong> - Advanced 3D medical imaging (slicer.org)</li>
            <li><strong>OHIF Viewer</strong> - Web-based medical imaging (ohif.org)</li>
            <li><strong>Horos</strong> - Mac only (horosproject.org)</li>
            <li><strong>RadiAnt</strong> - Windows (radiantviewer.com)</li>
            <li><strong>MicroDicom</strong> - Windows (microdicom.com)</li>
          </ul>
          
          <h3>Online Viewers:</h3>
          <ul>
            <li><strong>PostDICOM</strong> - Online viewer (postdicom.com)</li>
            <li><strong>Kry.pl DICOM Viewer</strong> - Web-based (kry.pl/dicom)</li>
          </ul>
          
          <p>Most viewers support ZIP files containing DICOM data and provide advanced features like:</p>
          <ul>
            <li>3D reconstruction and volume rendering</li>
            <li>Multiplanar reconstruction (MPR)</li>
            <li>Measurement tools</li>
            <li>Window/level adjustments</li>
            <li>DICOM metadata viewing</li>
          </ul>
          
          <p><strong>File:</strong> ${filePath}</p>
          <p><strong>Case ID:</strong> ${caseId}</p>
        </body>
      </html>
    `;
    
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(instructions);
      newWindow.document.close();
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
              <span>Loading DICOM file...</span>
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

  const isZipFile = filePath?.toLowerCase().endsWith('.zip');
  const isImageFile = filePath?.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|tiff|dcm)$/);

  // If user wants to view in OHIF Enhanced Viewer
  if (showOHIFViewer && fileUrl) {
    return (
      <div className={className}>
        <OHIFEnhancedViewer
          caseId={caseId}
          filePath={filePath}
          onClose={() => setShowOHIFViewer(false)}
        />
      </div>
    );
  }

  // If we have an image file and user wants to view it, show the annotation viewer
  if (showViewer && fileUrl && isImageFile) {
    return (
      <div className={className}>
        <div className="flex justify-between items-center mb-4">
          <Button
            onClick={() => setShowViewer(false)}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to File Info
          </Button>
        </div>
        <AnnotationViewer
          caseId={caseId}
          imageUrl={fileUrl}
          className="w-full"
        />
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>DICOM Viewer</CardTitle>
        <div className="flex gap-2">
          <Button
            onClick={handleDownload}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button
            onClick={openExternalViewer}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            External Viewer
          </Button>
          <Button
            onClick={toggleFullscreen}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            {isFullscreen ? 'Exit' : 'Fullscreen'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div 
          ref={viewerRef}
          className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg overflow-hidden"
          style={{ height: isFullscreen ? '100vh' : '600px' }}
        >
          <div className="flex items-center justify-center h-full text-white">
            <div className="text-center space-y-6 p-8">
              <div className="w-24 h-24 mx-auto bg-blue-600/20 rounded-full flex items-center justify-center">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">📋</span>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-2">CBCT Scan Ready</h3>
                <p className="text-blue-200 mb-1">Case ID: {caseId}</p>
                <p className="text-sm text-gray-300">
                  File: {filePath?.split('/').pop()}
                </p>
              </div>

              {isZipFile && (
                <Alert className="bg-blue-900/30 border-blue-500/50 text-left">
                  <AlertTriangle className="h-4 w-4 text-blue-400" />
                  <AlertDescription className="text-blue-100">
                    <strong>ZIP Archive Detected:</strong> This file contains DICOM data that requires specialized medical imaging software to view properly.
                  </AlertDescription>
                </Alert>
              )}

              {/* Show saved annotations from enhanced viewer */}
              {savedAnnotations.length > 0 && (
                <Alert className="bg-green-900/30 border-green-500/50 text-left">
                  <Users className="h-4 w-4 text-green-400" />
                  <AlertDescription className="text-green-100">
                    <strong>Reporter Annotations Available:</strong> {savedAnnotations.length} annotation{savedAnnotations.length > 1 ? 's' : ''} saved by reporting radiologist
                    <div className="mt-2 space-y-1">
                      {savedAnnotations.slice(0, 3).map((annotation, index) => (
                        <div key={annotation.id} className="text-xs text-green-200 flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {new Date(annotation.created_at).toLocaleString()} - 
                          Tool: {annotation.annotation_data?.tool || 'Unknown'}
                        </div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <div className="flex gap-3 justify-center flex-wrap">
                  <Button 
                    onClick={() => setShowOHIFViewer(true)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Images
                  </Button>
                  <Button 
                    onClick={handleDownload}
                    variant="outline"
                    className="border-blue-500 text-blue-300 hover:bg-blue-600/20"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download for External Software
                  </Button>
                </div>
                
                <p className="text-xs text-gray-400 text-center">
                  Use "View Images" for built-in analysis or download to open with professional DICOM software
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};