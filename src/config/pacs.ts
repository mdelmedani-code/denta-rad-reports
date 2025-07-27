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
      type: 'orthanc',
      headers: {
        'Authorization': 'Basic ' + btoa('admin:LionEagle0304!')
      }
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
      type: 'orthanc',
      headers: {
        'Authorization': 'Basic ' + btoa('admin:LionEagle0304!')
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