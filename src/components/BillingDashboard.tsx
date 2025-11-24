import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, CheckCircle, PoundSterling, Calendar, Archive, Info, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface BillingData {
  clinic_id: string;
  clinic_name: string;
  clinic_email: string;
  case_count: number;
  total_amount: number;
  case_ids: string[];
  cases: Array<{
    id: string;
    folder_name: string;
    patient_name: string;
    field_of_view: string;
    price: number;
    created_at: string;
  }>;
}

export function BillingDashboard() {
  const [loading, setLoading] = useState(false);
  const [billingData, setBillingData] = useState<BillingData[]>([]);
  
  // Default to current month
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(lastDay.toISOString().split('T')[0]);

  // Load billing data
  async function loadBillingData() {
    setLoading(true);
    try {
      // Get unbilled completed cases (filtered by completion date, exclude archived)
      const { data: cases, error: casesError } = await supabase
        .from('cases')
        .select(`
          id,
          folder_name,
          patient_name,
          field_of_view,
          completed_at,
          created_at,
          clinic_id,
          clinics (
            id,
            name,
            contact_email
          )
        `)
        .eq('status', 'report_ready')
        .eq('billed', false)
        .eq('archived', false)
        .not('completed_at', 'is', null)
        .gte('completed_at', `${startDate}T00:00:00`)
        .lte('completed_at', `${endDate}T23:59:59`)
        .order('clinic_id', { ascending: true })
        .order('completed_at', { ascending: true });

      if (casesError) throw casesError;

      // Get pricing rules
      const { data: pricing, error: pricingError } = await supabase
        .from('pricing_rules')
        .select('field_of_view, price');

      if (pricingError) throw pricingError;

      const priceMap = (pricing as any[] || []).reduce((acc: Record<string, number>, p: any) => {
        acc[p.field_of_view] = p.price;
        return acc;
      }, {} as Record<string, number>);

      // Group by clinic
      const grouped = cases.reduce((acc, c: any) => {
        const clinicId = c.clinic_id;
        if (!acc[clinicId]) {
          acc[clinicId] = {
            clinic_id: clinicId,
            clinic_name: c.clinics.name,
            clinic_email: c.clinics.contact_email,
            case_count: 0,
            total_amount: 0,
            case_ids: [],
            cases: []
          };
        }

        const price = priceMap[c.field_of_view] || 100;
        acc[clinicId].case_count++;
        acc[clinicId].total_amount += price;
        acc[clinicId].case_ids.push(c.id);
        acc[clinicId].cases.push({
          id: c.id,
          folder_name: c.folder_name,
          patient_name: c.patient_name,
          field_of_view: c.field_of_view,
          price: price,
          created_at: c.completed_at || c.created_at
        });

        return acc;
      }, {} as Record<string, BillingData>);

      setBillingData(Object.values(grouped));
    } catch (error) {
      console.error('Load billing error:', error);
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBillingData();
  }, [startDate, endDate]);

  // Export to CSV in Invoice Ninja format
  function exportToCSV() {
    const today = new Date();
    const invoiceDate = today.toISOString().split('T')[0];
    const dueDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const monthYear = new Date(startDate).toLocaleDateString('en-GB', { 
      month: 'long', 
      year: 'numeric' 
    });

    // Invoice Ninja CSV format
    const rows = [
      ['Client', 'Email', 'Invoice Date', 'Due Date', 'Item', 'Description', 'Quantity', 'Rate', 'Tax']
    ];

    billingData.forEach(clinic => {
      const description = `${monthYear} - ${clinic.case_count} cases: ${clinic.cases.slice(0, 5).map(c => c.folder_name).join(', ')}${clinic.cases.length > 5 ? '...' : ''}`;
      
      rows.push([
        clinic.clinic_name,
        clinic.clinic_email,
        invoiceDate,
        dueDate,
        'CBCT Reporting Services',
        description,
        '1',
        clinic.total_amount.toFixed(2),
        '0' // Change to '20' if VAT registered
      ]);
    });

    // Create CSV
    const csv = rows.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dentarad_invoice_ninja_${startDate}_to_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${billingData.length} invoices for Invoice Ninja`);
  }

  // Mark as billed
  async function markAsBilled() {
    if (!confirm('Mark all these cases as billed? This cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const allCaseIds = billingData.flatMap(c => c.case_ids);

      const { error } = await supabase
        .from('cases')
        .update({
          billed: true,
          billed_at: new Date().toISOString()
        })
        .in('id', allCaseIds);

      if (error) throw error;

      toast.success(`Marked ${allCaseIds.length} cases as billed`);
      loadBillingData(); // Refresh
    } catch (error) {
      console.error('Mark as billed error:', error);
      toast.error('Failed to mark cases as billed');
    } finally {
      setLoading(false);
    }
  }

  // Archive billed cases
  async function archiveBilledCases() {
    if (!confirm('Archive all billed cases shown? They will be hidden from main views but remain in the database.')) {
      return;
    }

    setLoading(true);
    try {
      const allCaseIds = billingData.flatMap(c => c.case_ids);

      const { error } = await supabase
        .from('cases')
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
          archived_reason: 'Invoiced and archived from billing dashboard'
        })
        .in('id', allCaseIds)
        .eq('billed', true); // Only archive if already marked as billed

      if (error) throw error;

      toast.success(`Archived ${allCaseIds.length} billed cases`);
      loadBillingData(); // Refresh
    } catch (error) {
      console.error('Archive error:', error);
      toast.error('Failed to archive cases');
    } finally {
      setLoading(false);
    }
  }


  const totalCases = billingData.reduce((sum, c) => sum + c.case_count, 0);
  const totalAmount = billingData.reduce((sum, c) => sum + c.total_amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCases}</div>
            <p className="text-xs text-muted-foreground">
              Unbilled completed cases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clinics</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billingData.length}</div>
            <p className="text-xs text-muted-foreground">
              With unbilled cases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <PoundSterling className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{totalAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              To be invoiced
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Date Range & Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Billing Export</CardTitle>
          <CardDescription>
            Export unbilled cases as CSV for Invoice Ninja bulk import (creates 10 invoices in 2 minutes)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={exportToCSV}
              disabled={loading || billingData.length === 0}
              variant="outline"
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Export for Invoice Ninja
            </Button>

            <Button
              onClick={markAsBilled}
              disabled={loading || billingData.length === 0}
              variant="default"
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark All as Billed
            </Button>

            <Button
              onClick={archiveBilledCases}
              disabled={loading || billingData.length === 0}
              variant="secondary"
              className="flex-1"
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive Billed Cases
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Billing Table */}
      <Card>
        <CardHeader>
          <CardTitle>Unbilled Cases by Clinic</CardTitle>
          <CardDescription>
            Export to CSV to create bulk invoices in Invoice Ninja
          </CardDescription>
        </CardHeader>
        <CardContent>
          {billingData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No unbilled cases for this period</p>
              <p className="text-sm mt-2">All caught up!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clinic</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Cases</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingData.map((clinic) => (
                  <TableRow key={clinic.clinic_id}>
                    <TableCell className="font-medium">
                      {clinic.clinic_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {clinic.clinic_email}
                    </TableCell>
                    <TableCell className="text-right">
                      {clinic.case_count}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      £{clinic.total_amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Instructions Panel */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-semibold">Monthly Invoicing with Invoice Ninja (5 minutes):</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Select date range (usually previous month)</li>
              <li>Click "Export for Invoice Ninja" - downloads CSV</li>
              <li>Login to Invoice Ninja: <a href="https://app.invoiceninja.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">app.invoiceninja.com</a></li>
              <li>Go to: Invoices → Import</li>
              <li>Upload the CSV file</li>
              <li>Review mapping (should be automatic after first time)</li>
              <li>Click "Import" - all invoices created instantly</li>
              <li>Review invoices → Click "Email All"</li>
              <li>Clinics receive professional invoices automatically</li>
              <li>When payments arrive, mark invoices as paid in Invoice Ninja</li>
              <li>Return to DentaRad → Click "Mark All as Billed"</li>
              <li>Optionally click "Archive Billed Cases" to clean up dashboard</li>
            </ol>
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
              <p className="font-semibold text-blue-900 dark:text-blue-100">⚡ Time: 5 minutes per month</p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Invoice Ninja: £8/month (£96/year) | Bank transfer = no transaction fees
              </p>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
