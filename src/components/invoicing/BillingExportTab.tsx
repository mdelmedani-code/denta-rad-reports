import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Loader2 } from 'lucide-react';

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

export function BillingExportTab() {
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
      description: 'Use this file in your accounting software'
    });
  }

  const totalRevenue = reports.reduce((sum, r) => sum + Number(r.total_amount), 0);
  const totalReports = reports.reduce((sum, r) => sum + r.report_count, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Export Billing Data</CardTitle>
          <CardDescription>
            Export unbilled reports to CSV for use in Invoice Ninja, QuickBooks, or Wave
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="export-start-date">Start Date</Label>
              <Input
                id="export-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="export-end-date">End Date</Label>
              <Input
                id="export-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={loadUnbilledReports} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{totalReports}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">£{totalRevenue.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          <Button 
            onClick={exportToCSV} 
            disabled={reports.length === 0}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Export to CSV
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reports.map((clinic, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg"
              >
                <h3 className="font-semibold">{clinic.clinic_name}</h3>
                <p className="text-sm text-muted-foreground">{clinic.clinic_email}</p>
                <p className="text-sm mt-2">
                  {clinic.report_count} reports • £{clinic.total_amount.toFixed(2)}
                </p>
              </div>
            ))}
            {reports.length === 0 && !loading && (
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
