import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Eye, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AdminCaseReview() {
  const { id: caseId } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportExists, setReportExists] = useState(false);
  const [checkingReport, setCheckingReport] = useState(false);

  useEffect(() => {
    fetchCase();
    checkReportExists();
  }, [caseId]);

  async function fetchCase() {
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single();

    if (error) {
      toast.error('Failed to load case');
      return;
    }

    setCaseData(data);
    setLoading(false);
  }

  async function checkReportExists() {
    setCheckingReport(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-dropbox-report', {
        body: { caseId },
      });

      if (error) throw error;
      setReportExists(data.exists);
    } catch (error) {
      setReportExists(false);
    } finally {
      setCheckingReport(false);
    }
  }

  function downloadDICOM() {
    if (!caseData.dropbox_scan_path) {
      toast.error('Dropbox path not available');
      return;
    }

    // Convert Dropbox path to direct download link
    const dropboxUrl = `https://www.dropbox.com/home${caseData.dropbox_scan_path}?preview=${caseData.dropbox_scan_path.split('/').pop()}`;
    window.open(dropboxUrl, '_blank');
    toast.success('Opening DICOM in Dropbox');
  }

  async function previewReport() {
    try {
      const { data, error } = await supabase.functions.invoke('get-dropbox-file', {
        body: { caseId, fileType: 'report' },
      });

      if (error) throw error;

      const blob = new Blob([data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'width=800,height=1000');
      
      toast.success('Report opened in new window');
    } catch (error: any) {
      toast.error(error.message || 'Report not found. Please upload it to Dropbox first.');
    }
  }

  async function downloadReport() {
    try {
      const { data, error } = await supabase.functions.invoke('get-dropbox-file', {
        body: { caseId, fileType: 'report' },
      });

      if (error) throw error;

      const blob = new Blob([data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `case_${caseId}_report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Report downloaded');
    } catch (error) {
      toast.error('Failed to download report');
    }
  }

  async function markCompleteAndRelease() {
    const confirmed = confirm(
      `Are you sure you want to release this report to the clinic?\n\n` +
      `Patient: ${caseData.patient_name}\n` +
      `Case ID: ${caseId}\n\n` +
      `Please confirm you have:\n` +
      `✓ Reviewed the report PDF\n` +
      `✓ Verified it's for the correct patient\n` +
      `✓ Checked report is complete and accurate\n\n` +
      `Once released, the clinic will be notified and can download the report.`
    );

    if (!confirmed) return;

    try {
      const { data, error } = await supabase.functions.invoke('mark-case-completed', {
        body: { caseId },
      });

      if (error) throw error;

      toast.success('Report released to clinic!');
      navigate('/reporter');
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark as completed');
    }
  }

  async function openDropboxFolder() {
    const folderPath = caseData.dropbox_scan_path?.split('/').slice(0, -1).join('/');
    if (!folderPath) {
      toast.error('Dropbox path not available');
      return;
    }

    const dropboxUrl = `https://www.dropbox.com/home${folderPath}`;
    window.open(dropboxUrl, '_blank');
  }

  if (loading) return <div className="container mx-auto p-6">Loading...</div>;

  const expectedScanPath = `/DentaRad/Uploads/${caseData.patient_id}_${caseData.id}/scan.zip`;
  const expectedReportPath = `/DentaRad/Reports/${caseData.patient_id}_${caseData.id}/report.pdf`;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Button 
        variant="ghost" 
        onClick={() => navigate('/reporter')}
        className="mb-4"
      >
        ← Back to Dashboard
      </Button>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">
                {caseData.simple_id 
                  ? `Case ${String(caseData.simple_id).padStart(5, '0')} - ${caseData.patient_name}`
                  : caseData.patient_name
                }
              </CardTitle>
              {caseData.folder_name && (
                <p className="text-sm text-muted-foreground mt-2">
                  Folder: <code className="bg-muted px-2 py-1 rounded">{caseData.folder_name}</code>
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">Case ID: {caseId}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Case Information */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Patient Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Patient Name</p>
                <p className="font-medium">{caseData.patient_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Patient ID</p>
                <p className="font-medium">{caseData.patient_id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date of Birth</p>
                <p className="font-medium">{caseData.patient_dob || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Uploaded</p>
                <p className="font-medium">{new Date(caseData.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Clinical Question */}
          <div>
            <h3 className="font-semibold text-lg mb-2">Clinical Question</h3>
            <p className="text-sm bg-muted p-3 rounded">{caseData.clinical_question}</p>
          </div>

          {/* Field of View & Urgency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground text-sm">Field of View</p>
              <p className="font-medium">{caseData.field_of_view}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Urgency</p>
              <p className="font-medium">{caseData.urgency}</p>
            </div>
          </div>

          {/* DICOM Download */}
          <div>
            <h3 className="font-semibold text-lg mb-2">DICOM Files</h3>
            <div className="flex gap-2">
              <Button onClick={downloadDICOM} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download DICOM
              </Button>
              <Button onClick={openDropboxFolder} variant="outline">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Uploads Folder
              </Button>
              <Button
                onClick={() => {
                  const folderName = caseData.folder_name || `${caseData.patient_id}_${caseData.id}`;
                  const dropboxUrl = `https://www.dropbox.com/home/DentaRad/Reports/${folderName}`;
                  window.open(dropboxUrl, '_blank');
                }}
                variant="outline"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Reports Folder
              </Button>
            </div>
          </div>

          {/* Report Status & Actions */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-4">Report Review</h3>

            {/* Manual Export Instructions */}
            {caseData.status !== 'report_ready' && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Manual Export Workflow:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                    <li>Download DICOM and import to FalconMD</li>
                    <li>Import REFERRAL-INFO.dcm for clinical context (appears as Series 2)</li>
                    <li>Review images with clinical information visible</li>
                    <li>Create diagnostic report in FalconMD</li>
                    <li>Export report PDF from FalconMD (saves to Desktop/Downloads)</li>
                    <li>Open Reports folder using button below</li>
                    <li>Drag PDF into folder and rename to: <code className="bg-muted px-1 py-0.5 rounded">report.pdf</code></li>
                    <li>Return here to preview and release</li>
                  </ol>
                  {caseData.folder_name && (
                    <p className="mt-3 text-xs font-mono bg-muted p-2 rounded">
                      Expected path: /DentaRad/Reports/{caseData.folder_name}/report.pdf
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Report Actions */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button onClick={previewReport} variant="outline">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview Report
                </Button>
                <Button onClick={downloadReport} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download Report
                </Button>
                <Button onClick={checkReportExists} variant="ghost" size="sm" disabled={checkingReport}>
                  {checkingReport ? 'Checking...' : reportExists ? '✓ Report Found' : 'Check if Report Exists'}
                </Button>
              </div>

              {/* Release Button */}
              {caseData.status !== 'report_ready' && (
                <Button 
                  onClick={markCompleteAndRelease} 
                  className="w-full"
                  size="lg"
                >
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Mark as Complete & Release to Clinic
                </Button>
              )}

              {caseData.status === 'report_ready' && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    ✓ Report released to clinic on {new Date(caseData.completed_at).toLocaleString()}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
