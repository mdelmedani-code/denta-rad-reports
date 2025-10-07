import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const ViewerPage = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [caseData, setCaseData] = useState<any>(null);

  useEffect(() => {
    loadCase();
  }, [caseId]);

  async function loadCase() {
    if (!caseId) {
      setError('Case ID not provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get case details from Supabase
      const { data: caseInfo, error: caseError } = await supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .single();

      if (caseError) throw caseError;

      setCaseData(caseInfo);

      // TODO: Load DICOM images from Supabase Storage
      // This will be implemented with Cornerstone.js viewer
      // For now, we just show the case info

    } catch (err) {
      console.error('Error loading case:', err);
      setError(err instanceof Error ? err.message : 'Failed to load case');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading DICOM viewer...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-destructive mb-2">Error</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">DICOM Viewer</h1>
        
        {caseData && (
          <div className="bg-card p-6 rounded-lg border mb-4">
            <h2 className="text-xl font-semibold mb-4">Case Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Patient Name</p>
                <p className="font-medium">{caseData.patient_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Case ID</p>
                <p className="font-medium">{caseData.patient_id || caseData.id.substring(0, 8)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{caseData.status}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Series Count</p>
                <p className="font-medium">{caseData.series_count || 'Processing...'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Clinical Question</p>
                <p className="font-medium">{caseData.clinical_question}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-card p-6 rounded-lg border">
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Cornerstone.js DICOM viewer integration coming soon
            </p>
            <p className="text-sm text-muted-foreground">
              This will display DICOM images loaded directly from Supabase Storage
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewerPage;
