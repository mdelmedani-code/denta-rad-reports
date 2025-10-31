import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, ArrowLeft, FileText, Calendar, User, Activity, AlertTriangle, Clock, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { logCaseView, logUnauthorizedAccess, logDicomDownload } from "@/lib/auditLog";
import { ImageGallery } from "@/components/ImageGallery";

const ViewerPage = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseData, setCaseData] = useState<any>(null);
  const [reportImages, setReportImages] = useState<any[]>([]);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (caseId) {
      loadCaseData();
    }
  }, [caseId]);

  const loadCaseData = async () => {
    if (!caseId) {
      navigate('/dashboard');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: caseError } = await supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .single();

      if (caseError || !data) {
        setAccessDenied(true);
        await logUnauthorizedAccess('case', caseId);
        
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to view this case',
          variant: 'destructive',
          duration: 5000
        });
        
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
        
        return;
      }

      await logCaseView(caseId);
      setCaseData(data);

      // Load report images if case has a report
      if (data.status === 'report_ready') {
        const { data: imagesData } = await supabase
          .from('report_images')
          .select('*')
          .eq('case_id', caseId)
          .order('position');
        
        if (imagesData) {
          setReportImages(imagesData);
        }
      }
    } catch (err) {
      console.error('Error loading case:', err);
      setError(err instanceof Error ? err.message : 'Failed to load case');
      
      toast({
        title: 'Error Loading Case',
        description: 'Failed to load case details',
        variant: 'destructive'
      });
      
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDicom = async () => {
    try {
      setDownloading(true);
      
      const { data, error } = await supabase.functions.invoke('get-dropbox-file', {
        body: { caseId, fileType: 'scan' },
      });

      if (error) throw error;

      const blob = new Blob([data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `case_${caseId}_dicom.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await logDicomDownload(caseId!, caseData?.file_path || '');
      
      toast({
        title: "Download Started",
        description: "Your DICOM file is downloading",
      });
    } catch (err) {
      console.error('Download error:', err);
      toast({
        title: "Download Failed",
        description: err instanceof Error ? err.message : "Failed to download DICOM file",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const downloadReport = async () => {
    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-report-download-link', {
        body: { caseId },
      });

      if (error) throw error;

      if (!data?.downloadUrl) {
        throw new Error('No download URL received');
      }

      // Open download link in new tab
      window.open(data.downloadUrl, '_blank');

      toast({
        title: 'Report Ready',
        description: `Downloading ${data.filename}`,
      });
    } catch (error: any) {
      console.error('Download error:', error);
      
      if (error.message?.includes('not yet available')) {
        toast({
          title: 'Report Not Ready',
          description: 'Report is still being prepared. Please check back later.',
          variant: 'default',
        });
      } else if (error.message?.includes('not found')) {
        toast({
          title: 'Report Not Found',
          description: 'Report file not found in Dropbox. Please contact support.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Download Failed',
          description: error.message || 'Failed to download report PDF',
          variant: 'destructive',
        });
      }
    } finally {
      setDownloading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
      case 'report_ready':
        return 'default';
      case 'processing':
      case 'awaiting_report':
      case 'in_progress':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatFieldOfView = (fov: string) => {
    return fov?.replace(/_/g, ' ').toUpperCase() || 'N/A';
  };

  const calculateAge = (dob: string) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} years`;
  };

  if (!caseId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Case ID not provided</p>
            <Button onClick={() => navigate(-1)} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading case details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Case</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <div className="flex gap-2">
              <Button onClick={() => loadCaseData()} variant="default">
                Retry
              </Button>
              <Button onClick={() => navigate(-1)} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <div className="text-destructive mb-4">
            <AlertTriangle className="w-16 h-16 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            You do not have permission to view this case. This incident has been logged.
          </p>
          <p className="text-sm text-muted-foreground">
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  const isReportReady = caseData?.status === 'report_ready';

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back Button */}
        <Button 
          variant="outline" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Case Header Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">Case Details</CardTitle>
                <CardDescription>Case ID: {caseId}</CardDescription>
              </div>
              <Badge variant={getStatusBadgeVariant(caseData?.status)}>
                {caseData?.status?.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Patient Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Patient Information
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Patient Name</p>
                  <p className="font-medium">{caseData?.patient_name || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Age</p>
                  <p className="font-medium">{calculateAge(caseData?.patient_dob)}</p>
                </div>
                {caseData?.patient_internal_id && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Internal ID</p>
                    <p className="font-medium">{caseData.patient_internal_id}</p>
                  </div>
                )}
                {caseData?.patient_dob && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Date of Birth</p>
                    <p className="font-medium">{new Date(caseData.patient_dob).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Case Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Case Information
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Clinical Question</p>
                  <p className="font-medium">{caseData?.clinical_question}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Field of View</p>
                  <p className="font-medium">{formatFieldOfView(caseData?.field_of_view)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Urgency Level</p>
                  <p className="font-medium capitalize">{caseData?.urgency || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Upload Date</p>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {caseData?.created_at ? new Date(caseData.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* DICOM Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                DICOM Information
              </h3>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Series Count</p>
                  <p className="font-medium">{caseData?.series_count || 'Processing...'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Processed At</p>
                  <p className="font-medium">
                    {caseData?.processed_at ? new Date(caseData.processed_at).toLocaleString() : 'Not yet processed'}
                  </p>
                </div>
              </div>

              <Button 
                onClick={handleDownloadDicom} 
                disabled={downloading}
                size="lg"
                className="w-full md:w-auto"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download DICOM ZIP File
                  </>
                )}
              </Button>
            </div>

            <Separator />

            {/* Report Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Diagnostic Report</h3>

              {isReportReady ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Report completed on {caseData.completed_at ? new Date(caseData.completed_at).toLocaleString() : 'N/A'}
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={downloadReport} disabled={downloading}>
                      {downloading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Download Report PDF
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Report Images */}
                  {reportImages.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-md font-semibold mb-3 flex items-center gap-2">
                          <ImageIcon className="w-5 h-5" />
                          Report Images ({reportImages.length})
                        </h4>
                        <ImageGallery images={reportImages} />
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Report is being prepared by our radiologist. You will receive an email notification when it's ready.
                    {caseData?.urgency === 'urgent' && (
                      <p className="mt-2 font-semibold">
                        This case is marked as urgent and will be prioritized.
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ViewerPage;
