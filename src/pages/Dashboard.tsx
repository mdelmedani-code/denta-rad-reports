import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, Clock, LogOut, Download, Loader2, FileEdit, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { DeleteCaseDialog } from "@/components/DeleteCaseDialog";
import { toast as sonnerToast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import dentaradLogo from "@/assets/dentarad-dashboard-logo.png";

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
  folder_name?: string;
  clinics?: {
    name: string;
    contact_email: string;
  };
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'reported'>('all');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
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
        .eq('archived', false)
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

  const downloadReport = async (caseData: Case) => {
    setDownloadingReport(caseData.id);
    
    try {
      sonnerToast.info('Downloading report...');

      // Get report to check for PDF path
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select('pdf_storage_path')
        .eq('case_id', caseData.id)
        .eq('is_superseded', false)
        .single();

      if (reportError) throw reportError;

      const pdfPath = reportData?.pdf_storage_path || `${caseData.folder_name}/report.pdf`;

      // Download from Supabase Storage
      const { data, error } = await supabase.storage
        .from('reports')
        .download(pdfPath);

      if (error) {
        console.error('Download error:', error);
        throw new Error(`Failed to download report: ${error.message}`);
      }

      // Trigger browser download
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${caseData.folder_name}_report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      sonnerToast.success('Report downloaded successfully');
    } catch (error: any) {
      console.error('Error downloading report:', error);
      sonnerToast.error(error.message || 'Failed to download report');
    } finally {
      setDownloadingReport(null);
    }
  };

  const accessReport = async (caseData: Case) => {
    try {
      // Get report ID for this case
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select('id')
        .eq('case_id', caseData.id)
        .eq('is_superseded', false)
        .single();

      if (reportError) throw reportError;

      if (reportData?.id) {
        navigate(`/admin/reports/${reportData.id}`);
      } else {
        throw new Error('Report not found');
      }
    } catch (error: any) {
      console.error('Error accessing report:', error);
      sonnerToast.error(error.message || 'Failed to access report');
    }
  };

  const getFilteredCases = () => {
    switch (activeTab) {
      case 'pending':
        return cases.filter(c => c.status === 'uploaded' || c.status === 'in_progress');
      case 'reported':
        return cases.filter(c => c.status === 'report_ready' || c.status === 'awaiting_payment');
      case 'all':
      default:
        return cases;
    }
  };

  const filteredCases = getFilteredCases();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-4 flex-1">
              <img src={dentaradLogo} alt="DentaRad" className="h-10 sm:h-12" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">DentaRad Portal</h1>
                <p className="text-sm sm:text-base text-muted-foreground truncate">Welcome back, {user?.email}</p>
              </div>
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
                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto"
                  onClick={() => document.getElementById('cases-section')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Reports
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notification Preferences */}
        <div className="mb-8">
          <Collapsible open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Email Notifications</CardTitle>
                      <CardDescription className="text-sm">
                        Configure your notification preferences
                      </CardDescription>
                    </div>
                    <ChevronDown 
                      className={`h-5 w-5 transition-transform duration-200 ${
                        notificationsOpen ? 'rotate-180' : ''
                      }`} 
                    />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <NotificationPreferences />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* Cases Section */}
        <Card id="cases-section">
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
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="all">All Cases ({cases.length})</TabsTrigger>
                  <TabsTrigger value="pending">Pending ({cases.filter(c => c.status === 'uploaded' || c.status === 'in_progress').length})</TabsTrigger>
                  <TabsTrigger value="reported">Reported ({cases.filter(c => c.status === 'report_ready' || c.status === 'awaiting_payment').length})</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab}>
                  {filteredCases.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No cases in this category</p>
                    </div>
                  ) : (
                    <>
                      {/* Desktop Table View */}
                      <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-8 px-2">Patient Name</th>
                              <th className="text-left py-8 px-2">Upload Date</th>
                              <th className="text-left py-8 px-2">Clinical Question</th>
                              <th className="text-left py-8 px-2">Urgency</th>
                              <th className="text-left py-8 px-2">FOV</th>
                              <th className="text-left py-8 px-2">Status</th>
                              <th className="text-left py-8 px-2">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredCases.map((case_) => (
                        <tr key={case_.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-8 px-2 font-medium">{case_.patient_name}</td>
                          <td className="py-8 px-2">
                            {new Date(case_.upload_date).toLocaleDateString()}
                          </td>
                          <td className="py-8 px-2 max-w-xs">
                            <div className="line-clamp-2">
                              {case_.clinical_question}
                            </div>
                          </td>
                          <td className="py-8 px-2">
                            <Badge 
                              variant={case_.urgency === 'urgent' ? 'destructive' : 'secondary'}
                            >
                              {case_.urgency}
                            </Badge>
                          </td>
                          <td className="py-8 px-2">{case_.field_of_view}</td>
                          <td className="py-8 px-2">
                            <Badge className={getStatusColor(case_.status)}>
                              {formatStatus(case_.status)}
                            </Badge>
                          </td>
                          <td className="py-8 px-2">
                            <div className="flex gap-2 flex-wrap">
                              {case_.status === 'report_ready' ? (
                                <>
                                  <Button 
                                    variant="default" 
                                    size="sm"
                                    onClick={() => accessReport(case_)}
                                  >
                                    <FileEdit className="h-4 w-4 mr-2" />
                                    Access Report
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => downloadReport(case_)}
                                    disabled={downloadingReport === case_.id}
                                  >
                                    {downloadingReport === case_.id ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <Download className="h-4 w-4 mr-2" />
                                    )}
                                    Download
                                  </Button>
                                </>
                              ) : (
                                <span className="text-sm text-muted-foreground py-2">
                                  Report in progress...
                                </span>
                              )}
                              <DeleteCaseDialog
                                caseId={case_.id}
                                caseStatus={case_.status}
                                patientName={case_.patient_name}
                                onDeleteSuccess={fetchCases}
                              />
                            </div>
                          </td>
                        </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="lg:hidden space-y-12">
                        {filteredCases.map((case_) => (
                    <Card key={case_.id} className="border border-border shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-12">
                        <div className="space-y-4">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-1">{case_.patient_name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {new Date(case_.upload_date).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge className={getStatusColor(case_.status)}>
                              {formatStatus(case_.status)}
                            </Badge>
                          </div>
                          
                          <div className="space-y-3">
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
                          <div className="flex flex-col gap-2 pt-4 border-t border-border">
                            {case_.status === 'report_ready' ? (
                              <>
                                <Button 
                                  variant="default" 
                                  size="sm" 
                                  className="w-full"
                                  onClick={() => accessReport(case_)}
                                >
                                  <FileEdit className="h-4 w-4 mr-2" />
                                  Access Report
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="w-full"
                                  onClick={() => downloadReport(case_)}
                                  disabled={downloadingReport === case_.id}
                                >
                                  {downloadingReport === case_.id ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4 mr-2" />
                                  )}
                                  Download Report
                                </Button>
                              </>
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-2">
                                Report in progress...
                              </p>
                            )}
                            <DeleteCaseDialog
                              caseId={case_.id}
                              caseStatus={case_.status}
                              patientName={case_.patient_name}
                              onDeleteSuccess={fetchCases}
                            />
                          </div>
                        </div>
                      </CardContent>
                        </Card>
                        ))}
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
