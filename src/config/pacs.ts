// PACS Configuration for Orthanc + DICOMweb Integration
export const PACS_CONFIG = {
  // Development/Current - Using your Orthanc PACS server
  development: {
    dicomweb: {
      wadoRs: 'http://116.203.35.168:8042/dicom-web/wado',
      qidoRs: 'http://116.203.35.168:8042/dicom-web/qido',
      stowRs: 'http://116.203.35.168:8042/dicom-web/stow'
    },
    auth: {
      type: 'proxy',
      headers: {}
    }
  },
  
  // Production - Orthanc PACS Server with SSL
  production: {
    dicomweb: {
      wadoRs: 'https://pacs.dentarad.co.uk/dicom-web/wado',
      qidoRs: 'https://pacs.dentarad.co.uk/dicom-web/qido',
      stowRs: 'https://pacs.dentarad.co.uk/dicom-web/stow'
    },
    auth: {
      type: 'proxy',
      headers: {}
    }
  }
};

// Get current PACS configuration based on environment
export const getCurrentPACSConfig = () => {
  const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';
  return PACS_CONFIG[environment];
};

// OHIF Configuration for Orthanc DICOMweb
export const getOHIFConfig = (studyInstanceUID?: string) => {
  return {
    routerBasename: '/',
    whiteLabeling: {
      createLogoComponentFn: () => null, // Can customize with DentaRad logo
    },
    showStudyList: true,
    defaultDataSourceName: 'dicomweb',
    dataSources: [
      {
        namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
        sourceName: 'dicomweb',
        configuration: {
          friendlyName: 'DentaRad PACS',
          name: 'Orthanc',
          // Use Supabase proxy to handle CORS and authentication
          wadoUriRoot: 'https://swusayoygknritombbwg.supabase.co/functions/v1/dicomweb-proxy',
          qidoRoot: 'https://swusayoygknritombbwg.supabase.co/functions/v1/dicomweb-proxy',
          wadoRoot: 'https://swusayoygknritombbwg.supabase.co/functions/v1/dicomweb-proxy',
          qidoSupportsIncludeField: true,
          supportsReject: true,
          imageRendering: 'wadors',
          thumbnailRendering: 'wadors',
          enableStudyLazyLoad: true,
          supportsFuzzyMatching: true,
          supportsWildcard: true,
        }
      }
    ],
    
    // Default study to load if StudyInstanceUID provided
    ...(studyInstanceUID && {
      defaultRoutes: {
        viewer: {
          path: '/viewer',
          params: {
            StudyInstanceUIDs: studyInstanceUID,
          },
        },
      },
    })
  };
};

// Orthanc Study Upload Configuration
export const ORTHANC_UPLOAD_CONFIG = {
  endpoint: 'https://swusayoygknritombbwg.supabase.co/functions/v1/dicomweb-proxy/stow',
  maxFileSize: 500 * 1024 * 1024, // 500MB max per file
  supportedFormats: ['.dcm', '.zip', '.tar', '.tar.gz'],
  chunkSize: 5 * 1024 * 1024, // 5MB chunks for large file upload
};