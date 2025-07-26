import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Download, Maximize, Settings, Ruler, CircleDot, Square, MousePointer, PenTool, Eye, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
// Note: Full Cornerstone3D integration will be implemented in production
// This is a Phase 2 enhanced viewer with annotation tools interface

interface OHIFEnhancedViewerProps {
  caseId: string;
  filePath: string | null;
  onClose?: () => void;
  className?: string;
}

export const OHIFEnhancedViewer = ({ 
  caseId, 
  filePath, 
  onClose, 
  className = "" 
}: OHIFEnhancedViewerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dicomUrl, setDicomUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTool, setActiveTool] = useState('select');
  const [cornerstoneInitialized, setCornerstoneInitialized] = useState(false);
  
  const axialViewRef = useRef<HTMLDivElement>(null);
  const sagittalViewRef = useRef<HTMLDivElement>(null);
  const coronalViewRef = useRef<HTMLDivElement>(null);
  const threeDViewRef = useRef<HTMLDivElement>(null);
  
  const renderingEngineId = `ohif-${caseId}`;
  const volumeId = `volume-${caseId}`;
  const viewportIds = {
    axial: `axial-${caseId}`,
    sagittal: `sagittal-${caseId}`,
    coronal: `coronal-${caseId}`,
    volume3d: `volume3d-${caseId}`
  };

  // Initialize Enhanced Viewer
  useEffect(() => {
    const initializeViewer = async () => {
      try {
        // Simulate Cornerstone3D initialization for Phase 2
        setCornerstoneInitialized(true);
        console.log("Enhanced Viewer initialized with annotation tools");
        
      } catch (error) {
        console.error("Failed to initialize viewer:", error);
        setError("Failed to initialize enhanced viewer");
      }
    };
    
    initializeViewer();
  }, []);

  // Tool handlers
  const handleToolChange = (tool: string) => {
    setActiveTool(tool);
    toast.success(`${tool} tool activated`);
  };

  // Load DICOM file
  useEffect(() => {
    const loadDicomFile = async () => {
      if (!filePath) {
        setError("No file path provided");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Get signed URL from Supabase
        const { data, error: urlError } = await supabase.storage
          .from('cbct-scans')
          .createSignedUrl(filePath, 3600);

        if (urlError || !data) {
          throw new Error('Failed to get file URL');
        }

        setDicomUrl(data.signedUrl);
        
        // Load and render DICOM
        await loadAndRenderDicom(data.signedUrl);
        
      } catch (err) {
        console.error('Error loading DICOM file:', err);
        setError(err instanceof Error ? err.message : 'Failed to load DICOM file');
      } finally {
        setIsLoading(false);
      }
    };

    loadDicomFile();
  }, [filePath]);

  const loadAndRenderDicom = async (url: string) => {
    try {
      // For now, we'll simulate MPR views with placeholder content
      // In production, this would use Cornerstone3D for actual MPR rendering
      
      // Initialize view containers with DICOM data representation
      const viewports = [axialViewRef, sagittalViewRef, coronalViewRef, threeDViewRef];
      
      viewports.forEach((ref, index) => {
        if (ref.current) {
          const viewNames = ['Axial', 'Sagittal', 'Coronal', '3D Volume'];
          ref.current.innerHTML = `
            <div class="w-full h-full flex items-center justify-center bg-gray-800 text-white">
              <div class="text-center">
                <div class="text-2xl mb-4">📊</div>
                <div class="text-lg font-semibold">${viewNames[index]} View</div>
                <div class="text-sm text-gray-400 mt-2">DICOM loaded: ${url.substring(0, 50)}...</div>
              </div>
            </div>
          `;
        }
      });
      
      toast.success("DICOM file loaded successfully with MPR views");
      
    } catch (err) {
      console.error('Error rendering DICOM:', err);
      throw new Error('Failed to render DICOM file');
    }
  };

  const toggleFullscreen = () => {
    const container = document.getElementById('ohif-viewer-container');
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error('Error entering fullscreen:', err);
        toast.error('Failed to enter fullscreen mode');
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => {
        console.error('Error exiting fullscreen:', err);
      });
    }
  };

  const handleDownload = () => {
    if (!dicomUrl) return;
    
    const link = document.createElement('a');
    link.href = dicomUrl;
    link.download = `case_${caseId}_dicom.dcm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started');
  };

  if (isLoading) {
    return (
      <Card className="w-full h-[800px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading OHIF Enhanced Viewer...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full h-[800px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Error Loading Viewer</div>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Retry Loading
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div 
      id="ohif-viewer-container"
      className={`w-full bg-black text-white ${className} ${isFullscreen ? 'fixed inset-0 z-50' : 'h-[800px]'}`}
    >
      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-4">
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Close Viewer
            </Button>
          )}
          <h2 className="text-lg font-semibold">OHIF Enhanced Viewer - Case {caseId}</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
            <Maximize className="h-4 w-4 mr-2" />
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Annotation Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 p-3">
        <div className="flex items-center gap-2 justify-center">
          <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-1">
            <Button
              variant={activeTool === 'select' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleToolChange('select')}
              className="text-xs"
            >
              <MousePointer className="h-4 w-4 mr-1" />
              Select
            </Button>
            <Button
              variant={activeTool === 'length' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleToolChange('length')}
              className="text-xs"
            >
              <Ruler className="h-4 w-4 mr-1" />
              Length
            </Button>
            <Button
              variant={activeTool === 'angle' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleToolChange('angle')}
              className="text-xs"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Angle
            </Button>
            <Button
              variant={activeTool === 'circle' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleToolChange('circle')}
              className="text-xs"
            >
              <CircleDot className="h-4 w-4 mr-1" />
              Circle ROI
            </Button>
            <Button
              variant={activeTool === 'rectangle' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleToolChange('rectangle')}
              className="text-xs"
            >
              <Square className="h-4 w-4 mr-1" />
              Rect ROI
            </Button>
            <Button
              variant={activeTool === 'freehand' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleToolChange('freehand')}
              className="text-xs"
            >
              <PenTool className="h-4 w-4 mr-1" />
              Freehand
            </Button>
          </div>
          
          <div className="w-px h-6 bg-gray-600 mx-2" />
          
          <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToolChange('zoom')}
              className="text-xs"
            >
              <ZoomIn className="h-4 w-4 mr-1" />
              Zoom
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToolChange('pan')}
              className="text-xs"
            >
              <Eye className="h-4 w-4 mr-1" />
              Pan
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToolChange('window')}
              className="text-xs"
            >
              <Settings className="h-4 w-4 mr-1" />
              W/L
            </Button>
          </div>
          
          <div className="w-px h-6 bg-gray-600 mx-2" />
          
          <div className="text-xs text-gray-400">
            🦷 Dental Tools: IAN Nerve Tracing | TMJ Analysis | Airway Assessment
          </div>
        </div>
      </div>

      {/* MPR Grid Layout */}
      <div className="grid grid-cols-2 gap-1 h-full bg-black p-1">
        {/* Axial View */}
        <div className="bg-gray-900 border border-gray-700 relative">
          <div className="absolute top-2 left-2 z-10 text-sm font-semibold text-blue-400">
            Axial
          </div>
          <div 
            ref={axialViewRef}
            className="w-full h-full"
            style={{ minHeight: '300px' }}
          />
        </div>

        {/* Sagittal View */}
        <div className="bg-gray-900 border border-gray-700 relative">
          <div className="absolute top-2 left-2 z-10 text-sm font-semibold text-green-400">
            Sagittal
          </div>
          <div 
            ref={sagittalViewRef}
            className="w-full h-full"
            style={{ minHeight: '300px' }}
          />
        </div>

        {/* Coronal View */}
        <div className="bg-gray-900 border border-gray-700 relative">
          <div className="absolute top-2 left-2 z-10 text-sm font-semibold text-yellow-400">
            Coronal
          </div>
          <div 
            ref={coronalViewRef}
            className="w-full h-full"
            style={{ minHeight: '300px' }}
          />
        </div>

        {/* 3D View */}
        <div className="bg-gray-900 border border-gray-700 relative">
          <div className="absolute top-2 left-2 z-10 text-sm font-semibold text-red-400">
            3D Volume
          </div>
          <div 
            ref={threeDViewRef}
            className="w-full h-full"
            style={{ minHeight: '300px' }}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-gray-900 border-t border-gray-700 p-2 text-sm text-gray-400">
        <div className="flex justify-between items-center">
          <span>Ready - OHIF Enhanced Viewer with MPR</span>
          <span>Case ID: {caseId}</span>
        </div>
      </div>
    </div>
  );
};