import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ViewerPage = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [caseData, setCaseData] = useState<any>(null);

  useEffect(() => {
    if (caseId) {
      loadCaseData();
    }
  }, [caseId]);

  const loadCaseData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: caseError } = await supabase
        .from('cases')
        .select('*, clinics(name)')
        .eq('id', caseId)
        .maybeSingle();

      if (caseError) throw caseError;
      if (!data) throw new Error('Case not found');

      setCaseData(data);
    } catch (err) {
      console.error('Error loading case:', err);
      setError(err instanceof Error ? err.message : 'Failed to load case');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDicom = async () => {
    if (!caseData?.file_path) return;

    try {
      const { data, error } = await supabase.storage
        .from('cbct-scans')
        .download(caseData.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `case-${caseId}-dicom.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  if (!caseId) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Error</h1>
          <p className="text-muted-foreground">Case ID not provided</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading case details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-destructive mb-4">Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => loadCaseData()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>DICOM Viewer</CardTitle>
            <CardDescription>
              Case ID: {caseId}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Patient Name</p>
                <p className="text-lg">{caseData?.patient_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <p className="text-lg capitalize">{caseData?.status?.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Clinical Question</p>
                <p className="text-lg">{caseData?.clinical_question}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Series Count</p>
                <p className="text-lg">{caseData?.series_count || 'Processing...'}</p>
              </div>
            </div>

            {caseData?.dicom_metadata && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">DICOM Metadata</p>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto">
                  {JSON.stringify(caseData.dicom_metadata, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex gap-4">
              <Button onClick={handleDownloadDicom} disabled={!caseData?.file_path}>
                <Download className="w-4 h-4 mr-2" />
                Download DICOM Files
              </Button>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> The interactive DICOM viewer is being updated to work directly with Supabase Storage. 
                For now, you can download the DICOM files to view them with external software.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ViewerPage;
