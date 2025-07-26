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
    if (!config) return;

    try {
      const parsedConfig = JSON.parse(decodeURIComponent(config));
      
      // Load OHIF scripts dynamically
      const loadOHIF = async () => {
        // Load OHIF CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/@ohif/viewer@4.12.51/dist/index.css';
        document.head.appendChild(link);

        // Load OHIF JavaScript
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@ohif/viewer@4.12.51/dist/index.umd.js';
        script.onload = () => {
          if (window.OHIFViewer && viewerRef.current) {
            // Initialize OHIF viewer
            const viewer = new window.OHIFViewer({
              container: viewerRef.current,
              studies: [{
                StudyInstanceUID: parsedConfig.studyInstanceUIDs[0],
                StudyDescription: parsedConfig.studyDescription,
                PatientName: parsedConfig.patientName,
                series: [{
                  SeriesInstanceUID: parsedConfig.seriesInstanceUIDs[0],
                  instances: [{
                    SOPInstanceUID: parsedConfig.sopInstanceUIDs[0],
                    url: parsedConfig.url
                  }]
                }]
              }]
            });
          }
        };
        document.head.appendChild(script);
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