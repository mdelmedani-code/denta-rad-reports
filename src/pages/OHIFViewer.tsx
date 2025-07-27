import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OHIFEnhancedViewer } from "@/components/OHIFEnhancedViewer";

interface StudyInfo {
  studyUID: string;
  caseId: string;
  seriesCount: number;
  instanceCount: number;
  patientName?: string;
  studyDescription?: string;
  studyDate?: string;
}

export const OHIFViewer = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studyInfo, setStudyInfo] = useState<StudyInfo | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);
  
  const studyInstanceUIDs = searchParams.get('StudyInstanceUIDs');
  const caseId = searchParams.get('caseId');
  
  console.log('OHIF Viewer - URL params:', { studyInstanceUIDs, caseId });

  useEffect(() => {
    if (!studyInstanceUIDs || !caseId) {
      setError('Missing required parameters: StudyInstanceUIDs and caseId');
      setIsLoading(false);
      return;
    }

    // Auto-launch the viewer after a short delay
    const timer = setTimeout(() => {
      setShowViewer(true);
      setIsLoading(false);
    }, 1000);

    loadStudyData();

    return () => clearTimeout(timer);
  }, [studyInstanceUIDs, caseId]);

  const loadStudyData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Test DICOMweb server connection
      const studiesUrl = `https://swusayoygknritombbwg.supabase.co/functions/v1/dicomweb-server/studies?caseId=${caseId}`;
      console.log('Querying studies:', studiesUrl);
      
      const studiesResponse = await fetch(studiesUrl, {
        headers: {
          'Accept': 'application/dicom+json'
        }
      });
      
      if (!studiesResponse.ok) {
        throw new Error(`DICOMweb server error: ${studiesResponse.status} ${studiesResponse.statusText}`);
      }
      
      const studies = await studiesResponse.json();
      console.log('Studies response:', studies);
      
      if (!studies || studies.length === 0) {
        throw new Error('No studies found for this case');
      }
      
      const study = studies[0];
      
      // Query series for this study
      const seriesUrl = `https://swusayoygknritombbwg.supabase.co/functions/v1/dicomweb-server/studies/${studyInstanceUIDs}/series?caseId=${caseId}`;
      console.log('Querying series:', seriesUrl);
      
      const seriesResponse = await fetch(seriesUrl, {
        headers: {
          'Accept': 'application/dicom+json'
        }
      });
      
      let seriesCount = 1;
      let instanceCount = 1;
      
      if (seriesResponse.ok) {
        const series = await seriesResponse.json();
        seriesCount = series.length;
        
        // Get instance count from first series
        if (series.length > 0 && series[0]["00201209"]) {
          instanceCount = series[0]["00201209"].Value[0];
        }
      }
      
      setStudyInfo({
        studyUID: studyInstanceUIDs,
        caseId: caseId,
        seriesCount,
        instanceCount,
        patientName: study["00100010"]?.Value?.[0]?.Alphabetic || 'Unknown Patient',
        studyDescription: study["00081030"]?.Value?.[0] || 'CBCT Study',
        studyDate: study["00080020"]?.Value?.[0] || '',
      });
      
    } catch (error) {
      console.error('Error loading study data:', error);
      setError(`Failed to load study data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const openEnhancedViewer = () => {
    setShowViewer(true);
  };

  const closeEnhancedViewer = () => {
    setShowViewer(false);
  };

  const downloadDICOM = async () => {
    try {
      const instanceUrl = `https://swusayoygknritombbwg.supabase.co/functions/v1/dicomweb-server/studies/${studyInstanceUIDs}/series/${studyInstanceUIDs}.1/instances/${studyInstanceUIDs}.1.1?caseId=${caseId}`;
      window.open(instanceUrl, '_blank');
    } catch (error) {
      console.error('Error downloading DICOM:', error);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString.length !== 8) return dateString;
    return `${dateString.slice(0, 4)}-${dateString.slice(4, 6)}-${dateString.slice(6, 8)}`;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="outline" 
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">DICOM Viewer</h1>
          </div>
          
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <div className="mt-2 text-sm opacity-80">
                Please ensure the case exists and contains valid DICOM data.
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Loading DICOM Study</h2>
          <p className="text-muted-foreground">Connecting to DICOMweb server...</p>
          {studyInstanceUIDs && (
            <p className="text-sm text-muted-foreground mt-2">Study: {studyInstanceUIDs}</p>
          )}
          {caseId && (
            <p className="text-sm text-muted-foreground">Case: {caseId}</p>
          )}
        </div>
      </div>
    );
  }

  if (showViewer && studyInfo) {
    return (
      <div className="h-screen w-full">
        <OHIFEnhancedViewer
          caseId={studyInfo.caseId}
          filePath="" // Not used for DICOMweb
          onClose={closeEnhancedViewer}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">DICOM Viewer</h1>
              <p className="text-muted-foreground">DentaRad DICOMweb Integration</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadDICOM} className="gap-2">
              <Download className="w-4 h-4" />
              Download
            </Button>
            <Button onClick={openEnhancedViewer} className="gap-2">
              <ExternalLink className="w-4 h-4" />
              Open Viewer
            </Button>
          </div>
        </div>

        {/* Study Information */}
        {studyInfo && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Study Details */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Study Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Patient Name</label>
                    <p className="text-sm font-mono">{studyInfo.patientName}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Study Description</label>
                    <p className="text-sm">{studyInfo.studyDescription}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Study Date</label>
                    <p className="text-sm">{formatDate(studyInfo.studyDate || '')}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Study UID</label>
                    <p className="text-xs font-mono break-all">{studyInfo.studyUID}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Case ID</label>
                    <p className="text-sm font-mono">{studyInfo.caseId}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Series Count</span>
                    <span className="text-sm font-medium">{studyInfo.seriesCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Instance Count</span>
                    <span className="text-sm font-medium">{studyInfo.instanceCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Server Status</span>
                    <span className="text-sm font-medium text-green-600">Connected</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Viewer Preview */}
            <div className="lg:col-span-2">
              <Card className="h-96">
                <CardContent className="h-full flex items-center justify-center p-6">
                  <div className="text-center">
                    <div className="w-24 h-24 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center mb-4 mx-auto">
                      <svg className="w-10 h-10 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">DICOM Study Ready</h3>
                    <p className="text-muted-foreground mb-4">
                      Study loaded with {studyInfo.instanceCount} instance{studyInfo.instanceCount !== 1 ? 's' : ''}
                    </p>
                    <Button onClick={openEnhancedViewer} size="lg" className="gap-2">
                      <ExternalLink className="w-4 h-4" />
                      Launch DICOM Viewer
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Full OHIF-compatible viewer with all medical imaging tools
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};