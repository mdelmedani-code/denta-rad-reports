import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, ArrowLeft, FileText, Calendar, User, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ReportPDF } from '@/components/ReportPDF';

const ViewerPage = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseData, setCaseData] = useState<any>(null);
  const [metadataOpen, setMetadataOpen] = useState(false);

  useEffect(() => {
    if (caseId) {
      loadCaseData();
    }
  }, [caseId]);

  const loadCaseData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: caseError } = await supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .single();

      if (caseError) throw caseError;
      if (!data) throw new Error('Case not found');

      setCaseData(data);
    } catch (err) {
      console.error('Error loading case:', err);
      setError(err instanceof Error ? err.message : 'Failed to load case');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDicom = async () => {
    if (!caseData?.file_path) {
      toast({
        title: "Download Error",
        description: "No DICOM file available for this case",
        variant: "destructive",
      });
      return;
    }

    try {
      setDownloading(true);
      const { data, error } = await supabase.storage
        .from('cbct-scans')
        .download(caseData.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `case_${caseId}_dicom.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
      case 'report_ready':
        return 'default';
      case 'processing':
      case 'awaiting_report':
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

              {/* Collapsible Metadata */}
              {caseData?.dicom_metadata && Object.keys(caseData.dicom_metadata).length > 0 && (
                <Collapsible open={metadataOpen} onOpenChange={setMetadataOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span>View DICOM Metadata</span>
                      <span className="text-xs text-muted-foreground">
                        {metadataOpen ? 'Hide' : 'Show'}
                      </span>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4">
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-96">
                      {JSON.stringify(caseData.dicom_metadata, null, 2)}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>

            <Separator />

            {/* Download Section */}
            <div className="space-y-4">
              <Button 
                onClick={handleDownloadDicom} 
                disabled={!caseData?.file_path || downloading}
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
          </CardContent>
        </Card>

        {/* Info Box - External Viewers */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">How to View DICOM Files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              After downloading the DICOM ZIP file, extract it and open the files using professional DICOM viewing software:
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="font-semibold text-sm">macOS Viewers</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Horos (Free)</li>
                  <li>• OsiriX (Free/Paid)</li>
                  <li>• 3D Slicer (Free)</li>
                </ul>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-sm">Windows Viewers</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• RadiAnt DICOM Viewer (Paid)</li>
                  <li>• MicroDicom (Free)</li>
                  <li>• 3D Slicer (Free)</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic">
              These professional desktop applications provide advanced tools for viewing, measuring, and analyzing CBCT scans.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ViewerPage;
