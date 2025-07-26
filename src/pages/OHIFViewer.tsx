import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

declare global {
  interface Window {
    OHIFViewer: any;
  }
}

export const OHIFViewer = () => {
  const [searchParams] = useSearchParams();
  const viewerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const config = searchParams.get('config');
    const studyInstanceUIDs = searchParams.get('studyInstanceUIDs');
    const caseId = searchParams.get('caseId');
    
    if (!config && !studyInstanceUIDs) return;

    try {
      let parsedConfig;
      if (config) {
        parsedConfig = JSON.parse(decodeURIComponent(config));
      } else {
        // Create minimal config for DICOMweb
        parsedConfig = {
          studyInstanceUIDs: [studyInstanceUIDs],
          caseId: caseId,
        };
      }
      
      // Load OHIF scripts dynamically
      const loadOHIF = async () => {
        // Check if OHIF is already loaded
        if (window.OHIFViewer) {
          initializeOHIF(parsedConfig);
          return;
        }

        // Load OHIF CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/@ohif/viewer@4.12.51/dist/index.css';
        document.head.appendChild(link);

        // Load OHIF JavaScript
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@ohif/viewer@4.12.51/dist/index.umd.js';
        script.onload = () => {
          initializeOHIF(parsedConfig);
        };
        document.head.appendChild(script);
      };

      const initializeOHIF = (config: any) => {
        if (window.OHIFViewer && viewerRef.current) {
          try {
            // OHIF v3 configuration
            const ohifConfig = {
              routerBasename: '/ohif-viewer',
              showStudyList: false,
              useSharedArrayBuffer: 'AUTO',
              dataSources: config.dataSources || [
                {
                  sourceName: 'dicomweb',
                  namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
                  configuration: {
                    friendlyName: 'DentaRad CBCT Server',
                    name: 'dicomweb',
                    wadoUriRoot: `https://swusayoygknritombbwg.supabase.co/functions/v1/dicomweb-server/wado`,
                    qidoRoot: `https://swusayoygknritombbwg.supabase.co/functions/v1/dicomweb-server/qido`,
                    wadoRoot: `https://swusayoygknritombbwg.supabase.co/functions/v1/dicomweb-server/wado`,
                    qidoSupportsIncludeField: false,
                    supportsReject: false,
                    imageRendering: 'wadors',
                    thumbnailRendering: 'wadors',
                    enableStudyLazyLoad: true,
                    supportsFuzzyMatching: false,
                    supportsWildcard: false,
                    staticWado: true,
                    singlepart: 'bulkdata,video',
                    requestOptions: {
                      headers: {
                        'X-Case-ID': config.caseId,
                      },
                    },
                  },
                },
              ],
              defaultDataSourceName: 'dicomweb',
            };

            // Initialize OHIF viewer
            const viewer = new window.OHIFViewer(ohifConfig);
            
            if (config.studyInstanceUIDs && config.studyInstanceUIDs.length > 0) {
              // Pre-load study
              viewer.loadStudy(config.studyInstanceUIDs[0]);
            }
            
            console.log('OHIF Viewer initialized successfully');
          } catch (error) {
            console.error('Error initializing OHIF viewer:', error);
          }
        }
      };

      loadOHIF();
    } catch (error) {
      console.error('Error loading OHIF configuration:', error);
    }
  }, [searchParams]);

  return (
    <div className="w-full h-screen bg-black">
      <div ref={viewerRef} className="w-full h-full" />
      {!searchParams.get('config') && (
        <div className="flex items-center justify-center h-full text-white">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">OHIF Viewer</h1>
            <p>No configuration provided</p>
          </div>
        </div>
      )}
    </div>
  );
};