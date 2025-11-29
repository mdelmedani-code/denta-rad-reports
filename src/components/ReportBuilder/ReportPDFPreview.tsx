import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2, Download } from 'lucide-react';
import { generateReportPDF } from '@/lib/reportPdfGenerator';
import { Document, Page, pdfjs } from 'react-pdf';

// @ts-ignore
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc as string;

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
    technique?: string;
    findings?: string;
    impression?: string;
    signatory_name?: string;
    signatory_credentials?: string;
    signed_at?: string;
    version?: number;
  };
  images?: any[];
}

export function ReportPDFPreview({ caseData, reportData, images = [] }: ReportPDFPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);

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
      setPageNumber(1);
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
        {pdfUrl && (
          <div className="text-sm text-muted-foreground mt-2">
            Page {pageNumber} of {numPages || '?'}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-3">
        {loading && !pdfUrl ? (
          <div className="flex items-center justify-center h-[600px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : pdfUrl ? (
          <div className="border rounded bg-muted/20 p-2 overflow-auto max-h-[calc(100vh-250px)]">
            <Document
              file={pdfUrl}
              loading={<div className="flex items-center justify-center h-[400px]"><Loader2 className="h-6 w-6 animate-spin" /></div>}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            >
              {Array.from({ length: numPages }, (_, i) => (
                <Page
                  key={i + 1}
                  pageNumber={i + 1}
                  width={380}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="mb-4 shadow-md"
                />
              ))}
            </Document>
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
