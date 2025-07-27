import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";

interface OHIFEnhancedViewerProps {
  caseId: string;
  filePath: string | null;
  onClose?: () => void;
  className?: string;
}

export const OHIFEnhancedViewer = ({ caseId, filePath, onClose, className = "" }: OHIFEnhancedViewerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ohifApp, setOhifApp] = useState<any>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!caseId) {
      setError('No case ID provided');
      setIsLoading(false);
      return;
    }

    initializeOHIF();

    return () => {
      if (ohifApp) {
        // Cleanup OHIF when component unmounts
        try {
          ohifApp.destroy?.();
        } catch (e) {
          console.warn('Error destroying OHIF app:', e);
        }
      }
    };
  }, [caseId]);

  const initializeOHIF = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Dynamic import of OHIF
      const { default: OHIFViewer } = await import('@ohif/viewer');
      
      if (!viewerRef.current) {
        throw new Error('Viewer container not found');
      }

      // Generate study UID
      const isPACSStudy = filePath && (filePath.includes('1.2.840.10008') || filePath.length > 50);
      const studyUID = isPACSStudy ? filePath : `1.2.826.0.1.3680043.8.498.${caseId.replace(/-/g, '')}`;

      // OHIF Configuration
      const config = {
        routerBasename: '/',
        whiteLabeling: {
          createLogoComponentFn: function(React: any) {
            return React.createElement(
              'div',
              {
                style: {
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  padding: '8px 16px',
                }
              },
              'DentaRad OHIF Viewer'
            );
          },
        },
        extensions: [],
        modes: [],
        showStudyList: false,
        dataSources: [
          {
            namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
            sourceName: 'dicomweb',
            configuration: {
              friendlyName: 'DentaRad DICOMweb Server',
              name: 'dentarad',
              wadoUriRoot: `https://swusayoygknritombbwg.supabase.co/functions/v1/dicomweb-server?caseId=${caseId}`,
              qidoRoot: `https://swusayoygknritombbwg.supabase.co/functions/v1/dicomweb-server?caseId=${caseId}`,
              wadoRoot: `https://swusayoygknritombbwg.supabase.co/functions/v1/dicomweb-server?caseId=${caseId}`,
              qidoSupportsIncludeField: false,
              supportsReject: false,
              imageRendering: 'wadors',
              thumbnailRendering: 'wadors',
              enableStudyLazyLoad: true,
              supportsFuzzyMatching: false,
              supportsWildcard: true,
              staticWado: true,
              singlepart: 'bulkdata,video',
              requestOptions: {
                mode: 'cors',
                headers: {
                  'Accept': 'application/dicom+json',
                  'Content-Type': 'application/dicom+json',
                },
              },
            },
          },
        ],
        defaultDataSourceName: 'dicomweb',
      };

      // Initialize OHIF viewer
      const app = new OHIFViewer({
        container: viewerRef.current,
        config,
        studyInstanceUIDs: [studyUID],
      });

      await app.init();
      setOhifApp(app);
      setIsLoading(false);

    } catch (error) {
      console.error('Error initializing OHIF:', error);
      setError(`Failed to initialize OHIF viewer: ${error.message}`);
      setIsLoading(false);
    }
  };

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

      {/* OHIF Viewer Container */}
      <div 
        ref={viewerRef}
        className="w-full h-full bg-black"
        style={{ minHeight: 'calc(100vh - 48px)' }}
      />
    </div>
  );
};