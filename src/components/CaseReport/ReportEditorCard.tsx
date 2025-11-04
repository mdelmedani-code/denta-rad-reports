import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ReportEditor } from '@/components/ReportBuilder/ReportEditor';
import { Separator } from '@/components/ui/separator';
import { stripHtmlTags } from '@/lib/utils';

interface ReportEditorCardProps {
  report: any;
  onSave: (updatedReport: any) => Promise<void>;
  disabled: boolean;
}

export function ReportEditorCard({ report, onSave, disabled }: ReportEditorCardProps) {
  const [clinicalHistory, setClinicalHistory] = useState(report.clinical_history || '');
  const [technique, setTechnique] = useState(report.technique || '');
  const [findings, setFindings] = useState(report.findings || '');
  const [impression, setImpression] = useState(report.impression || '');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!disabled) {
        onSave({
          clinical_history: clinicalHistory,
          technique,
          findings,
          impression,
          last_saved_at: new Date().toISOString(),
        });
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [clinicalHistory, technique, findings, impression, disabled]);

  if (disabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Report Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6 opacity-60 pointer-events-none">
            <div>
              <h3 className="font-semibold mb-2">Findings</h3>
              <div className="prose prose-sm max-w-none bg-muted/30 p-4 rounded-lg whitespace-pre-wrap">
                {stripHtmlTags(report.findings) || 'Not provided'}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-2">Impression</h3>
              <div className="prose prose-sm max-w-none bg-muted/30 p-4 rounded-lg whitespace-pre-wrap">
                {stripHtmlTags(report.impression) || 'Not provided'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Report Content</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold mb-2">Findings</h3>
          <ReportEditor
            content={findings}
            onChange={setFindings}
            placeholder="Document findings..."
          />
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold mb-2">Impression</h3>
          <ReportEditor
            content={impression}
            onChange={setImpression}
            placeholder="Summarize impression..."
          />
        </div>
      </CardContent>
    </Card>
  );
}
