import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, Clock, LogOut, Download, Loader2, FileEdit, ChevronDown, PoundSterling } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { DeleteCaseDialog } from "@/components/DeleteCaseDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import dentaradLogo from "@/assets/dentarad-dashboard-logo.png";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UrgencyBadge } from "@/components/shared/UrgencyBadge";
import { useCaseDownload } from "@/hooks/useCaseDownload";
import { DataHandlingDialog } from "@/components/shared/DataHandlingDialog";
import { Case } from "@/types/case";
import { CaseCard } from "@/components/shared/CaseCard";
import { CaseActions } from "@/components/shared/CaseActions";
import { caseService } from '@/services/caseService';
import { handleError } from '@/utils/errorHandler';
import { toast } from '@/lib/toast';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { CardListSkeleton } from '@/components/shared/CardListSkeleton';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'reported'>('all');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const navigate = useNavigate();
  const { 
    requestDownload, 
    confirmDownload, 
    cancelDownload,
    downloadingId, 
    showDataHandlingDialog, 
    setShowDataHandlingDialog,
    pendingDownload 
  } = useCaseDownload();

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const data = await caseService.fetchAll();
      
      // Filter archived cases if the property exists
      const activeCases = data.filter((c) => {
        const archived = (c as Case & { archived?: boolean }).archived;
        return !archived;
      });
      
      // Calculate estimated cost for each case
      const casesWithCost = await Promise.all(
        activeCases.map(async (caseItem) => {
          try {
            const { data: costData } = await supabase.rpc('calculate_case_price', {
              p_field_of_view: caseItem.field_of_view,
              p_urgency: caseItem.urgency,
              p_addons: []
            });
            return { ...caseItem, estimated_cost: costData };
          } catch (err) {
            console.error('Error calculating cost:', err);
            return { ...caseItem, estimated_cost: 0 };
          }
        })
      );
      
      setCases(casesWithCost);
    } catch (error) {
      handleError(error, 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  // Removed: Now using shared utilities from lib/caseUtils.ts and components/shared/StatusBadge.tsx

  // Removed: Now using useCaseDownload hook

  const accessReport = async (caseData: Case) => {
    try {
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
    } catch (error) {
      handleError(error, 'Failed to access report');
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
  const { currentPage, totalPages, paginatedItems, goToPage, hasNextPage, hasPrevPage } = usePagination({
    items: filteredCases,
    itemsPerPage: 10,
  });


  return (
    <div className="min-h-screen bg-background">
      {/* Data Handling Dialog */}
      <DataHandlingDialog
        open={showDataHandlingDialog}
        onOpenChange={setShowDataHandlingDialog}
        onConfirm={confirmDownload}
        downloadType={pendingDownload?.type || 'report'}
        patientName={pendingDownload?.patientName}
      />
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
              <>
                <div className="hidden lg:block">
                  <TableSkeleton rows={10} columns={9} />
                </div>
                <div className="lg:hidden">
                  <CardListSkeleton count={5} />
                </div>
              </>
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
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'pending' | 'reported')} className="w-full">
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
                              <th className="text-left py-8 px-2">Completion Date</th>
                              <th className="text-left py-8 px-2">Clinical Question</th>
                              <th className="text-left py-8 px-2">Urgency</th>
                              <th className="text-left py-8 px-2">FOV</th>
                              <th className="text-left py-8 px-2">Cost</th>
                              <th className="text-left py-8 px-2">Status</th>
                              <th className="text-left py-8 px-2">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedItems.map((case_) => (
                        <tr key={case_.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-8 px-2 font-medium">{case_.patient_name}</td>
                          <td className="py-8 px-2">
                            <span className="text-sm">{new Date(case_.upload_date).toLocaleDateString('en-GB')}</span>
                          </td>
                          <td className="py-8 px-2">
                            {case_.completed_at ? (
                              <span className="text-sm font-semibold text-green-600">
                                {new Date(case_.completed_at).toLocaleDateString('en-GB')}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-8 px-2 max-w-xs">
                            <div className="line-clamp-2">
                              {case_.clinical_question}
                            </div>
                          </td>
                          <td className="py-8 px-2">
                            <UrgencyBadge urgency={case_.urgency} />
                          </td>
                          <td className="py-8 px-2">{case_.field_of_view}</td>
                          <td className="py-8 px-2">
                            <div className="flex items-center text-sm font-medium text-primary">
                              <PoundSterling className="h-4 w-4 mr-1" />
                              {case_.estimated_cost?.toFixed(2) || '0.00'}
                            </div>
                          </td>
                          <td className="py-8 px-2">
                            <StatusBadge status={case_.status} />
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
                                    onClick={() => requestDownload(case_.id, case_.folder_name || '', 'report', case_.patient_name)}
                                    disabled={downloadingId === case_.id}
                                  >
                                    {downloadingId === case_.id ? (
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

                        <PaginationControls
                          currentPage={currentPage}
                          totalPages={totalPages}
                          onPageChange={goToPage}
                          hasNextPage={hasNextPage}
                          hasPrevPage={hasPrevPage}
                        />
                      </div>

                      {/* Mobile Card View */}
                      <div className="lg:hidden space-y-12">
                        {paginatedItems.map((case_) => (
                          <CaseCard
                            key={case_.id}
                            case={case_}
                            showCost={true}
                            actions={
                              <CaseActions
                                caseId={case_.id}
                                folderName={case_.folder_name || ''}
                                status={case_.status}
                                role="clinic"
                                isDownloading={downloadingId === case_.id}
                                onAccessReport={() => accessReport(case_)}
                                onDownloadReport={() => requestDownload(case_.id, case_.folder_name || '', 'report', case_.patient_name)}
                                layout="vertical"
                                additionalActions={
                                  <DeleteCaseDialog
                                    caseId={case_.id}
                                    caseStatus={case_.status}
                                    patientName={case_.patient_name}
                                    onDeleteSuccess={fetchCases}
                                  />
                                }
                              />
                            }
                          />
                        ))}

                        <PaginationControls
                          currentPage={currentPage}
                          totalPages={totalPages}
                          onPageChange={goToPage}
                          hasNextPage={hasNextPage}
                          hasPrevPage={hasPrevPage}
                        />
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
