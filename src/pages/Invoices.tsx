import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  LogOut,
  ArrowLeft,
  Calendar,
  PoundSterling,
  Clock,
  Edit,
  Save,
  X
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  created_at: string;
  due_date: string;
  paid_at: string | null;
  currency: string;
  line_items: any;
  case_id: string;
  clinic_id: string;
  clinics: {
    name: string;
    contact_email: string;
  };
  cases: {
    patient_name: string;
    clinical_question: string;
  };
}

interface MonthlyInvoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  due_date: string;
  month: number;
  year: number;
  case_count: number;
  clinic_id: string;
  clinics: {
    name: string;
    contact_email: string;
  };
}

const Invoices = () => {
  const { user, signOut } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [monthlyInvoices, setMonthlyInvoices] = useState<MonthlyInvoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [filteredMonthlyInvoices, setFilteredMonthlyInvoices] = useState<MonthlyInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"individual" | "monthly">("individual");
  const [editingInvoice, setEditingInvoice] = useState<Invoice | MonthlyInvoice | null>(null);
  const [editForm, setEditForm] = useState({
    amount: 0,
    status: "",
    due_date: "",
    line_items: ""
  });
  const [generatingMonthly, setGeneratingMonthly] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchInvoices();
    fetchMonthlyInvoices();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [invoices, monthlyInvoices, searchTerm, statusFilter, activeTab]);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          clinics (
            name,
            contact_email
          ),
          cases (
            patient_name,
            clinical_question
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices((data as any) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load invoices: " + error.message,
        variant: "destructive",
      });
    }
  };

  const fetchMonthlyInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('monthly_invoices')
        .select(`
          *,
          clinics (
            name,
            contact_email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMonthlyInvoices((data as any) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load monthly invoices: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterInvoices = () => {
    if (activeTab === "individual") {
      let filtered = invoices;

      if (searchTerm) {
        filtered = filtered.filter(invoice => 
          invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.clinics.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.cases.patient_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (statusFilter !== "all") {
        filtered = filtered.filter(invoice => invoice.status === statusFilter);
      }

      setFilteredInvoices(filtered);
    } else {
      let filtered = monthlyInvoices;

      if (searchTerm) {
        filtered = filtered.filter(invoice => 
          invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.clinics.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (statusFilter !== "all") {
        filtered = filtered.filter(invoice => invoice.status === statusFilter);
      }

      setFilteredMonthlyInvoices(filtered);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getTotalStats = () => {
    if (activeTab === "individual") {
      const total = filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0);
      const pending = filteredInvoices.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + inv.amount, 0);
      const paid = filteredInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
      return { total, pending, paid, count: filteredInvoices.length };
    } else {
      const total = filteredMonthlyInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
      const pending = filteredMonthlyInvoices.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + inv.total_amount, 0);
      const paid = filteredMonthlyInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total_amount, 0);
      return { total, pending, paid, count: filteredMonthlyInvoices.length };
    }
  };

  const stats = getTotalStats();

  const openEditModal = (invoice: Invoice | MonthlyInvoice) => {
    setEditingInvoice(invoice);
    setEditForm({
      amount: activeTab === "individual" ? (invoice as Invoice).amount : (invoice as MonthlyInvoice).total_amount,
      status: invoice.status,
      due_date: invoice.due_date.split('T')[0],
      line_items: activeTab === "individual" ? JSON.stringify((invoice as Invoice).line_items, null, 2) : ""
    });
  };

  const handleSaveEdit = async () => {
    if (!editingInvoice) return;

    try {
      const table = activeTab === "individual" ? "invoices" : "monthly_invoices";
      const amountField = activeTab === "individual" ? "amount" : "total_amount";
      
      const updateData: any = {
        [amountField]: editForm.amount,
        status: editForm.status,
        due_date: editForm.due_date
      };

      if (activeTab === "individual") {
        updateData.line_items = JSON.parse(editForm.line_items);
      }

      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', editingInvoice.id);

      if (error) throw error;

      // Refresh data
      if (activeTab === "individual") {
        await fetchInvoices();
      } else {
        await fetchMonthlyInvoices();
      }

      setEditingInvoice(null);
      toast({
        title: "Success",
        description: "Invoice updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update invoice: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleGenerateMonthlyInvoices = async () => {
    setGeneratingMonthly(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-monthly-invoices');

      if (error) throw error;

      toast({
        title: "Success",
        description: `Generated ${data.invoices?.length || 0} monthly invoices for last month`,
      });

      // Refresh the monthly invoices
      await fetchMonthlyInvoices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to generate monthly invoices: " + error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingMonthly(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                onClick={() => navigate("/admin")}
                className="mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center">
                  <FileText className="w-6 h-6 mr-2 text-primary" />
                  Invoices Management
                </h1>
                <p className="text-muted-foreground">Manage all invoices and billing</p>
              </div>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <FileText className="w-8 h-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm text-muted-foreground">Total Invoices</p>
                  <p className="text-2xl font-bold">{stats.count}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <PoundSterling className="w-8 h-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold">£{stats.total.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-yellow-600" />
                <div className="ml-3">
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">£{stats.pending.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <PoundSterling className="w-8 h-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm text-muted-foreground">Paid</p>
                  <p className="text-2xl font-bold">£{stats.paid.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex space-x-4">
                <Button 
                  variant={activeTab === "individual" ? "default" : "outline"}
                  onClick={() => setActiveTab("individual")}
                >
                  Individual Invoices
                </Button>
                <Button 
                  variant={activeTab === "monthly" ? "default" : "outline"}
                  onClick={() => setActiveTab("monthly")}
                >
                  Monthly Invoices
                </Button>
              </div>
              {activeTab === "monthly" && (
                <Button 
                  onClick={handleGenerateMonthlyInvoices}
                  disabled={generatingMonthly}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  {generatingMonthly ? "Generating..." : "Generate Monthly Invoices"}
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Invoice number, clinic, or patient..."
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
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button variant="outline" onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }} className="w-full">
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {activeTab === "individual" ? "Individual Invoices" : "Monthly Invoices"} ({activeTab === "individual" ? filteredInvoices.length : filteredMonthlyInvoices.length})
            </CardTitle>
            <CardDescription>
              {activeTab === "individual" 
                ? "Per-case invoices generated automatically"
                : "Monthly summary invoices for clinic billing"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p>Loading invoices...</p>
              </div>
            ) : (activeTab === "individual" ? filteredInvoices : filteredMonthlyInvoices).length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No invoices found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Invoice #</th>
                      <th className="text-left py-2">Clinic</th>
                      {activeTab === "individual" ? (
                        <th className="text-left py-2">Patient</th>
                      ) : (
                        <th className="text-left py-2">Period</th>
                      )}
                      <th className="text-left py-2">Amount</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-left py-2">Due Date</th>
                      <th className="text-left py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeTab === "individual" ? filteredInvoices : filteredMonthlyInvoices).map((invoice) => (
                      <tr key={invoice.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 font-mono text-sm">{invoice.invoice_number}</td>
                        <td className="py-3">{invoice.clinics.name}</td>
                        {activeTab === "individual" ? (
                          <td className="py-3">{(invoice as Invoice).cases.patient_name}</td>
                        ) : (
                          <td className="py-3">{(invoice as MonthlyInvoice).month}/{(invoice as MonthlyInvoice).year}</td>
                        )}
                        <td className="py-3 font-semibold">
                          £{(activeTab === "individual" ? (invoice as Invoice).amount : (invoice as MonthlyInvoice).total_amount).toFixed(2)}
                        </td>
                        <td className="py-3">
                          <Badge variant="secondary" className={getStatusColor(invoice.status)}>
                            {formatStatus(invoice.status)}
                          </Badge>
                        </td>
                        <td className="py-3">{new Date(invoice.due_date).toLocaleDateString()}</td>
                         <td className="py-3">
                           <div className="flex space-x-2">
                             <Button 
                               variant="outline" 
                               size="sm"
                               onClick={() => openEditModal(invoice)}
                             >
                               <Edit className="w-4 h-4" />
                             </Button>
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

      {/* Edit Invoice Modal */}
      <Dialog open={!!editingInvoice} onOpenChange={() => setEditingInvoice(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount (£)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={editForm.status} onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={editForm.due_date}
                onChange={(e) => setEditForm(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>

            {activeTab === "individual" && (
              <div>
                <Label htmlFor="line_items">Line Items (JSON)</Label>
                <Textarea
                  id="line_items"
                  value={editForm.line_items}
                  onChange={(e) => setEditForm(prev => ({ ...prev, line_items: e.target.value }))}
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditingInvoice(null)}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Invoices;