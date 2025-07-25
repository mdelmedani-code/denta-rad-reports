import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  FileText, 
  Upload, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  LogOut,
  Users,
  BarChart3,
  Clock,
  TrendingUp,
  PoundSterling,
  Calendar
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
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
  clinics: {
    name: string;
    contact_email: string;
  };
}

interface IncomeStats {
  projected_income: number;
  income_so_far: number;
  total_cases: number;
  reported_cases: number;
}

// Admin Dashboard Component - Updated icons to use PoundSterling
const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [reportText, setReportText] = useState("");
  const [weeklyStats, setWeeklyStats] = useState<IncomeStats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<IncomeStats | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchCases();
    fetchIncomeStats();
  }, []);

  useEffect(() => {
    filterCases();
  }, [cases, searchTerm, statusFilter, urgencyFilter]);

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

  const fetchIncomeStats = async () => {
    try {
      // Fetch weekly stats
      const { data: weeklyData, error: weeklyError } = await supabase
        .rpc('get_weekly_income_stats');
      
      if (weeklyError) throw weeklyError;
      setWeeklyStats(weeklyData?.[0] || null);

      // Fetch monthly stats
      const { data: monthlyData, error: monthlyError } = await supabase
        .rpc('get_monthly_income_stats');
      
      if (monthlyError) throw monthlyError;
      setMonthlyStats(monthlyData?.[0] || null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load income stats: " + error.message,
        variant: "destructive",
      });
    }
  };

  const filterCases = () => {
    let filtered = cases;

    if (searchTerm) {
      filtered = filtered.filter(case_ => 
        case_.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        case_.clinical_question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        case_.clinics.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(case_ => case_.status === statusFilter);
    }

    if (urgencyFilter !== "all") {
      filtered = filtered.filter(case_ => case_.urgency === urgencyFilter);
    }

    setFilteredCases(filtered);
  };

  const updateCaseStatus = async (caseId: string, newStatus: 'uploaded' | 'in_progress' | 'report_ready' | 'awaiting_payment') => {
    try {
      const { error } = await supabase
        .from('cases')
        .update({ status: newStatus })
        .eq('id', caseId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: "Case status has been updated successfully",
      });

      fetchCases();
      fetchIncomeStats(); // Refresh income stats when case status changes
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update status: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login");
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

  const getStats = () => {
    const total = cases.length;
    const uploaded = cases.filter(c => c.status === 'uploaded').length;
    const inProgress = cases.filter(c => c.status === 'in_progress').length;
    const ready = cases.filter(c => c.status === 'report_ready').length;
    const urgent = cases.filter(c => c.urgency === 'urgent').length;

    return { total, uploaded, inProgress, ready, urgent };
  };

  const stats = getStats();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center">
                <FileText className="w-6 h-6 mr-2 text-primary" />
                DentaRad Admin Dashboard
              </h1>
              <p className="text-muted-foreground">Manage all clinic cases and reports</p>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <BarChart3 className="w-8 h-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm text-muted-foreground">Total Cases</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Upload className="w-8 h-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm text-muted-foreground">Uploaded</p>
                  <p className="text-2xl font-bold">{stats.uploaded}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-yellow-600" />
                <div className="ml-3">
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold">{stats.inProgress}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <FileText className="w-8 h-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm text-muted-foreground">Reports Ready</p>
                  <p className="text-2xl font-bold">{stats.ready}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-red-600" />
                <div className="ml-3">
                  <p className="text-sm text-muted-foreground">Urgent</p>
                  <p className="text-2xl font-bold">{stats.urgent}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Income Tracker */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Weekly Income Tracker */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                This Week
              </CardTitle>
              <CardDescription>Income tracking for current week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <TrendingUp className="w-8 h-8 text-green-600" />
                    <div className="ml-3">
                      <p className="text-sm text-muted-foreground">Projected Income</p>
                      <p className="text-2xl font-bold">
                        £{weeklyStats?.projected_income?.toFixed(2) || '0.00'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {weeklyStats?.total_cases || 0} total cases
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="flex items-center">
                    <PoundSterling className="w-8 h-8 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-sm text-muted-foreground">Income So Far</p>
                      <p className="text-2xl font-bold">
                        £{weeklyStats?.income_so_far?.toFixed(2) || '0.00'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {weeklyStats?.reported_cases || 0} completed cases
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Income Tracker */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
                This Month
              </CardTitle>
              <CardDescription>Income tracking for current month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <TrendingUp className="w-8 h-8 text-green-600" />
                    <div className="ml-3">
                      <p className="text-sm text-muted-foreground">Projected Income</p>
                      <p className="text-2xl font-bold">
                        £{monthlyStats?.projected_income?.toFixed(2) || '0.00'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {monthlyStats?.total_cases || 0} total cases
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="flex items-center">
                    <PoundSterling className="w-8 h-8 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-sm text-muted-foreground">Income So Far</p>
                      <p className="text-2xl font-bold">
                        £{monthlyStats?.income_so_far?.toFixed(2) || '0.00'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {monthlyStats?.reported_cases || 0} completed cases
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Patient, clinic, or question..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="uploaded">Uploaded</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="report_ready">Report Ready</SelectItem>
                    <SelectItem value="awaiting_payment">Awaiting Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="urgency">Urgency</Label>
                <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All urgencies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Urgencies</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button variant="outline" onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setUrgencyFilter("all");
                }} className="w-full">
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cases Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Cases ({filteredCases.length})</CardTitle>
            <CardDescription>
              Manage CBCT scan submissions from all clinics
            </CardDescription>
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
                            onValueChange={(value) => updateCaseStatus(case_.id, value as 'uploaded' | 'in_progress' | 'report_ready' | 'awaiting_payment')}
                          >
                            <SelectTrigger className="w-40">
                              <Badge className={getStatusColor(case_.status)}>
                                {formatStatus(case_.status)}
                              </Badge>
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