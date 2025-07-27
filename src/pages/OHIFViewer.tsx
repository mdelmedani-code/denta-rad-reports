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
    
    console.log('URL params:', { config: !!config, studyInstanceUIDs, caseId });
    
    if (!config && !studyInstanceUIDs) return;

    try {
      let parsedConfig;
      if (config) {
        parsedConfig = JSON.parse(decodeURIComponent(config));
        console.log('Using provided config:', parsedConfig);
      } else {
        // Create minimal config for DICOMweb - ensure proper study UID format
        const properStudyUID = studyInstanceUIDs?.startsWith('study.') ? studyInstanceUIDs : `study.${caseId}`;
        parsedConfig = {
          studyInstanceUIDs: [properStudyUID],
          caseId: caseId,
        };
        console.log('Created minimal config:', parsedConfig);
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
            console.log('Initializing OHIF with config:', config);
            
            // OHIF v3 configuration
            const ohifConfig = {
              routerBasename: '/ohif-viewer',
              showStudyList: false,
              useSharedArrayBuffer: 'AUTO',
              // Configure the data source to use our DICOMweb server
              dataSources: [
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
              // Use a simpler approach - directly pass the study data
              preLoadedStudy: config.studyInstanceUIDs ? {
                StudyInstanceUID: config.studyInstanceUIDs[0],
                StudyDescription: 'CBCT Scan',
                PatientName: `Patient-${config.caseId}`,
                series: [{
                  SeriesInstanceUID: `series.${config.caseId}.1`,
                  instances: [{
                    SOPInstanceUID: `instance.${config.caseId}.1.1`,
                    url: `https://swusayoygknritombbwg.supabase.co/functions/v1/dicomweb-server/wado/studies/${config.studyInstanceUIDs[0]}/series/series.${config.caseId}.1/instances/instance.${config.caseId}.1.1?caseId=${config.caseId}`
                  }]
                }]
              } : null,
            };

            // Initialize OHIF viewer
            const viewer = new window.OHIFViewer(ohifConfig);
            
            console.log('OHIF Viewer initialized successfully');
          } catch (error) {
            console.error('Error initializing OHIF viewer:', error);
            // Fallback: show error message
            if (viewerRef.current) {
              viewerRef.current.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: white; text-align: center;">
                  <div>
                    <h2>Error Loading DICOM Viewer</h2>
                    <p>There was an issue loading the DICOM data. Please try refreshing the page.</p>
                    <p style="font-size: 12px; opacity: 0.8;">Error: ${error.message}</p>
                  </div>
                </div>
              `;
            }
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