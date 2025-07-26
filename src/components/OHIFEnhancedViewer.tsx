import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft, Download, Maximize, Settings, Ruler, CircleDot, Square, 
  MousePointer, PenTool, Eye, RotateCcw, ZoomIn, ZoomOut, Save, 
  Play, Pause, SkipBack, SkipForward, Monitor, Contrast, 
  Move, RotateCw, Home, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Crosshair, Grid, Info, ScrollText, Layers, RotateCcw as Flip, 
  Search, Bookmark, FileImage, Palette, Target, Maximize2, Minimize2,
  ScanLine, Volume2, Zap, Link, Gauge, Activity, Brain,
  Binary, Calculator, MapPin, Copy, RefreshCw, Camera, Printer,
  Layout, MoreHorizontal, Filter, Lightbulb, Focus, Slice,
  Menu, X, AlertCircle
} from "lucide-react";
import * as cornerstone from "@cornerstonejs/core";
import * as cornerstoneTools from "@cornerstonejs/tools";
import cornerstoneDICOMImageLoader from "@cornerstonejs/dicom-image-loader";
import cornerstoneStreamingImageVolumeLoader from "@cornerstonejs/streaming-image-volume-loader";
import { DentalTools } from "./DentalTools";
import { useAuth } from "@/hooks/useAuth";

interface OHIFEnhancedViewerProps {
  caseId: string;
  filePath: string | null;
  onClose?: () => void;
  className?: string;
}

// Enterprise-level DICOM viewer state - matching professional viewers
interface ViewerState {
  currentSlice: number;
  totalSlices: number;
  windowWidth: number;
  windowCenter: number;
  zoom: number;
  pan: { x: number; y: number };
  rotation: number;
  isPlaying: boolean;
  playbackSpeed: number;
  crosshairPosition: { x: number; y: number };
  showCrosshairs: boolean;
  showOverlays: boolean;
  showReferenceLines: boolean;
  maximizedView: number | null;
  scrollMode: boolean;
  syncronizedScrolling: boolean;
}

interface MPRViews {
  axial: HTMLDivElement | null;
  sagittal: HTMLDivElement | null;
  coronal: HTMLDivElement | null;
  '3d': HTMLDivElement | null;
}

export const OHIFEnhancedViewer = ({ caseId, filePath, onClose, className = "" }: OHIFEnhancedViewerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTool, setActiveTool] = useState('Select');
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const { user } = useAuth();

  // Professional DICOM viewer state
  const [viewerState, setViewerState] = useState<ViewerState>({
    currentSlice: 1,
    totalSlices: 1,
    windowWidth: 2000,
    windowCenter: 0,
    zoom: 1.0,
    pan: { x: 0, y: 0 },
    rotation: 0,
    isPlaying: false,
    playbackSpeed: 1,
    crosshairPosition: { x: 0, y: 0 },
    showCrosshairs: false,
    showOverlays: true,
    showReferenceLines: false,
    maximizedView: null,
    scrollMode: false,
    syncronizedScrolling: true
  });

  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // Initialize Cornerstone
  useEffect(() => {
    const initCornerstone = async () => {
      try {
        await cornerstone.init();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize Cornerstone:', error);
        setError('Failed to initialize DICOM viewer');
      }
    };

    initCornerstone();
  }, []);

  // Get file URL
  useEffect(() => {
    if (!filePath) {
      console.log('No file path provided');
      setError('No DICOM file path available');
      return;
    }

    const getFileUrl = async () => {
      try {
        console.log('Attempting to get signed URL for path:', filePath);
        
        // First check if file exists
        const { data: fileData, error: fileError } = await supabase.storage
          .from('cbct-scans')
          .list(filePath.substring(0, filePath.lastIndexOf('/')), {
            limit: 100,
            search: filePath.substring(filePath.lastIndexOf('/') + 1)
          });

        console.log('File list result:', fileData, fileError);

        if (fileError || !fileData || fileData.length === 0) {
          console.error('File not found in storage:', filePath);
          setError(`DICOM file not found: ${filePath}`);
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.storage
          .from('cbct-scans')
          .createSignedUrl(filePath, 3600);
        
        if (error) {
          console.error('Error creating signed URL:', error);
          setError(`Failed to access DICOM file: ${error.message}`);
        } else if (data?.signedUrl) {
          console.log('Successfully got signed URL:', data.signedUrl);
          setFileUrl(data.signedUrl);
        } else {
          setError('Failed to get file URL');
        }
      } catch (error) {
        console.error('Error getting file URL:', error);
        setError('Failed to load DICOM file');
      } finally {
        setIsLoading(false);
      }
    };

    getFileUrl();
  }, [filePath]);

  const handleToolChange = (tool: string) => {
    setActiveTool(tool);
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.pageY });
    setShowContextMenu(true);
  };

  const handleContextMenuAction = (action: string) => {
    setShowContextMenu(false);
    
    switch (action) {
      case 'showToolbar':
        setIsToolbarCollapsed(false);
        break;
      case 'select':
        setActiveTool('Select');
        break;
      case 'zoom':
        setActiveTool('Zoom');
        break;
      case 'pan':
        setActiveTool('Pan');
        break;
      case 'wwwc':
        setActiveTool('WindowLevel');
        break;
      case 'length':
        setActiveTool('Length');
        break;
      case 'rectangle':
        setActiveTool('RectangleROI');
        break;
      case 'probe':
        setActiveTool('Probe');
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const handleClickOutside = () => setShowContextMenu(false);
    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);

  if (isLoading || !isInitialized) {
    return (
      <Card className="w-full h-[600px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium">Loading DICOM Viewer...</p>
          <p className="text-sm text-muted-foreground">Initializing medical imaging engine</p>
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
    <div className="flex flex-col h-full bg-black">
      {/* Minimal Header - Only when toolbar is visible */}
      {!isToolbarCollapsed && (
        <div className="flex items-center justify-between p-2 bg-gray-900 border-b border-gray-700 min-h-[48px]">
          <div className="flex items-center gap-2">
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-gray-700">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <span className="text-sm text-gray-300">DICOM Viewer</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsToolbarCollapsed(true)}
              className="text-white hover:bg-gray-700"
              title="Hide toolbar for maximum viewing space"
            >
              <X className="h-4 w-4" />
              Hide Tools
            </Button>
          </div>
        </div>
      )}

      {/* Collapsible Toolbar */}
      {!isToolbarCollapsed && (
        <div className="bg-gray-800 border-b border-gray-700 p-2">
          <div className="flex items-center gap-1 justify-center flex-wrap">
            {/* Essential Tools */}
            <Button
              variant={activeTool === 'Select' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleToolChange('Select')}
              className="text-white"
              title="Select/Navigate"
            >
              <MousePointer className="h-4 w-4" />
            </Button>
            <Button
              variant={activeTool === 'Zoom' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleToolChange('Zoom')}
              className="text-white"
              title="Zoom"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant={activeTool === 'Pan' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleToolChange('Pan')}
              className="text-white"
              title="Pan"
            >
              <Move className="h-4 w-4" />
            </Button>
            <Button
              variant={activeTool === 'WindowLevel' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleToolChange('WindowLevel')}
              className="text-white"
              title="Window/Level"
            >
              <Contrast className="h-4 w-4" />
            </Button>
            <Button
              variant={activeTool === 'Length' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleToolChange('Length')}
              className="text-white"
              title="Length Measurement"
            >
              <Ruler className="h-4 w-4" />
            </Button>
            <Button
              variant={activeTool === 'RectangleROI' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleToolChange('RectangleROI')}
              className="text-white"
              title="Rectangle ROI"
            >
              <Square className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Main DICOM Viewing Area - Maximum Screen Real Estate */}
      <div className="flex-1 relative bg-black" onContextMenu={handleRightClick}>
        {fileUrl ? (
          <div className="w-full h-full flex items-center justify-center">
            <img 
              src={fileUrl} 
              alt="DICOM"
              className="max-w-full max-h-full object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-white">
            <div className="text-center">
              <FileImage className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p>No DICOM file available</p>
            </div>
          </div>
        )}

        {/* Right-click Context Menu */}
        {showContextMenu && (
          <div 
            className="fixed bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 py-1 min-w-[200px]"
            style={{ 
              left: contextMenuPosition.x, 
              top: contextMenuPosition.y 
            }}
          >
            <button
              className="w-full px-3 py-2 text-left text-white hover:bg-gray-700 flex items-center gap-2"
              onClick={() => handleContextMenuAction('select')}
            >
              <MousePointer className="h-4 w-4" />
              Select Tool
            </button>
            <button
              className="w-full px-3 py-2 text-left text-white hover:bg-gray-700 flex items-center gap-2"
              onClick={() => handleContextMenuAction('zoom')}
            >
              <ZoomIn className="h-4 w-4" />
              Zoom Tool
            </button>
            <button
              className="w-full px-3 py-2 text-left text-white hover:bg-gray-700 flex items-center gap-2"
              onClick={() => handleContextMenuAction('pan')}
            >
              <Move className="h-4 w-4" />
              Pan Tool
            </button>
            <button
              className="w-full px-3 py-2 text-left text-white hover:bg-gray-700 flex items-center gap-2"
              onClick={() => handleContextMenuAction('wwwc')}
            >
              <Contrast className="h-4 w-4" />
              Window/Level
            </button>
            <div className="border-t border-gray-600 my-1"></div>
            <button
              className="w-full px-3 py-2 text-left text-white hover:bg-gray-700 flex items-center gap-2"
              onClick={() => handleContextMenuAction('length')}
            >
              <Ruler className="h-4 w-4" />
              Length Measurement
            </button>
            <button
              className="w-full px-3 py-2 text-left text-white hover:bg-gray-700 flex items-center gap-2"
              onClick={() => handleContextMenuAction('rectangle')}
            >
              <Square className="h-4 w-4" />
              Rectangle ROI
            </button>
            <button
              className="w-full px-3 py-2 text-left text-white hover:bg-gray-700 flex items-center gap-2"
              onClick={() => handleContextMenuAction('probe')}
            >
              <Target className="h-4 w-4" />
              Density Probe
            </button>
            <div className="border-t border-gray-600 my-1"></div>
            <button
              className="w-full px-3 py-2 text-left text-white hover:bg-gray-700 flex items-center gap-2"
              onClick={() => handleContextMenuAction('showToolbar')}
            >
              <Menu className="h-4 w-4" />
              Show Toolbar
            </button>
          </div>
        )}
      </div>

      {/* Collapsible Dental Tools - Only when toolbar is visible */}
      {!isToolbarCollapsed && (
        <div className="border-t border-gray-700">
          <DentalTools 
            onToolActivate={handleToolChange}
            activeTool={activeTool}
            isReportingMode={true}
          />
        </div>
      )}
    </div>
  );
};