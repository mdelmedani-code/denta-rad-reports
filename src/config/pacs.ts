// PACS Configuration for Orthanc + DICOMweb Integration
export const PACS_CONFIG = {
  // Development/Current - Using Supabase edge function
  development: {
    dicomweb: {
      wadoRs: 'https://swusayoygknritombbwg.supabase.co/functions/v1/dicomweb-server/wado',
      qidoRs: 'https://swusayoygknritombbwg.supabase.co/functions/v1/dicomweb-server/qido', 
      stowRs: 'https://swusayoygknritombbwg.supabase.co/functions/v1/dicomweb-server/stow'
    },
    auth: {
      type: 'supabase',
      headers: {} // Will be populated with Supabase auth headers
    }
  },
  
  // Production - Orthanc PACS Server (configure these URLs when Orthanc is deployed)
  production: {
    dicomweb: {
      wadoRs: 'https://pacs.dentarad.com/dicom-web/wado',
      qidoRs: 'https://pacs.dentarad.com/dicom-web/qido',
      stowRs: 'https://pacs.dentarad.com/dicom-web/stow'
    },
    auth: {
      type: 'orthanc',
      headers: {
        'Authorization': 'Bearer {token}' // Will be populated with Orthanc auth token
      }
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
  const pacsConfig = getCurrentPACSConfig();
  
  return {
    routerBasename: '/viewer',
    whiteLabeling: {
      createLogoComponentFn: () => null, // Can customize with DentaRad logo
    },
    defaultDataSourceName: 'dicomweb',
    dataSources: [
      {
        namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
        sourceName: 'dicomweb',
        configuration: {
          friendlyName: 'DentaRad PACS',
          name: 'aws',
          wadoUriRoot: pacsConfig.dicomweb.wadoRs,
          qidoRoot: pacsConfig.dicomweb.qidoRs,
          wadoRoot: pacsConfig.dicomweb.wadoRs,
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
            headers: pacsConfig.auth.headers
          }
        }
      }
    ],
    
    // Default study to load if StudyInstanceUID provided
    ...(studyInstanceUID && {
      defaultRoutes: [
        {
          path: '/viewer',
          children: [
            {
              path: `/${studyInstanceUID}`,
              component: 'ViewerRoute',
            },
          ],
        },
      ]
    })
  };
};

// Orthanc Study Upload Configuration
export const ORTHANC_UPLOAD_CONFIG = {
  endpoint: getCurrentPACSConfig().dicomweb.stowRs,
  maxFileSize: 500 * 1024 * 1024, // 500MB max per file
  supportedFormats: ['.dcm', '.zip', '.tar', '.tar.gz'],
  chunkSize: 5 * 1024 * 1024, // 5MB chunks for large file upload
};