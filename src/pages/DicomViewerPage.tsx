import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { OHIFViewer } from "@/pages/OHIFViewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Case {
  id: string;
  patient_name: string;
  upload_date: string;
  clinical_question: string;
  status: 'uploaded' | 'in_progress' | 'report_ready' | 'awaiting_payment';
  urgency: 'standard' | 'urgent';
  field_of_view: 'up_to_5x5' | 'up_to_8x5' | 'up_to_8x8' | 'over_8x8';
  clinic_id: string;
  file_path: string | null;
  patient_dob: string | null;
  patient_internal_id: string | null;
  clinics: {
    name: string;
    contact_email: string;
  };
}

const DicomViewerPage = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCaseData = async () => {
      if (!caseId) {
        toast({
          title: "Error",
          description: "No case ID provided",
          variant: "destructive",
        });
        navigate('/admin/reporter');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('cases')
          .select(`
            *,
            clinics (
              name,
              contact_email
            )
          `)
          .eq('id', caseId)
          .maybeSingle();

        if (error) throw error;
        
        if (!data) {
          toast({
            title: "Error",
            description: "Case not found",
            variant: "destructive",
          });
          navigate('/admin/reporter');
          return;
        }
        
        setCaseData(data);
      } catch (error) {
        console.error('Error fetching case:', error);
        toast({
          title: "Error",
          description: "Failed to load case data",
          variant: "destructive",
        });
        navigate('/admin/reporter');
      } finally {
        setLoading(false);
      }
    };

    fetchCaseData();
  }, [caseId, navigate, toast]);

  const openReportingInterface = () => {
    navigate(`/admin/reporter?case=${caseId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'report_ready': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    return urgency === 'urgent' 
      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading case data...</div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Case Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested case could not be found.</p>
          <Button onClick={() => navigate('/admin/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate(-1)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Close Viewer
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">DICOM Viewer</h1>
                <p className="text-muted-foreground">Case: {caseData.patient_name}</p>
              </div>
            </div>
            <Button
              onClick={openReportingInterface}
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open Reporting Interface
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Case Information Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Case Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Patient:</span>
                  <span>{caseData.patient_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  <Badge className={getStatusColor(caseData.status)}>
                    {caseData.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Clinic:</span>
                  <span>{caseData.clinics.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Urgency:</span>
                  <Badge className={getUrgencyColor(caseData.urgency)}>
                    {caseData.urgency}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">FOV:</span>
                  <span>{caseData.field_of_view.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Upload Date:</span>
                  <span>{new Date(caseData.upload_date).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <div>
                  <span className="font-medium">Clinical Question:</span>
                  <p className="mt-1 text-sm text-muted-foreground">{caseData.clinical_question}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Original OHIF Viewer */}
        <OHIFViewer />
      </div>
    </div>
  );
};

export default DicomViewerPage;