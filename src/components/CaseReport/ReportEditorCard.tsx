import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ReportEditor } from '@/components/ReportBuilder/ReportEditor';
import { Separator } from '@/components/ui/separator';

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
  const [recommendations, setRecommendations] = useState(report.recommendations || '');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!disabled) {
        onSave({
          clinical_history: clinicalHistory,
          technique,
          findings,
          impression,
          recommendations,
          last_saved_at: new Date().toISOString(),
        });
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [clinicalHistory, technique, findings, impression, recommendations, disabled]);

  if (disabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Report Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6 opacity-60 pointer-events-none">
            <div>
              <h3 className="font-semibold mb-2">Clinical History</h3>
              <div className="prose prose-sm max-w-none bg-muted/30 p-4 rounded-lg">
                {report.clinical_history || 'Not provided'}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-2">Technique</h3>
              <div className="prose prose-sm max-w-none bg-muted/30 p-4 rounded-lg">
                {report.technique || 'Not provided'}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-2">Findings</h3>
              <div className="prose prose-sm max-w-none bg-muted/30 p-4 rounded-lg">
                {report.findings || 'Not provided'}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-2">Impression</h3>
              <div className="prose prose-sm max-w-none bg-muted/30 p-4 rounded-lg">
                {report.impression || 'Not provided'}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-2">Recommendations</h3>
              <div className="prose prose-sm max-w-none bg-muted/30 p-4 rounded-lg">
                {report.recommendations || 'Not provided'}
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
          <h3 className="font-semibold mb-2">Clinical History</h3>
          <ReportEditor
            content={clinicalHistory}
            onChange={setClinicalHistory}
            placeholder="Enter clinical history..."
          />
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold mb-2">Technique</h3>
          <ReportEditor
            content={technique}
            onChange={setTechnique}
            placeholder="Describe imaging technique..."
          />
        </div>

        <Separator />

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

        <Separator />

        <div>
          <h3 className="font-semibold mb-2">Recommendations</h3>
          <ReportEditor
            content={recommendations}
            onChange={setRecommendations}
            placeholder="Provide recommendations..."
          />
        </div>
      </CardContent>
    </Card>
  );
}
