import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, FileText, ArrowLeft, Loader2, Image as ImageIcon, Keyboard } from 'lucide-react';
import { ReportEditor } from '@/components/ReportBuilder/ReportEditor';
import { TemplateSelector } from '@/components/ReportBuilder/TemplateSelector';
import { SnippetInserter } from '@/components/ReportBuilder/SnippetInserter';
import { AutoSaveIndicator } from '@/components/ReportBuilder/AutoSaveIndicator';
import { ElectronicSignature } from '@/components/ReportBuilder/ElectronicSignature';
import { ImageAttachment } from '@/components/ReportBuilder/ImageAttachment';
import { VersionHistory } from '@/components/ReportBuilder/VersionHistory';
import { KeyboardShortcuts } from '@/components/ReportBuilder/KeyboardShortcuts';

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
  recommendations: string;
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
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSaved, setLastSaved] = useState<Date | undefined>();
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [reportImages, setReportImages] = useState<any[]>([]);
  const [versionBanner, setVersionBanner] = useState<string | null>(null);

  // Report content state
  const [clinicalHistory, setClinicalHistory] = useState('');
  const [technique, setTechnique] = useState('');
  const [findings, setFindings] = useState('');
  const [impression, setImpression] = useState('');
  const [recommendations, setRecommendations] = useState('');

  // Auto-save timer
  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (caseId) {
      loadCaseAndReport();
      loadReportImages();
    }
  }, [caseId]);

  const loadReportImages = async () => {
    if (!report?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('report_images')
        .select('*')
        .eq('report_id', report.id)
        .order('position');
      
      if (error) throw error;
      setReportImages(data || []);
    } catch (error) {
      console.error('Error loading images:', error);
    }
  };

  const loadCaseAndReport = async () => {
    try {
      // Load case data
      const { data: caseData, error: caseError } = await supabase
        .from('cases')
        .select(`
          *,
          clinics:clinic_id (name)
        `)
        .eq('id', caseId)
        .single();

      if (caseError) throw caseError;
      setCaseData({
        ...caseData,
        clinic: caseData.clinics
      });

      // Load or create report
      let { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select('*')
        .eq('case_id', caseId)
        .eq('is_superseded', false)
        .maybeSingle();

      if (reportError && reportError.code !== 'PGRST116') throw reportError;

      if (!reportData) {
        // Create new report
        const { data: newReport, error: createError } = await supabase
          .from('reports')
          .insert({
            case_id: caseId,
            clinical_history: caseData.clinical_question || '',
            technique: '',
            findings: '',
            impression: '',
            recommendations: '',
            version: 1,
            is_superseded: false,
            can_reopen: true,
          })
          .select()
          .single();

        if (createError) throw createError;
        reportData = newReport;
      }

      setReport(reportData);
      setClinicalHistory(reportData.clinical_history || '');
      setTechnique(reportData.technique || '');
      setFindings(reportData.findings || '');
      setImpression(reportData.impression || '');
      setRecommendations(reportData.recommendations || '');
      setLastSaved(reportData.last_saved_at ? new Date(reportData.last_saved_at) : undefined);
      
      // Check if this report is editing after a signature
      if (reportData.supersedes) {
        setVersionBanner(`Editing after signature — Version ${reportData.version}. Previous version(s) preserved and remain auditable.`);
      }
    } catch (error) {
      console.error('Error loading case/report:', error);
      toast({
        title: 'Error',
        description: 'Failed to load case data',
        variant: 'destructive',
      });
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
      const { error } = await supabase
        .from('reports')
        .update({
          clinical_history: clinicalHistory,
          technique,
          findings,
          impression,
          recommendations,
          last_saved_at: new Date().toISOString(),
        })
        .eq('id', report.id);

      if (error) throw error;

      setSaveStatus('saved');
      setLastSaved(new Date());

      toast({
        title: 'Saved',
        description: 'Report saved successfully',
      });
    } catch (error) {
      console.error('Error saving report:', error);
      setSaveStatus('unsaved');
      toast({
        title: 'Save Failed',
        description: 'Failed to save report',
        variant: 'destructive',
      });
    }
  };

  const handleTemplateSelect = (template: any) => {
    setClinicalHistory(template.clinical_history || clinicalHistory);
    setTechnique(template.technique || technique);
    setFindings(template.findings || findings);
    setImpression(template.impression || impression);
    setRecommendations(template.recommendations || recommendations);
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
      case 'recommendations':
        setRecommendations(prev => prev + '\n\n' + content);
        break;
    }
    triggerAutoSave();
  };

  const handleFinalizeReport = async () => {
    if (!report?.is_signed) {
      toast({
        title: 'Report Not Signed',
        description: 'Please sign the report before finalizing',
        variant: 'destructive',
      });
      return;
    }

    try {
      await saveReport();

      // Generate PDF
      toast({
        title: 'Generating PDF',
        description: 'Please wait while we generate the report PDF...',
      });

      const { generateReportPDF } = await import('@/lib/reportPdfGenerator.tsx');
      
      const pdfBlob = await generateReportPDF({
        caseData,
        reportData: {
          clinical_history: clinicalHistory,
          technique,
          findings,
          impression,
          recommendations,
          signatory_name: report.signatory_name || undefined,
          signatory_credentials: report.signatory_credentials || undefined,
          signed_at: report.signed_at || undefined,
          version: report.version || 1,
        },
      });

      // Upload PDF to storage
      const pdfPath = `${caseData.folder_name}/report.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('reports')
        .upload(pdfPath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Update report with PDF info
      const { error: reportError } = await supabase
        .from('reports')
        .update({ 
          finalized_at: new Date().toISOString(),
          pdf_generated: true,
          pdf_storage_path: pdfPath,
        })
        .eq('id', report.id);

      if (reportError) throw reportError;

      // Update case status
      const { error: caseError } = await supabase
        .from('cases')
        .update({ status: 'report_ready' })
        .eq('id', caseId);

      if (caseError) throw caseError;

      toast({
        title: 'Report Finalized',
        description: 'Report PDF generated and case updated',
      });

      navigate('/reporter');
    } catch (error) {
      console.error('Error finalizing report:', error);
      toast({
        title: 'Finalization Failed',
        description: 'Failed to finalize report',
        variant: 'destructive',
      });
    }
  };

  const handleReopenReport = async () => {
    if (!report) return;

    try {
      // Call database function to create new version
      const { data: newReportId, error } = await supabase
        .rpc('create_report_version', {
          p_original_report_id: report.id,
          p_new_version_number: report.version + 1,
        });

      if (error) throw error;

      toast({
        title: 'Report Re-opened',
        description: `Creating new version ${report.version + 1}. Redirecting...`,
      });

      // Redirect to the new version
      setTimeout(() => {
        navigate(`/reporter/report/${caseId}`);
        window.location.reload(); // Force reload to get new version
      }, 1500);
    } catch (error) {
      console.error('Error reopening report:', error);
      toast({
        title: 'Reopen Failed',
        description: 'Failed to re-open report. Please try again.',
        variant: 'destructive',
      });
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

  const reportContent = `${clinicalHistory}\n${technique}\n${findings}\n${impression}\n${recommendations}`;

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
              recommendations,
            }}
            onRestore={(version) => {
              setClinicalHistory(version.clinical_history);
              setTechnique(version.technique);
              setFindings(version.findings);
              setImpression(version.impression);
              setRecommendations(version.recommendations);
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

      {/* Patient Info */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Patient</div>
              <div className="font-medium">{caseData.patient_name}</div>
            </div>
            <div>
              <div className="text-muted-foreground">DOB</div>
              <div className="font-medium">
                {new Date(caseData.patient_dob).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Patient ID</div>
              <div className="font-medium">{caseData.patient_id}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Scan Date</div>
              <div className="font-medium">
                {new Date(caseData.upload_date).toLocaleDateString()}
              </div>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Referring Practice</div>
              <div className="font-medium">{caseData.clinic.name}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Field of View</div>
              <div className="font-medium">
                <Badge>{caseData.field_of_view.replace(/_/g, ' ')}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 mb-6 p-4 bg-muted/50 rounded-lg">
        <TemplateSelector 
          onSelectTemplate={handleTemplateSelect}
          disabled={report.is_signed}
        />
        <SnippetInserter 
          onInsertSnippet={(content) => handleSnippetInsert(content, 'findings')}
          disabled={report.is_signed}
        />
      </div>

      {report.is_signed && (
        <Alert className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <AlertDescription className="text-amber-900 dark:text-amber-100">
            ⚠️ This report is signed. Use "Re-open for Edit" button below to create a new version.
          </AlertDescription>
        </Alert>
      )}

      {versionBanner && (
        <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <AlertDescription className="text-blue-900 dark:text-blue-100">
            ℹ️ {versionBanner}
          </AlertDescription>
        </Alert>
      )}

      {/* Report Sections */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Clinical History</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportEditor
              content={clinicalHistory}
              onChange={(content) => {
                if (!report.is_signed) {
                  setClinicalHistory(content);
                  triggerAutoSave();
                }
              }}
              placeholder="Enter clinical history and reason for referral..."
            />
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

        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportEditor
              content={recommendations}
              onChange={(content) => {
                if (!report.is_signed) {
                  setRecommendations(content);
                  triggerAutoSave();
                }
              }}
              placeholder="Provide clinical recommendations..."
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