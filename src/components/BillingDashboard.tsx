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
  stripe_customer_id: string | null;
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
            email,
            stripe_customer_id
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
        .select('field_of_view, price_gbp');

      if (pricingError) throw pricingError;

      const priceMap = (pricing as any[] || []).reduce((acc: Record<string, number>, p: any) => {
        acc[p.field_of_view] = p.price_gbp;
        return acc;
      }, {} as Record<string, number>);

      // Group by clinic
      const grouped = cases.reduce((acc, c: any) => {
        const clinicId = c.clinic_id;
        if (!acc[clinicId]) {
          acc[clinicId] = {
            clinic_id: clinicId,
            clinic_name: c.clinics.name,
            clinic_email: c.clinics.email,
            stripe_customer_id: c.clinics.stripe_customer_id,
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

  // Export to CSV with Stripe instructions
  function exportToCSV() {
    const rows = [
      ['Clinic Name', 'Email', 'Stripe Customer ID', 'Case Count', 'Total Amount (£)', 'Case List']
    ];

    billingData.forEach(clinic => {
      const caseList = clinic.cases
        .map(c => `${c.folder_name} (${c.field_of_view})`)
        .join('; ');

      rows.push([
        clinic.clinic_name,
        clinic.clinic_email,
        clinic.stripe_customer_id || 'NOT SET',
        clinic.case_count.toString(),
        clinic.total_amount.toFixed(2),
        caseList
      ]);
    });

    // Add summary row
    rows.push([]);
    rows.push(['TOTAL', '', '', totalCases.toString(), totalAmount.toFixed(2), '']);

    // Add instructions
    const monthYear = new Date(startDate).toLocaleDateString('en-GB', { 
      month: 'long', 
      year: 'numeric' 
    });

    rows.push([]);
    rows.push(['INSTRUCTIONS FOR STRIPE INVOICING:']);
    rows.push(['1. Go to: https://dashboard.stripe.com/invoices']);
    rows.push(['2. Click "Create invoice"']);
    rows.push(['3. For each clinic above:']);
    rows.push([`   - Customer: Enter clinic name and email (or use Stripe Customer ID if set)`]);
    rows.push([`   - Description: "CBCT Reporting - ${monthYear}"`]);
    rows.push(['   - Amount: Copy from "Total Amount (£)" column']);
    rows.push(['   - Due date: 30 days from today']);
    rows.push(['   - Payment methods: Enable "Bank Transfer"']);
    rows.push(['   - Click "Send invoice"']);
    rows.push(['4. Stripe will automatically email the invoice to the clinic']);
    rows.push(['5. Clinic receives professional invoice with your bank details']);
    rows.push(['6. Clinic pays via bank transfer (no fees for you)']);
    rows.push(['7. When payments arrive, return to DentaRad and click "Mark All as Billed"']);
    rows.push([]);
    rows.push(['💰 COST: £0 per month (no transaction fees with bank transfer)']);

    const csv = rows.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dentarad_stripe_billing_${startDate}_to_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported billing for ${billingData.length} clinics`);
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

  // Generate Stripe invoice link
  function getStripeLink(clinic: BillingData) {
    if (!clinic.stripe_customer_id) {
      toast.error('This clinic has no Stripe customer ID. Set it up in Stripe first.');
      return;
    }

    const monthYear = new Date(startDate).toLocaleDateString('en-GB', { 
      month: 'long', 
      year: 'numeric' 
    });

    const params = new URLSearchParams({
      'customer': clinic.stripe_customer_id,
      'currency': 'gbp',
      'description': `CBCT Reporting Services - ${monthYear} (${clinic.case_count} cases)`
    });

    // Copy amount to clipboard
    navigator.clipboard.writeText(clinic.total_amount.toFixed(2));
    toast.success(`Amount £${clinic.total_amount.toFixed(2)} copied to clipboard`);

    window.open(
      `https://dashboard.stripe.com/invoices/create?${params.toString()}`,
      '_blank'
    );
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
            Export unbilled cases for manual Stripe invoicing (bank transfer - no fees)
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
              Export to CSV
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
          <CardTitle>Invoices to Create</CardTitle>
          <CardDescription>
            Click "Create Invoice" to open Stripe with pre-filled data
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
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
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
                    <TableCell>
                      {clinic.stripe_customer_id ? (
                        <Badge variant="default">Ready</Badge>
                      ) : (
                        <Badge variant="destructive">No Stripe ID</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => getStripeLink(clinic)}
                        disabled={!clinic.stripe_customer_id}
                      >
                        Create Invoice
                      </Button>
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
            <p className="font-semibold">Monthly Invoicing Process (25 minutes):</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Select date range (usually previous month)</li>
              <li>Click "Export to CSV" - downloads file with all clinic details and amounts</li>
              <li>Open Stripe Dashboard: <a href="https://dashboard.stripe.com/invoices" target="_blank" rel="noopener noreferrer" className="text-primary underline">https://dashboard.stripe.com/invoices</a></li>
              <li>Create invoice for each clinic (2 minutes each):
                <ul className="list-disc list-inside ml-6 mt-1">
                  <li>Copy clinic name and email from CSV</li>
                  <li>Copy total amount from CSV</li>
                  <li>Set description: "CBCT Reporting - [Month] [Year]"</li>
                  <li>Enable payment method: Bank Transfer</li>
                  <li>Set due date: 30 days</li>
                  <li>Click "Send invoice"</li>
                </ul>
              </li>
              <li>Stripe automatically emails professional invoice to clinic</li>
              <li>Clinic receives invoice with your bank details included</li>
              <li>Clinic pays via bank transfer (their normal payment method)</li>
              <li>When payments arrive in your bank account, click "Mark All as Billed"</li>
              <li>Optionally click "Archive Billed Cases" to clean up dashboard</li>
            </ol>
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded-md border border-green-200 dark:border-green-800">
              <p className="font-semibold text-green-900 dark:text-green-100">💰 Cost: £0 per month</p>
              <p className="text-sm text-green-800 dark:text-green-200">No transaction fees with bank transfer payment method</p>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
