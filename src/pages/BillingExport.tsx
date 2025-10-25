import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Download, Calendar, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface UnbilledReport {
  clinic_name: string;
  clinic_email: string;
  report_count: number;
  total_amount: number;
  cases: Array<{
    patient_name: string;
    report_date: string;
    amount: number;
    case_id: string;
  }>;
}

export default function BillingExport() {
  const { toast } = useToast();
  const [reports, setReports] = useState<UnbilledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
      setReports((data || []) as UnbilledReport[]);

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

  function exportToCSV() {
    let csv = 'Clinic Name,Clinic Email,Patient Name,Report Date,Amount\n';
    
    reports.forEach(clinic => {
      clinic.cases.forEach(case_ => {
        csv += `"${clinic.clinic_name}","${clinic.clinic_email}","${case_.patient_name}","${new Date(case_.report_date).toLocaleDateString()}",£${case_.amount.toFixed(2)}\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `unbilled-reports-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

      toast({
        title: 'CSV Exported',
        description: 'Use this file to create invoices in Invoice Ninja or your accounting software'
      });
  }

  const totalRevenue = reports.reduce((sum, r) => sum + Number(r.total_amount), 0);
  const totalReports = reports.reduce((sum, r) => sum + r.report_count, 0);

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Billing Export</h1>
          <p className="text-muted-foreground">
            Export unbilled reports to create invoices in Invoice Ninja, QuickBooks, or Wave
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Date Filters</CardTitle>
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
              <Button onClick={loadUnbilledReports}>
                <Calendar className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardDescription>Total Clinics</CardDescription>
              <CardTitle className="text-3xl">{reports.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Total Reports</CardDescription>
              <CardTitle className="text-3xl">{totalReports}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Total Revenue</CardDescription>
              <CardTitle className="text-3xl text-green-600">
                £{totalRevenue.toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="mb-6">
          <Button
            onClick={exportToCSV}
            disabled={reports.length === 0}
            className="w-full"
            size="lg"
          >
            <Download className="w-5 h-5 mr-2" />
            Export to CSV for Invoicing
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                      Clinic
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                      Reports
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : reports.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                        No unbilled reports found
                      </td>
                    </tr>
                  ) : (
                    reports.map((clinic, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4">
                          <p className="font-medium">{clinic.clinic_name}</p>
                          <p className="text-sm text-muted-foreground">{clinic.clinic_email}</p>
                        </td>
                        <td className="px-6 py-4">{clinic.report_count}</td>
                        <td className="px-6 py-4 font-medium">
                          £{Number(clinic.total_amount).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle>How to Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 ml-5 list-decimal">
              <li>Click "Export to CSV" to download the report</li>
              <li>Go to Invoice Ninja → Invoices → Import</li>
              <li>Upload CSV file to bulk create invoices</li>
              <li>Review and email all invoices at once</li>
              <li>Mark as paid in Invoice Ninja when payment received</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-4">
              <strong>Tip:</strong> You can also use QuickBooks, Wave, or PayPal for invoicing
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
