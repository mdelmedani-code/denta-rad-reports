import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, Download, TrendingUp } from "lucide-react";
import { InvoiceGeneration } from "@/components/invoicing/InvoiceGeneration";
import { InvoiceManagement } from "@/components/invoicing/InvoiceManagement";
import { BillingExportTab } from "@/components/invoicing/BillingExportTab";

export default function UnifiedInvoicing() {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalInvoices: 0,
    pendingAmount: 0,
    paidAmount: 0,
    unbilledReports: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      // Get invoice stats
      const { data: invoices } = await supabase
        .from('invoices')
        .select('amount, status');

      // Get unbilled reports count
      const { data: unbilledData } = await supabase.rpc('get_unbilled_reports', {
        p_start_date: null,
        p_end_date: null
      });

      const unbilledCount = (unbilledData || []).reduce(
        (sum: number, clinic: any) => sum + clinic.report_count, 
        0
      );

      const totalInvoices = invoices?.length || 0;
      const pendingAmount = invoices
        ?.filter(inv => inv.status !== 'paid')
        .reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;
      const paidAmount = invoices
        ?.filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

      setStats({
        totalInvoices,
        pendingAmount,
        paidAmount,
        unbilledReports: unbilledCount
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Invoice Management</h1>
          <p className="text-muted-foreground">
            Generate, manage, and export invoices for clinic services
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalInvoices}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unbilled Reports</CardTitle>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unbilledReports}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{stats.pendingAmount.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{stats.paidAmount.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="manage" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manage">Manage Invoices</TabsTrigger>
            <TabsTrigger value="generate">Generate Invoices</TabsTrigger>
            <TabsTrigger value="export">Export Data</TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="space-y-4">
            <InvoiceManagement onUpdate={loadStats} />
          </TabsContent>

          <TabsContent value="generate" className="space-y-4">
            <InvoiceGeneration onGenerate={loadStats} />
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <BillingExportTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
