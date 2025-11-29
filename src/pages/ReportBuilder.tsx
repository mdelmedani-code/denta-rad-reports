import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, FileText, ArrowLeft, Loader2, Keyboard } from 'lucide-react';
import { ReportEditor } from '@/components/ReportBuilder/ReportEditor';
import { AutoSaveIndicator } from '@/components/ReportBuilder/AutoSaveIndicator';
import { ElectronicSignature } from '@/components/ReportBuilder/ElectronicSignature';
import { ImageAttachment } from '@/components/ReportBuilder/ImageAttachment';
import { VersionHistory } from '@/components/ReportBuilder/VersionHistory';
import { KeyboardShortcuts } from '@/components/ReportBuilder/KeyboardShortcuts';
import { ReportPatientInfo } from '@/components/report/ReportPatientInfo';
import { ReportToolbar } from '@/components/report/ReportToolbar';
import { ReportVersionBanner } from '@/components/report/ReportVersionBanner';
import { reportService } from '@/services/reportService';
import { handleError } from '@/utils/errorHandler';
import { toast } from '@/lib/toast';

interface CaseData {
  id: string;
  patient_name: string;
  patient_dob: string;
  patient_id: string;
  folder_name: string;
  clinical_question: string;
  field_of_view: string;
  upload_date: string;
  clinic: {
    name: string;
  };
}

interface ReportData {
  id: string;
  clinical_history: string;
  technique: string;
  findings: string;
  impression: string;
  is_signed: boolean;
  signed_by: string | null;
  signed_at: string | null;
  signatory_name: string | null;
  signatory_credentials: string | null;
  signature_hash: string | null;
  last_saved_at: string | null;
  version: number;
  is_superseded: boolean;
  superseded_by: string | null;
  supersedes: string | null;
  can_reopen: boolean;
}

export default function ReportBuilder() {
  const { caseId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSaved, setLastSaved] = useState<Date | undefined>();
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [reportImages, setReportImages] = useState<any[]>([]);
  const [versionBanner, setVersionBanner] = useState<string | null>(null);

  const [clinicalHistory, setClinicalHistory] = useState('');
  const [technique, setTechnique] = useState('');
  const [findings, setFindings] = useState('');
  const [impression, setImpression] = useState('');

  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (caseId) {
      loadCaseAndReport();
    }
  }, [caseId]);

  useEffect(() => {
    if (report?.id) {
      loadReportImages();
    }
  }, [report?.id]);

  const loadReportImages = async () => {
    if (!report?.id) return;

    try {
      const images = await reportService.fetchReportImages(report.id);
      setReportImages(images);
    } catch (error) {
      handleError(error, 'Failed to load report images');
    }
  };

  const loadCaseAndReport = async () => {
    if (!caseId) return;

    try {
      const { caseData, reportData } = await reportService.fetchCaseWithReport(caseId);
      setCaseData(caseData);

      let finalReport = reportData;
      if (!reportData) {
        finalReport = await reportService.createReport(caseId, caseData);
      }

      setReport(finalReport);
      // Clinical history always comes from the case's clinical_question, not the report
      setClinicalHistory(caseData.clinical_question || '');
      setTechnique(finalReport.technique || '');
      setFindings(finalReport.findings || '');
      setImpression(finalReport.impression || '');
      setLastSaved(finalReport.last_saved_at ? new Date(finalReport.last_saved_at) : undefined);

      if (finalReport.supersedes) {
        setVersionBanner(
          `Editing after signature — Version ${finalReport.version}. Previous version(s) preserved and remain auditable.`
        );
      }
    } catch (error) {
      handleError(error, 'Failed to load case data');
    } finally {
      setLoading(false);
    }
  };

  const triggerAutoSave = useCallback(() => {
    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    setSaveStatus('unsaved');

    const timer = setTimeout(() => {
      saveReport();
    }, 2000);

    setSaveTimer(timer);
  }, [saveTimer]);

  const saveReport = async () => {
    if (!report) return;

    setSaveStatus('saving');

    try {
      await reportService.saveReport(report.id, {
        clinicalHistory,
        technique,
        findings,
        impression,
      });

      setSaveStatus('saved');
      setLastSaved(new Date());
      toast.success('Saved', 'Report saved successfully');
    } catch (error) {
      setSaveStatus('unsaved');
      handleError(error, 'Failed to save report');
    }
  };

  const handleTemplateSelect = (template: any) => {
    // Templates only apply to technique, findings, and impression
    // Clinical history is never modified - it always matches the case's clinical question
    setTechnique(template.technique || technique);
    setFindings(template.findings || findings);
    setImpression(template.impression || impression);
    triggerAutoSave();
  };

  const handleSnippetInsert = (content: string, section: string) => {
    switch (section) {
      case 'clinical_history':
        setClinicalHistory(prev => prev + '\n\n' + content);
        break;
      case 'technique':
        setTechnique(prev => prev + '\n\n' + content);
        break;
      case 'findings':
        setFindings(prev => prev + '\n\n' + content);
        break;
      case 'impression':
        setImpression(prev => prev + '\n\n' + content);
        break;
    }
    triggerAutoSave();
  };

  const handleFinalizeReport = async () => {
    if (!report?.is_signed) {
      toast.error('Report Not Signed', 'Please sign the report before finalizing');
      return;
    }

    try {
      await saveReport();

      toast.info('Generating PDF', 'Please wait while we generate the report PDF...');

      const { generateReportPDF } = await import('@/lib/reportPdfGenerator.tsx');

      const pdfBlob = await generateReportPDF({
        caseData,
        reportData: {
          clinical_history: clinicalHistory,
          technique,
          findings,
          impression,
          signatory_name: report.signatory_name || undefined,
          signatory_credentials: report.signatory_credentials || undefined,
          signed_at: report.signed_at || undefined,
          version: report.version || 1,
        },
      });

      const pdfPath = await reportService.uploadReportPDF(caseData!.folder_name, pdfBlob);
      await reportService.finalizeReport(report.id, pdfPath);
      await reportService.updateCaseStatus(caseId!, 'report_ready');

      toast.success('Report Finalized', 'Report PDF generated and case updated');
      navigate('/reporter');
    } catch (error) {
      handleError(error, 'Failed to finalize report');
    }
  };

  const handleReopenReport = async () => {
    if (!report) return;

    try {
      const newReportId = await reportService.createReportVersion(
        report.id,
        report.version + 1
      );

      toast.success(
        'Report Re-opened',
        `Creating new version ${report.version + 1}. Redirecting...`
      );

      setTimeout(() => {
        navigate(`/reporter/report/${caseId}`);
        window.location.reload();
      }, 1500);
    } catch (error) {
      handleError(error, 'Failed to re-open report. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!caseData || !report) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>Failed to load case data</AlertDescription>
        </Alert>
      </div>
    );
  }

  const signatureData = report.is_signed && report.signed_by && report.signed_at && report.signature_hash
    ? {
        signed_by: report.signed_by,
        signed_at: report.signed_at,
        signatory_name: report.signatory_name || '',
        signatory_credentials: report.signatory_credentials || '',
        signature_hash: report.signature_hash,
        verification_token: '',
        version: report.version,
        is_superseded: report.is_superseded,
      }
    : null;

  const reportContent = `${clinicalHistory}\n${technique}\n${findings}\n${impression}`;

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">CBCT Radiology Report</h1>
            <p className="text-muted-foreground">Case: {caseData.folder_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <AutoSaveIndicator status={saveStatus} lastSaved={lastSaved} />
          <VersionHistory
            reportId={report.id}
            currentVersion={{
              clinical_history: clinicalHistory,
              technique,
              findings,
              impression,
            }}
            onRestore={(version) => {
              setClinicalHistory(version.clinical_history);
              setTechnique(version.technique);
              setFindings(version.findings);
              setImpression(version.impression);
              triggerAutoSave();
            }}
            disabled={report.is_signed}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowShortcuts(true)}
            title="Keyboard Shortcuts"
          >
            <Keyboard className="h-5 w-5" />
          </Button>
          <Button onClick={saveReport} variant="outline" disabled={saveStatus === 'saving'}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <ReportPatientInfo caseData={caseData} />

      <ReportToolbar
        onSelectTemplate={handleTemplateSelect}
        onInsertSnippet={(content) => handleSnippetInsert(content, 'findings')}
        disabled={report.is_signed}
      />

      {report.is_signed && (
        <ReportVersionBanner
          message="⚠️ This report is signed. Use 'Re-open for Edit' button below to create a new version."
        />
      )}

      {versionBanner && <ReportVersionBanner message={`ℹ️ ${versionBanner}`} />}

      {/* Report Sections */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Clinical History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none p-4 bg-muted/30 rounded-md border">
              <p className="text-sm text-muted-foreground italic mb-2">
                This section displays the clinical question from the case upload form and cannot be edited.
              </p>
              <div className="whitespace-pre-wrap">{clinicalHistory || 'No clinical question provided'}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Technique</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportEditor
              content={technique}
              onChange={(content) => {
                if (!report.is_signed) {
                  setTechnique(content);
                  triggerAutoSave();
                }
              }}
              placeholder="Describe imaging technique and parameters..."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Findings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ReportEditor
              content={findings}
              onChange={(content) => {
                if (!report.is_signed) {
                  setFindings(content);
                  triggerAutoSave();
                }
              }}
              placeholder="Document detailed findings..."
            />
            
            <ImageAttachment
              reportId={report.id}
              caseId={caseId!}
              section="findings"
              images={reportImages}
              onImagesChange={setReportImages}
              disabled={report.is_signed}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Impression</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportEditor
              content={impression}
              onChange={(content) => {
                if (!report.is_signed) {
                  setImpression(content);
                  triggerAutoSave();
                }
              }}
              placeholder="Summarize key findings..."
            />
          </CardContent>
        </Card>

        {/* Signature Section */}
        <Card>
          <CardHeader>
            <CardTitle>Signature</CardTitle>
          </CardHeader>
          <CardContent>
            <ElectronicSignature
              reportId={report.id}
              caseId={caseId!}
              reportContent={reportContent}
              reportVersion={report.version}
              signatureData={signatureData}
              canReopen={report.can_reopen && !report.is_superseded}
              onSign={(data) => {
                setReport({
                  ...report,
                  is_signed: true,
                  signed_by: data.signed_by,
                  signed_at: data.signed_at,
                  signatory_name: data.signatory_name,
                  signatory_credentials: data.signatory_credentials,
                  signature_hash: data.signature_hash,
                });
              }}
              onReopen={handleReopenReport}
            />
          </CardContent>
        </Card>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-between items-center mt-8 pt-6 border-t">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={saveReport}>
            Save Draft
          </Button>
          <Button 
            onClick={handleFinalizeReport}
            disabled={!report.is_signed}
          >
            <FileText className="h-4 w-4 mr-2" />
            Generate & Finalize
          </Button>
        </div>
      </div>

      <KeyboardShortcuts
        open={showShortcuts}
        onOpenChange={setShowShortcuts}
        onSave={saveReport}
        onFinalize={handleFinalizeReport}
      />
    </div>
  );
}