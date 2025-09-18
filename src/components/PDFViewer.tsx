import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight, Download } from 'lucide-react';

// Use Vite worker asset
// @ts-ignore
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc as string;

interface PDFViewerProps {
  url: string;
}

export default function PDFViewer({ url }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  return (
    <div className="border rounded p-3 bg-background">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-muted-foreground">Page {pageNumber} of {numPages || '?'}</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPageNumber((p) => Math.max(1, p - 1))} disabled={pageNumber <= 1}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))} disabled={!numPages || pageNumber >= numPages}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => { const a = document.createElement('a'); a.href = url; a.download = `report-${Date.now()}.pdf`; a.click(); }}>
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-center min-h-[60vh]">
        {loading && <Loader2 className="w-6 h-6 animate-spin" />}
        <Document
          file={url}
          loading={null}
          onLoadSuccess={({ numPages }) => { setNumPages(numPages); setLoading(false); }}
          onLoadError={() => setLoading(false)}
        >
          <Page pageNumber={pageNumber} width={880} renderTextLayer renderAnnotationLayer />
        </Document>
      </div>
    </div>
  );
}
