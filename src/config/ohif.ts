// OHIF Viewer Configuration for DentaRad
export const getOHIFConfig = (caseId: string, studyInstanceUID?: string) => {
  const dicomWebRoot = `https://swusayoygknritombbwg.supabase.co/functions/v1/dicomweb-server`;
  
  return {
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
          wadoUriRoot: `${dicomWebRoot}?caseId=${caseId}`,
          qidoRoot: `${dicomWebRoot}?caseId=${caseId}`,
          wadoRoot: `${dicomWebRoot}?caseId=${caseId}`,
          qidoSupportsIncludeField: false,
          supportsReject: false,
          imageRendering: 'wadors',
          thumbnailRendering: 'wadors',
          enableStudyLazyLoad: true,
          supportsFuzzyMatching: false,
          supportsWildcard: true,
          staticWado: true,
          singlepart: 'bulkdata,video',
          // Custom headers for authentication
          requestOptions: {
            mode: 'cors',
            headers: {
              'Accept': 'application/dicom+json',
              'Content-Type': 'application/dicom+json',
            },
          },
          // Custom URL builder to include caseId
          dicomWebPathBuilder: (studyInstanceUID: string, seriesInstanceUID?: string, sopInstanceUID?: string) => {
            let url = `/studies/${studyInstanceUID}`;
            
            if (seriesInstanceUID) {
              url += `/series/${seriesInstanceUID}`;
            }
            
            if (sopInstanceUID) {
              url += `/instances/${sopInstanceUID}`;
            }
            
            // Always append caseId parameter
            const separator = url.includes('?') ? '&' : '?';
            url += `${separator}caseId=${caseId}`;
            
            return url;
          },
        },
      },
    ],
    defaultDataSourceName: 'dicomweb',
    // Default route configuration
    ...(studyInstanceUID && {
      defaultRoute: `/viewer?StudyInstanceUIDs=${studyInstanceUID}&caseId=${caseId}`,
    }),
  };
};

// OHIF URL builder
export const buildOHIFUrl = (caseId: string, studyInstanceUID?: string) => {
  const baseUrl = '/ohif-viewer';
  const params = new URLSearchParams();
  
  if (studyInstanceUID) {
    params.append('StudyInstanceUIDs', studyInstanceUID);
  } else {
    // Generate synthetic study UID if not provided
    const syntheticStudyUID = `1.2.826.0.1.3680043.8.498.${caseId.replace(/-/g, '')}`;
    params.append('StudyInstanceUIDs', syntheticStudyUID);
  }
  
  params.append('caseId', caseId);
  
  return `${baseUrl}?${params.toString()}`;
};

// OHIF Viewer initialization
export const initializeOHIFViewer = (containerId: string, config: any) => {
  // This would typically initialize the OHIF viewer
  // For now, we'll use our custom viewer implementation
  console.log('Initializing OHIF viewer with config:', config);
  return {
    destroy: () => {
      console.log('Destroying OHIF viewer');
    }
  };
};