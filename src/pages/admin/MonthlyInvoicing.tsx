import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileText, Download, Calendar, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { InvoicePDF } from '@/components/InvoicePDF';
import { pdf } from '@react-pdf/renderer';
import JSZip from 'jszip';

interface MonthlyBillingData {
  clinic_id: string;
  clinic_name: string;
  clinic_email: string;
  clinic_address: string | null;
  case_count: number;
  total_amount: number;
  cases: Array<{
    id: string;
    folder_name: string;
    patient_name: string;
    field_of_view: string;
    price: number;
    completed_at: string;
  }>;
}

export default function MonthlyInvoicing() {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [billingData, setBillingData] = useState<MonthlyBillingData[]>([]);
  
  // Default to current month
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(lastDay.toISOString().split('T')[0]);

  useEffect(() => {
    loadMonthlyBilling();
  }, [startDate, endDate]);

  async function loadMonthlyBilling() {
    setLoading(true);
    try {
      // Get completed cases in date range
      const { data: cases, error: casesError } = await supabase
        .from('cases')
        .select(`
          id,
          folder_name,
          patient_name,
          field_of_view,
          completed_at,
          clinic_id,
          clinics (
            id,
            name,
            contact_email,
            address
          )
        `)
        .eq('status', 'report_ready')
        .not('completed_at', 'is', null)
        .gte('completed_at', `${startDate}T00:00:00`)
        .lte('completed_at', `${endDate}T23:59:59`)
        .order('clinic_id', { ascending: true })
        .order('completed_at', { ascending: true });

      if (casesError) throw casesError;

      // Get pricing rules
      const { data: pricing, error: pricingError } = await supabase
        .from('pricing_rules')
        .select('field_of_view, price')
        .is('effective_to', null)
        .order('effective_from', { ascending: false });

      if (pricingError) throw pricingError;

      const priceMap = (pricing as any[] || []).reduce((acc: Record<string, number>, p: any) => {
        if (!acc[p.field_of_view]) {
          acc[p.field_of_view] = p.price;
        }
        return acc;
      }, {} as Record<string, number>);

      // Group by clinic
      const grouped = (cases || []).reduce((acc, c: any) => {
        const clinicId = c.clinic_id;
        if (!acc[clinicId]) {
          acc[clinicId] = {
            clinic_id: clinicId,
            clinic_name: c.clinics.name,
            clinic_email: c.clinics.contact_email,
            clinic_address: c.clinics.address,
            case_count: 0,
            total_amount: 0,
            cases: []
          };
        }

        const price = priceMap[c.field_of_view] || 125;
        acc[clinicId].case_count++;
        acc[clinicId].total_amount += price;
        acc[clinicId].cases.push({
          id: c.id,
          folder_name: c.folder_name,
          patient_name: c.patient_name,
          field_of_view: c.field_of_view,
          price: price,
          completed_at: c.completed_at
        });

        return acc;
      }, {} as Record<string, MonthlyBillingData>);

      setBillingData(Object.values(grouped));
    } catch (error) {
      console.error('Error loading billing data:', error);
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  }

  async function generatePDFInvoice(clinic: MonthlyBillingData) {
    setGenerating(clinic.clinic_id);
    try {
      // Generate invoice number
      const { data: invoiceNum, error: invoiceError } = await supabase
        .rpc('generate_invoice_number');

      if (invoiceError) throw invoiceError;

      const invoiceData = {
        invoice_number: invoiceNum,
        invoice_date: new Date().toLocaleDateString('en-GB'),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
        clinic_name: clinic.clinic_name,
        clinic_address: clinic.clinic_address || '',
        clinic_email: clinic.clinic_email,
        period_start: new Date(startDate).toLocaleDateString('en-GB'),
        period_end: new Date(endDate).toLocaleDateString('en-GB'),
        line_items: clinic.cases.map(c => ({
          description: `CBCT Report - ${c.patient_name}`,
          case_ref: c.folder_name,
          date: new Date(c.completed_at).toLocaleDateString('en-GB'),
          field_of_view: c.field_of_view,
          quantity: 1,
          unit_price: c.price,
          total: c.price
        })),
        subtotal: clinic.total_amount,
        vat: 0,
        total: clinic.total_amount
      };

      // Generate PDF
      const blob = await pdf(<InvoicePDF invoice={invoiceData} />).toBlob();
      
      // Download PDF
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${invoiceNum}-${clinic.clinic_name.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Invoice generated for ${clinic.clinic_name}`);
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    } finally {
      setGenerating(null);
    }
  }

  async function generateBulkInvoices() {
    if (billingData.length === 0) {
      toast.error('No clinics to generate invoices for');
      return;
    }

    setBulkGenerating(true);
    setBulkProgress(0);

    try {
      const zip = new JSZip();
      const invoicesFolder = zip.folder('invoices');
      
      if (!invoicesFolder) throw new Error('Failed to create zip folder');

      for (let i = 0; i < billingData.length; i++) {
        const clinic = billingData[i];
        
        try {
          // Generate invoice number
          const { data: invoiceNum, error: invoiceError } = await supabase
            .rpc('generate_invoice_number');

          if (invoiceError) throw invoiceError;

          const invoiceData = {
            invoice_number: invoiceNum,
            invoice_date: new Date().toLocaleDateString('en-GB'),
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
            clinic_name: clinic.clinic_name,
            clinic_address: clinic.clinic_address || '',
            clinic_email: clinic.clinic_email,
            period_start: new Date(startDate).toLocaleDateString('en-GB'),
            period_end: new Date(endDate).toLocaleDateString('en-GB'),
            line_items: clinic.cases.map(c => ({
              description: `CBCT Report - ${c.patient_name}`,
              case_ref: c.folder_name,
              date: new Date(c.completed_at).toLocaleDateString('en-GB'),
              field_of_view: c.field_of_view,
              quantity: 1,
              unit_price: c.price,
              total: c.price
            })),
            subtotal: clinic.total_amount,
            vat: 0,
            total: clinic.total_amount
          };

          // Generate PDF
          const blob = await pdf(<InvoicePDF invoice={invoiceData} />).toBlob();
          
          // Add to zip
          const fileName = `Invoice-${invoiceNum}-${clinic.clinic_name.replace(/\s+/g, '-')}.pdf`;
          invoicesFolder.file(fileName, blob);

          // Update progress
          setBulkProgress(Math.round(((i + 1) / billingData.length) * 100));
        } catch (error) {
          console.error(`Error generating invoice for ${clinic.clinic_name}:`, error);
          toast.error(`Failed to generate invoice for ${clinic.clinic_name}`);
        }
      }

      // Generate zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Download zip
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      const monthYear = new Date(startDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' });
      link.download = `Monthly-Invoices-${monthYear.replace(/\s+/g, '-')}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Generated ${billingData.length} invoices successfully`);
    } catch (error) {
      console.error('Error generating bulk invoices:', error);
      toast.error('Failed to generate bulk invoices');
    } finally {
      setBulkGenerating(false);
      setBulkProgress(0);
    }
  }

  const totalCases = billingData.reduce((sum, d) => sum + d.case_count, 0);
  const totalRevenue = billingData.reduce((sum, d) => sum + d.total_amount, 0);

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Monthly Invoicing</h1>
          <p className="text-muted-foreground">
            Generate monthly invoices for each clinic with itemized scan reports
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Clinics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{billingData.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCases}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Date Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Period Selection</CardTitle>
            <CardDescription>Select the billing period for invoice generation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <Button onClick={loadMonthlyBilling} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
                Apply Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Generation Progress */}
        {bulkGenerating && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Generating Invoices...</CardTitle>
              <CardDescription>Please wait while we generate all invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={bulkProgress} className="mb-2" />
              <p className="text-sm text-muted-foreground text-center">
                {bulkProgress}% complete
              </p>
            </CardContent>
          </Card>
        )}

        {/* Billing Data by Clinic */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Clinics & Reports</CardTitle>
                <CardDescription>Itemized reports for each clinic in selected period</CardDescription>
              </div>
              {billingData.length > 0 && (
                <Button
                  onClick={generateBulkInvoices}
                  disabled={bulkGenerating}
                  size="lg"
                >
                  {bulkGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Package className="mr-2 h-4 w-4" />
                      Generate All Invoices
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading billing data...</p>
              </div>
            ) : billingData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No completed reports found in selected period
              </div>
            ) : (
              <div className="space-y-6">
                {billingData.map((clinic) => (
                  <div key={clinic.clinic_id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{clinic.clinic_name}</h3>
                        <p className="text-sm text-muted-foreground">{clinic.clinic_email}</p>
                        {clinic.clinic_address && (
                          <p className="text-sm text-muted-foreground">{clinic.clinic_address}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">£{clinic.total_amount.toFixed(2)}</div>
                        <Badge variant="outline">{clinic.case_count} reports</Badge>
                        <Button
                          className="mt-2"
                          onClick={() => generatePDFInvoice(clinic)}
                          disabled={generating === clinic.clinic_id}
                        >
                          {generating === clinic.clinic_id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <FileText className="mr-2 h-4 w-4" />
                              Generate Invoice PDF
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Case Reference</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead>Field of View</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clinic.cases.map((case_) => (
                          <TableRow key={case_.id}>
                            <TableCell className="font-mono text-sm">{case_.folder_name}</TableCell>
                            <TableCell>{case_.patient_name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{case_.field_of_view}</Badge>
                            </TableCell>
                            <TableCell>{new Date(case_.completed_at).toLocaleDateString('en-GB')}</TableCell>
                            <TableCell className="text-right">£{case_.price.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
