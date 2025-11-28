import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, FileText, Download } from 'lucide-react';
import { InvoicePDF } from '@/components/InvoicePDF';
import { pdf } from '@react-pdf/renderer';

interface UnbilledReport {
  clinic_name: string;
  clinic_email: string;
  report_count: number;
  total_amount: number;
  cases: Array<{
    patient_name: string;
    patient_id: string;
    report_date: string;
    amount: number;
    case_id: string;
    field_of_view: string;
  }>;
}

export function InvoiceGeneration({ onGenerate }: { onGenerate: () => void }) {
  const { toast } = useToast();
  const [unbilledReports, setUnbilledReports] = useState<UnbilledReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);

  useEffect(() => {
    loadUnbilledReports();
  }, []);

  async function loadUnbilledReports() {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_unbilled_reports', {
        p_start_date: startDate || null,
        p_end_date: endDate || null
      });

      if (error) throw error;
      setUnbilledReports((data || []) as UnbilledReport[]);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to load unbilled reports',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  async function generateInvoice(clinic: UnbilledReport, index: number) {
    try {
      setGeneratingIndex(index);
      console.log('Starting invoice generation for:', clinic.clinic_name);

      const invoiceNumber = `INV-${Date.now()}`;
      const issueDate = new Date().toISOString().split('T')[0];
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const lineItems = clinic.cases.map(c => ({
        description: `Patient ID: ${c.patient_id || 'N/A'}`,
        quantity: 1,
        unitPrice: c.amount,
        amount: c.amount,
        field_of_view: c.field_of_view,
        report_date: c.report_date
      }));

      const invoiceData = {
        invoice_number: invoiceNumber,
        invoice_date: issueDate,
        due_date: dueDate,
        clinic_name: clinic.clinic_name,
        clinic_email: clinic.clinic_email,
        clinic_address: '',
        period_start: startDate || issueDate,
        period_end: endDate || issueDate,
        line_items: lineItems.map(item => ({
          description: item.description,
          case_ref: '',
          date: item.report_date,
          field_of_view: item.field_of_view,
          quantity: 1,
          unit_price: item.amount,
          total: item.amount
        })),
        subtotal: clinic.total_amount,
        vat: 0,
        total: clinic.total_amount
      };

      console.log('Generating PDF with data:', invoiceData);
      const pdfBlob = await pdf(
        <InvoicePDF invoice={invoiceData} />
      ).toBlob();
      console.log('PDF generated successfully');

      const fileName = `invoice-${invoiceNumber}.pdf`;
      console.log('Uploading PDF to storage:', fileName);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(fileName, pdfBlob, { contentType: 'application/pdf' });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }
      console.log('PDF uploaded successfully');

      // Get signed URL (valid for 1 year) since bucket is private
      const { data: urlData, error: urlError } = await supabase.storage
        .from('invoices')
        .createSignedUrl(fileName, 31536000); // 1 year in seconds
      
      if (urlError) throw urlError;
      const publicUrl = urlData.signedUrl;

      console.log('Looking up clinic:', clinic.clinic_email);
      const { data: clinicData, error: clinicError } = await supabase
        .from('clinics')
        .select('id')
        .eq('contact_email', clinic.clinic_email)
        .single();

      if (clinicError) {
        console.error('Clinic lookup error:', clinicError);
        throw new Error(`Clinic not found: ${clinicError.message}`);
      }
      if (!clinicData) throw new Error('Clinic not found');
      console.log('Clinic found:', clinicData.id);

      console.log('Creating invoice record in database');
      const { error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          clinic_id: clinicData.id,
          case_id: clinic.cases[0].case_id,
          case_ids: clinic.cases.map(c => c.case_id),
          amount: clinic.total_amount,
          status: 'draft',
          pdf_url: publicUrl,
          pdf_storage_path: fileName,
          line_items: lineItems,
          due_date: dueDate,
          period_start: startDate || null,
          period_end: endDate || null
        });

      if (invoiceError) {
        console.error('Invoice insert error:', invoiceError);
        throw invoiceError;
      }
      console.log('Invoice created successfully:', invoiceNumber);

      toast({
        title: 'Invoice Generated',
        description: `Invoice ${invoiceNumber} created successfully`
      });

      await loadUnbilledReports();
      onGenerate();
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate invoice',
        variant: 'destructive'
      });
    } finally {
      setGeneratingIndex(null);
    }
  }

  const totalRevenue = unbilledReports.reduce((sum, r) => sum + Number(r.total_amount), 0);
  const totalReports = unbilledReports.reduce((sum, r) => sum + r.report_count, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Date Range Filter</CardTitle>
          <CardDescription>Select a date range to filter unbilled reports</CardDescription>
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
            <Button onClick={loadUnbilledReports} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply Filter'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Total Unbilled Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalReports}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Unbilled Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">£{totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unbilled Reports by Clinic</CardTitle>
          <CardDescription>Generate invoices for each clinic</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {unbilledReports.map((clinic, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <h3 className="font-semibold">{clinic.clinic_name}</h3>
                  <p className="text-sm text-muted-foreground">{clinic.clinic_email}</p>
                  <p className="text-sm mt-1">
                    {clinic.report_count} reports • £{clinic.total_amount.toFixed(2)}
                  </p>
                </div>
                <Button
                  onClick={() => generateInvoice(clinic, index)}
                  disabled={generatingIndex !== null}
                >
                  {generatingIndex === index ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Invoice
                    </>
                  )}
                </Button>
              </div>
            ))}
            {unbilledReports.length === 0 && !loading && (
              <p className="text-center text-muted-foreground py-8">
                No unbilled reports found for the selected period
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
