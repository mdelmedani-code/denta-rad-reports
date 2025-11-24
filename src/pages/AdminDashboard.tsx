import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  FileText, 
  Upload, 
  Download, 
  Eye, 
  LogOut,
  Clock,
  Trash2,
  Database
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { DeleteCaseDialog } from "@/components/DeleteCaseDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Case } from "@/types/case";
import { useCaseFilters } from "@/hooks/useCaseFilters";
import { useCaseActions } from "@/hooks/useCaseActions";
import { caseService } from "@/services/caseService";
import { handleError } from "@/utils/errorHandler";
import { toast } from "@/lib/toast";
import { StatsCards } from "@/components/admin/StatsCards";
import { IncomeTracker } from "@/components/admin/IncomeTracker";
import { CaseFilters } from "@/components/admin/CaseFilters";

interface IncomeStats {
  projected_income: number;
  income_so_far: number;
  total_cases: number;
  reported_cases: number;
}

const AdminDashboard = () => {
  const { signOut } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [reportText, setReportText] = useState("");
  const [weeklyStats, setWeeklyStats] = useState<IncomeStats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<IncomeStats | null>(null);
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchDeletePassword, setBatchDeletePassword] = useState("");
  const navigate = useNavigate();

  const { updateCaseStatus, deleteCases, loading: actionLoading } = useCaseActions();
  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    urgencyFilter,
    setUrgencyFilter,
    filteredCases,
  } = useCaseFilters({ cases });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [casesData, stats] = await Promise.all([
        caseService.fetchAll(),
        caseService.fetchIncomeStats(),
      ]);

      setCases(casesData);
      setWeeklyStats(stats.weekly);
      setMonthlyStats(stats.monthly);
    } catch (error) {
      handleError(error, 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (
    caseId: string,
    newStatus: 'uploaded' | 'in_progress' | 'report_ready' | 'awaiting_payment'
  ) => {
    const success = await updateCaseStatus(caseId, newStatus);
    if (success) {
      await loadData();
    }
  };

  const handleBatchDelete = async () => {
    if (selectedCases.length === 0) return;
    if (!batchDeletePassword) {
      toast.error('Password Required', 'Please enter your password to confirm deletion');
      return;
    }

    const success = await deleteCases(selectedCases, batchDeletePassword);
    if (success) {
      setSelectedCases([]);
      setBatchDeletePassword('');
      setBatchDeleteOpen(false);
      await loadData();
    } else {
      setBatchDeletePassword('');
    }
  };

  const toggleCaseSelection = (caseId: string) => {
    setSelectedCases(prev => 
      prev.includes(caseId) 
        ? prev.filter(id => id !== caseId)
        : [...prev, caseId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCases.length === filteredCases.length) {
      setSelectedCases([]);
    } else {
      setSelectedCases(filteredCases.map(c => c.id));
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login");
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke('backup-to-gcs', {
        body: {},
      });

      if (error) throw error;

      toast.success(
        'Backup completed',
        `Successfully backed up ${data.successCount} files to Google Cloud Storage`
      );
    } catch (error) {
      handleError(error, 'Failed to backup files');
    } finally {
      setIsBackingUp(false);
    }
  };

  const stats = useMemo(() => ({
    total: cases.length,
    uploaded: cases.filter((c) => c.status === 'uploaded').length,
    inProgress: cases.filter((c) => c.status === 'in_progress').length,
    ready: cases.filter((c) => c.status === 'report_ready').length,
    urgent: cases.filter((c) => c.urgency === 'urgent').length,
  }), [cases]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center">
                  <FileText className="w-6 h-6 mr-2 text-primary" />
                  DentaRad Admin Dashboard
                </h1>
                <p className="text-muted-foreground">Manage all clinic cases and reports</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="default" onClick={() => navigate("/admin/invoices")}>
                <FileText className="w-4 h-4 mr-2" />
                View Invoices
              </Button>
              <Button 
                variant="outline" 
                onClick={handleBackup}
                disabled={isBackingUp}
              >
                <Database className="w-4 h-4 mr-2" />
                {isBackingUp ? "Backing up..." : "Backup to GCS"}
              </Button>
              <Button variant="outline" onClick={() => navigate("/reporter")}>
                <Eye className="w-4 h-4 mr-2" />
                Reporter Dashboard
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StatsCards {...stats} />

        <IncomeTracker weeklyStats={weeklyStats} monthlyStats={monthlyStats} />

        <CaseFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          urgencyFilter={urgencyFilter}
          setUrgencyFilter={setUrgencyFilter}
        />

        {/* Cases Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Cases ({filteredCases.length})</CardTitle>
                <CardDescription>
                  Manage CBCT scan submissions from all clinics
                </CardDescription>
              </div>
              {selectedCases.length > 0 && (
                <AlertDialog open={batchDeleteOpen} onOpenChange={(open) => {
                  setBatchDeleteOpen(open);
                  if (!open) setBatchDeletePassword("");
                }}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      className="ml-4"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected ({selectedCases.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <Trash2 className="h-5 w-5 text-destructive" />
                        Delete {selectedCases.length} Cases?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-3">
                        <p>
                          Are you sure you want to delete <strong>{selectedCases.length}</strong> selected cases? This action cannot be undone.
                        </p>
                        
                        <div className="space-y-2">
                          <Label htmlFor="batch-password" className="text-sm font-semibold">
                            Confirm your password to delete
                          </Label>
                          <Input
                            id="batch-password"
                            type="password"
                            placeholder="Enter your password"
                            value={batchDeletePassword}
                            onChange={(e) => setBatchDeletePassword(e.target.value)}
                            disabled={actionLoading}
                            className="w-full"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !actionLoading) {
                                handleBatchDelete();
                              }
                            }}
                          />
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.preventDefault();
                          handleBatchDelete();
                        }}
                        disabled={actionLoading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {actionLoading ? (
                          <>
                            <Clock className="mr-2 h-4 w-4 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete {selectedCases.length} Cases
                          </>
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p>Loading cases...</p>
              </div>
            ) : filteredCases.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No cases found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 w-12">
                        <Checkbox
                          checked={selectedCases.length === filteredCases.length && filteredCases.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="text-left py-2">Clinic</th>
                      <th className="text-left py-2">Patient</th>
                      <th className="text-left py-2">Upload Date</th>
                      <th className="text-left py-2">Clinical Question</th>
                      <th className="text-left py-2">Urgency</th>
                      <th className="text-left py-2">FOV</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-left py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCases.map((case_) => (
                      <tr key={case_.id} className="border-b">
                        <td className="py-2">
                          <Checkbox
                            checked={selectedCases.includes(case_.id)}
                            onCheckedChange={() => toggleCaseSelection(case_.id)}
                          />
                        </td>
                        <td className="py-2">
                          <div>
                            <p className="font-medium">{case_.clinics.name}</p>
                            <p className="text-xs text-muted-foreground">{case_.clinics.contact_email}</p>
                          </div>
                        </td>
                        <td className="py-2">{case_.patient_name}</td>
                        <td className="py-2">
                          {new Date(case_.upload_date).toLocaleDateString()}
                        </td>
                        <td className="py-2 max-w-xs">
                          <p className="truncate" title={case_.clinical_question}>
                            {case_.clinical_question}
                          </p>
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
                          <Select
                            value={case_.status}
                            onValueChange={(value) => 
                              handleUpdateStatus(case_.id, value as any)
                            }
                            disabled={actionLoading}
                          >
                            <SelectTrigger className="w-40">
                              <StatusBadge status={case_.status as any} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="uploaded">Uploaded</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="report_ready">Report Ready</SelectItem>
                              <SelectItem value="awaiting_payment">Awaiting Payment</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2">
                          <div className="flex space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => setSelectedCase(case_)}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Case Details</DialogTitle>
                                  <DialogDescription>
                                    {case_.clinics.name} - {case_.patient_name}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Patient Name</Label>
                                      <p className="font-medium">{case_.patient_name}</p>
                                    </div>
                                    <div>
                                      <Label>Upload Date</Label>
                                      <p>{new Date(case_.upload_date).toLocaleString()}</p>
                                    </div>
                                    <div>
                                      <Label>Field of View</Label>
                                      <p>{case_.field_of_view}</p>
                                    </div>
                                    <div>
                                      <Label>Urgency</Label>
                                      <Badge variant={case_.urgency === 'urgent' ? 'destructive' : 'secondary'}>
                                        {case_.urgency}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Clinical Question</Label>
                                    <p className="mt-1 p-2 bg-muted rounded">{case_.clinical_question}</p>
                                  </div>
                                  <div>
                                    <Label htmlFor="report">Report Text</Label>
                                    <Textarea
                                      id="report"
                                      placeholder="Enter report findings..."
                                      value={reportText}
                                      onChange={(e) => setReportText(e.target.value)}
                                      rows={6}
                                    />
                                  </div>
                                  <Button>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload PDF Report
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            <Button variant="outline" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                            
                            <DeleteCaseDialog
                              caseId={case_.id}
                              caseStatus={case_.status}
                              patientName={case_.patient_name}
                              onDeleteSuccess={loadData}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;