import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Clock, LogOut, Settings, Download, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { NotificationPreferences } from "@/components/NotificationPreferences";


interface Case {
  id: string;
  patient_name: string;
  patient_dob?: string;
  patient_internal_id?: string;
  upload_date: string;
  clinical_question: string;
  status: 'uploaded' | 'in_progress' | 'report_ready' | 'awaiting_payment';
  urgency: 'standard' | 'urgent';
  field_of_view: 'up_to_5x5' | 'up_to_8x5' | 'up_to_8x8' | 'over_8x8';
  clinics?: {
    name: string;
    contact_email: string;
  };
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
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
        .order('upload_date', { ascending: false });

      if (error) throw error;
      setCases(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load cases: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'report_ready': return 'bg-green-100 text-green-800';
      case 'awaiting_payment': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const handleReupload = (caseId: string) => {
    navigate(`/upload-case?reupload=${caseId}`);
  };

  const generatePdfReport = async (caseData: Case) => {
    setGeneratingPdf(caseData.id);
    try {
      // Get the report data for this case
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select('*, signed_off_by, signed_off_at, signatory_name, signatory_title, signatory_credentials, signature_statement')
        .eq('case_id', caseData.id)
        .single();

      if (reportError) throw reportError;

      if (!reportData?.report_text) {
        toast({
          title: "Error",
          description: "No report text found for this case",
          variant: "destructive",
        });
        return;
      }

      // Prepare signature data if report is signed off
      let signatureData = null;
      if (reportData.signed_off_by) {
        signatureData = {
          signatory_name: reportData.signatory_name,
          signatory_title: reportData.signatory_title,
          signatory_credentials: reportData.signatory_credentials,
          signature_statement: reportData.signature_statement,
          signed_off_at: reportData.signed_off_at
        };
      }

      // Call the PDF generation edge function
      const { data, error } = await supabase.functions.invoke('generate-pdf-report', {
        body: {
          reportId: reportData.id,
          caseData: {
            patient_name: caseData.patient_name,
            patient_dob: caseData.patient_dob,
            patient_internal_id: caseData.patient_internal_id,
            field_of_view: caseData.field_of_view,
            urgency: caseData.urgency,
            clinical_question: caseData.clinical_question,
            upload_date: caseData.upload_date,
            clinic_name: caseData.clinics?.name,
            clinic_contact_email: caseData.clinics?.contact_email
          },
          reportText: reportData.report_text,
          signatureData
        }
      });

      if (error) throw error;

      if (data?.pdfUrl) {
        // Open the PDF in a new tab for download
        window.open(data.pdfUrl, '_blank');
        toast({
          title: "PDF Generated",
          description: "Your report PDF has been generated and opened in a new tab",
        });
      }
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF report: " + error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingPdf(null);
    }
  };



  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">DentaRad Portal</h1>
              <p className="text-sm sm:text-base text-muted-foreground truncate">Welcome back, {user?.email}</p>
            </div>
            <Button variant="outline" onClick={handleSignOut} className="w-full sm:w-auto">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Clinic Dashboard
              </CardTitle>
              <CardDescription>
                Manage your CBCT scan submissions and access reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={() => navigate("/upload-case")} className="w-full sm:w-auto">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload New Case
                </Button>
                <Button variant="outline" className="w-full sm:w-auto">
                  <FileText className="w-4 h-4 mr-2" />
                  View Reports
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notification Preferences */}
        <div className="mb-8">
          <NotificationPreferences />
        </div>

        {/* Cases Section - Mobile Optimized */}
        <Card>
          <CardHeader>
            <CardTitle>Your Cases</CardTitle>
            <CardDescription>
              Track the progress of your submitted CBCT scans
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p>Loading cases...</p>
              </div>
            ) : cases.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No cases uploaded yet</p>
                <Button 
                  onClick={() => navigate("/upload-case")} 
                  className="mt-4"
                >
                  Upload Your First Case
                </Button>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Patient Name</th>
                        <th className="text-left py-2">Upload Date</th>
                        <th className="text-left py-2">Clinical Question</th>
                        <th className="text-left py-2">Urgency</th>
                        <th className="text-left py-2">FOV</th>
                        <th className="text-left py-2">Status</th>
                        <th className="text-left py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cases.map((case_) => (
                        <tr key={case_.id} className="border-b">
                          <td className="py-2">{case_.patient_name}</td>
                          <td className="py-2">
                            {new Date(case_.upload_date).toLocaleDateString()}
                          </td>
                          <td className="py-2 max-w-xs truncate">
                            {case_.clinical_question}
                          </td>
                          <td className="py-2">
                            <Badge 
                              variant={case_.urgency === 'urgent' ? 'destructive' : 'secondary'}
                            >
                              {case_.urgency}
                            </Badge>
                          </td>
                          <td className="py-2">{case_.field_of_view}</td>
                          <td className="py-2">
                            <Badge className={getStatusColor(case_.status)}>
                              {formatStatus(case_.status)}
                            </Badge>
                          </td>
                          <td className="py-2">
                            <div className="flex gap-2">
                              {case_.status === 'uploaded' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReupload(case_.id)}
                                >
                                  <Upload className="h-4 w-4 mr-2" />
                                  Reupload
                                </Button>
                              )}
                              {case_.status === 'report_ready' && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => generatePdfReport(case_)}
                                  disabled={generatingPdf === case_.id}
                                >
                                  {generatingPdf === case_.id ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4 mr-2" />
                                  )}
                                  {generatingPdf === case_.id ? 'Generating...' : 'Download Report'}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4">
                  {cases.map((case_) => (
                    <Card key={case_.id} className="border border-border">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-lg">{case_.patient_name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {new Date(case_.upload_date).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge className={getStatusColor(case_.status)}>
                              {formatStatus(case_.status)}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <p className="text-sm font-medium">Clinical Question:</p>
                              <p className="text-sm text-muted-foreground">
                                {case_.clinical_question}
                              </p>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              <Badge 
                                variant={case_.urgency === 'urgent' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {case_.urgency}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                FOV: {case_.field_of_view}
                              </Badge>
                            </div>
                          </div>

                          {/* Mobile Actions */}
                          <div className="flex flex-col sm:flex-row gap-2 pt-2">
                            {case_.status === 'uploaded' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReupload(case_.id)}
                                className="w-full sm:w-auto"
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Reupload
                              </Button>
                            )}
                            {case_.status === 'report_ready' && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full sm:w-auto"
                                onClick={() => generatePdfReport(case_)}
                                disabled={generatingPdf === case_.id}
                              >
                                {generatingPdf === case_.id ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4 mr-2" />
                                )}
                                {generatingPdf === case_.id ? 'Generating...' : 'Download Report'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default Dashboard;