import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2, Download } from 'lucide-react';
import { generateReportPDF } from '@/lib/reportPdfGenerator';

interface ReportPDFPreviewProps {
  caseData: {
    id?: string;
    patient_name: string;
    patient_dob: string;
    patient_id: string;
    folder_name: string;
    clinical_question: string;
    field_of_view: string;
    upload_date: string;
    clinic: { name: string };
  };
  reportData: {
    clinical_history?: string;
    report_content?: string;
    signatory_name?: string;
    signatory_title?: string;
    signatory_credentials?: string;
    signature_statement?: string;
    signed_at?: string;
    is_signed?: boolean;
    version?: number;
  };
  images?: any[];
}

export function ReportPDFPreview({ caseData, reportData, images = [] }: ReportPDFPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generatePreview = async () => {
    setLoading(true);
    try {
      const pdfBlob = await generateReportPDF({
        caseData,
        reportData,
        images,
      });

      // Revoke previous URL to avoid memory leaks
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
    } catch (error) {
      console.error('Error generating PDF preview:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate initial preview
  useEffect(() => {
    generatePreview();
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `report-preview-${caseData.folder_name}.pdf`;
    a.click();
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">PDF Preview</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={generatePreview}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            {pdfUrl && (
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        {loading && !pdfUrl ? (
          <div className="flex items-center justify-center h-[600px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : pdfUrl ? (
          <div className="border rounded bg-muted/20 overflow-hidden max-h-[calc(100vh-250px)]">
            <iframe
              src={pdfUrl}
              title="Report PDF preview"
              className="w-full h-[600px] bg-background"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-[600px] text-muted-foreground">
            No preview available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
