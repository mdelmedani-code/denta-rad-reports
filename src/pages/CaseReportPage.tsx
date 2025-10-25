import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Save, FileText, Share2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PatientInfoCard } from '@/components/CaseReport/PatientInfoCard';
import { ClinicalDetailsCard } from '@/components/CaseReport/ClinicalDetailsCard';
import { AttachmentsCard } from '@/components/CaseReport/AttachmentsCard';
import { ReportEditorCard } from '@/components/CaseReport/ReportEditorCard';
import { ImageGalleryCard } from '@/components/CaseReport/ImageGalleryCard';
import { SignatureAuditCard } from '@/components/CaseReport/SignatureAuditCard';
import { generateReportPDF } from '@/lib/reportPdfGenerator';

type ReportStatus = 'draft' | 'verified' | 'shared';

interface CaseReportData {
  case: any;
  report: any;
  attachments: any[];
  auditLog: any[];
}

export default function CaseReportPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<CaseReportData | null>(null);
  const [reportStatus, setReportStatus] = useState<ReportStatus>('draft');

  useEffect(() => {
    if (reportId) {
      loadCaseReport();
    }
  }, [reportId]);

  const loadCaseReport = async () => {
    try {
      setLoading(true);

      // Load report with case data
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .select(`
          *,
          case:cases (
            *,
            clinic:clinics (*)
          )
        `)
        .eq('id', reportId)
        .single();

      if (reportError) throw reportError;

      // Load attachments from storage
      const caseFolder = report.case.folder_name;
      const { data: files, error: filesError } = await supabase.storage
        .from('cbct-scans')
        .list(caseFolder);

      if (filesError) throw filesError;

      // Load report images
      const { data: images, error: imagesError } = await supabase
        .from('report_images')
        .select('*')
        .eq('report_id', reportId)
        .order('position');

      if (imagesError) throw imagesError;

      // Load audit log
      const { data: auditLog, error: auditError } = await supabase
        .from('security_audit_log')
        .select('*')
        .eq('table_name', 'reports')
        .order('created_at', { ascending: false })
        .limit(20);

      setData({
        case: report.case,
        report,
        attachments: files || [],
        auditLog: auditLog || [],
      });

      // Determine status
      if (report.is_signed) {
        setReportStatus(report.pdf_generated ? 'shared' : 'verified');
      } else {
        setReportStatus('draft');
      }
    } catch (error) {
      console.error('Error loading case report:', error);
      toast({
        title: 'Error',
        description: 'Failed to load case report',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updatedReport: any) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('reports')
        .update(updatedReport)
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: 'Saved',
        description: 'Report saved successfully',
      });

      await loadCaseReport();
    } catch (error) {
      console.error('Error saving report:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save report',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          is_signed: true,
          signed_at: new Date().toISOString(),
          signatory_name: 'Dr Mohamed Elmedani',
          signatory_credentials: 'BDS, FDSRCS, FRCR',
        })
        .eq('id', reportId);

      if (error) throw error;

      setReportStatus('verified');
      toast({
        title: 'Verified',
        description: 'Report has been verified',
      });

      await loadCaseReport();
    } catch (error) {
      console.error('Error verifying report:', error);
      toast({
        title: 'Verification Failed',
        description: 'Failed to verify report',
        variant: 'destructive',
      });
    }
  };

  const handleReopen = async () => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          is_signed: false,
          signed_at: null,
        })
        .eq('id', reportId);

      if (error) throw error;

      setReportStatus('draft');
      toast({
        title: 'Re-opened',
        description: 'Report re-opened for editing',
      });

      await loadCaseReport();
    } catch (error) {
      console.error('Error reopening report:', error);
      toast({
        title: 'Reopen Failed',
        description: 'Failed to reopen report',
        variant: 'destructive',
      });
    }
  };

  const handleGeneratePDF = async () => {
    if (!data) return;

    try {
      toast({
        title: 'Generating PDF',
        description: 'Please wait...',
      });

      // Map the data to match PDF generator expectations
      const pdfBlob = await generateReportPDF({
        caseData: {
          patient_name: data.case.patient_name,
          patient_dob: data.case.patient_dob || '',
          patient_id: data.case.patient_internal_id || data.case.patient_id || 'N/A',
          folder_name: data.case.folder_name,
          clinical_question: data.case.clinical_question || '',
          field_of_view: data.case.field_of_view || 'up_to_5x5',
          upload_date: data.case.upload_date,
          clinic: {
            name: data.case.clinics?.name || data.case.clinic?.name || 'Unknown Clinic',
          },
        },
        reportData: {
          clinical_history: data.report.clinical_history || '',
          technique: data.report.technique || '',
          findings: data.report.findings || '',
          impression: data.report.impression || '',
          recommendations: data.report.recommendations || '',
          signatory_name: data.report.signatory_name,
          signatory_credentials: data.report.signatory_credentials,
          signed_at: data.report.signed_at,
          version: data.report.version,
        },
      });

      const pdfPath = `${data.case.folder_name}/report.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('reports')
        .upload(pdfPath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('reports')
        .update({
          pdf_generated: true,
          pdf_storage_path: pdfPath,
        })
        .eq('id', reportId);

      if (updateError) throw updateError;

      setReportStatus('shared');
      toast({
        title: 'PDF Generated',
        description: 'Report PDF has been generated',
      });

      await loadCaseReport();
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'PDF Generation Failed',
        description: error?.message || 'Failed to generate PDF',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>Failed to load case report</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/reporter')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  CBCT Case Report
                </h1>
                <p className="text-sm text-muted-foreground">
                  {data.case.folder_name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handleSave(data.report)}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>

              {reportStatus === 'draft' && (
                <Button onClick={handleVerify}>
                  <FileText className="h-4 w-4 mr-2" />
                  Verify & Approve
                </Button>
              )}

              {reportStatus === 'verified' && (
                <>
                  <Button variant="outline" onClick={handleReopen}>
                    Re-open for Edit
                  </Button>
                  <Button onClick={handleGeneratePDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate PDF
                  </Button>
                </>
              )}

              {reportStatus === 'shared' && (
                <Button onClick={handleGeneratePDF}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Regenerate PDF
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-6">
          {/* Patient Info */}
          <PatientInfoCard
            caseData={data.case}
            status={reportStatus}
          />

          {/* Clinical Details */}
          <ClinicalDetailsCard caseData={data.case} />

          {/* Attachments */}
          <AttachmentsCard
            caseFolder={data.case.folder_name}
            attachments={data.attachments}
          />

          {/* Report Editor */}
          <ReportEditorCard
            report={data.report}
            onSave={handleSave}
            disabled={reportStatus !== 'draft'}
          />

          {/* Image Gallery */}
          <ImageGalleryCard reportId={reportId!} />

          {/* Signature & Audit */}
          <SignatureAuditCard
            report={data.report}
            auditLog={data.auditLog}
            status={reportStatus}
          />
        </div>
      </main>
    </div>
  );
}
