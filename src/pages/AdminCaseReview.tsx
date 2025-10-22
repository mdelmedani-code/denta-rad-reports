import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Eye, CheckCircle, AlertCircle, Info, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AdminCaseReview() {
  const { id: caseId } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCase();
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
      
      toast.success('Report opened');
    } catch (error: any) {
      toast.error(error.message || 'Report not found. Please save your report first.');
    }
  }

  function openDropboxUploadsFolder() {
    const folderName = caseData.folder_name || `${caseData.patient_id}_${caseData.id}`;
    const url = `https://www.dropbox.com/home/DentaRad/Uploads/${folderName}`;
    window.open(url, '_blank');
    toast.success('Opening Uploads folder');
  }

  function openDropboxReportsFolder() {
    const folderName = caseData.folder_name || `${caseData.patient_id}_${caseData.id}`;
    const url = `https://www.dropbox.com/home/DentaRad/Reports/${folderName}`;
    window.open(url, '_blank');
    toast.success('Opening Reports folder');
  }

  async function markCompleteAndRelease() {
    const simpleId = caseData.simple_id ? String(caseData.simple_id).padStart(5, '0') : caseId;
    
    const confirmed = confirm(
      `Release report to clinic?\n\n` +
      `Case: ${simpleId} - ${caseData.patient_name}\n` +
      `Folder: ${caseData.folder_name || 'N/A'}\n\n` +
      `Confirm you have:\n` +
      `✓ Saved report.pdf to /Reports/${caseData.folder_name}/\n` +
      `✓ Previewed report (correct patient & complete)\n` +
      `✓ Verified accuracy\n\n` +
      `Clinic will be notified immediately.`
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


  if (loading) return <div className="container mx-auto p-6">Loading...</div>;

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
          {/* Clinical Referral Info Alert */}
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900">
              Clinical Referral Information Available
            </AlertTitle>
            <AlertDescription className="text-blue-800">
              <p className="mb-2">
                The clinical referral is available in multiple formats in the Uploads folder:
              </p>
              <ul className="space-y-1 text-sm">
                <li>
                  <strong>REFERRAL-INFO.dcm</strong> - DICOM Structured Report (opens in FalconMD alongside images)
                </li>
                <li>
                  <strong>cover-sheet.pdf</strong> - PDF document (for printing or emailing)
                </li>
                <li>
                  <strong>referral-info.txt</strong> - Plain text (quick reference)
                </li>
              </ul>
              <Button
                onClick={openDropboxUploadsFolder}
                variant="outline"
                size="sm"
                className="mt-3"
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                Open Uploads Folder
              </Button>
            </AlertDescription>
          </Alert>

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
            <Button onClick={downloadDICOM} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download DICOM
            </Button>
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
                <Button onClick={openDropboxReportsFolder} variant="outline">
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Open Reports Folder
                </Button>
                <Button onClick={previewReport} variant="outline">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview Report
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
