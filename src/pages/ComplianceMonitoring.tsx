import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle, RefreshCw, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface ComplianceReport {
  resource_type: string;
  compliance_standard: string;
  retention_days: number;
  total_records: number;
  needs_archive: number;
  needs_deletion: number;
  compliance_status: 'compliant' | 'action_required';
  cutoff_date: string;
}

interface ComplianceSummary {
  total_policies: number;
  compliant: number;
  action_required: number;
}

export default function ComplianceMonitoring() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);

  useEffect(() => {
    checkCompliance();
  }, []);

  async function checkCompliance() {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-retention-compliance');

      if (error) throw error;

      setReports(data.compliance_report || []);
      setSummary(data.summary || null);
      
      if (data.summary?.action_required > 0) {
        toast.warning(`${data.summary.action_required} compliance issue(s) require attention`);
      }
    } catch (error: any) {
      toast.error('Failed to check compliance');
      console.error('Compliance check error:', error);
    } finally {
      setLoading(false);
      setChecking(false);
    }
  }

  const getStatusColor = (status: string) => {
    return status === 'compliant' ? 'bg-green-500' : 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Data Retention Compliance</h1>
        <Button onClick={checkCompliance} disabled={checking}>
          <RefreshCw className={`mr-2 h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
          Check Compliance
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Policies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_policies}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Compliant</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.compliant}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Action Required</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.action_required}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {summary && summary.action_required > 0 && (
        <Alert className="mb-6 border-red-500">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Data retention policy violations detected. Records past retention period should be archived or deleted.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {reports.map((report) => (
          <Card key={report.resource_type}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {report.resource_type.replace(/_/g, ' ').toUpperCase()}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {report.compliance_standard}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(report.compliance_status)}>
                  {report.compliance_status.replace(/_/g, ' ').toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-semibold">Total Records</p>
                  <p className="text-muted-foreground">{report.total_records}</p>
                </div>
                <div>
                  <p className="font-semibold">Needs Archive</p>
                  <p className="text-muted-foreground">{report.needs_archive}</p>
                </div>
                <div>
                  <p className="font-semibold">Needs Deletion</p>
                  <p className={report.needs_deletion > 0 ? 'text-red-600 font-bold' : 'text-muted-foreground'}>
                    {report.needs_deletion}
                  </p>
                </div>
                <div>
                  <p className="font-semibold">Retention Period</p>
                  <p className="text-muted-foreground">{Math.floor(report.retention_days / 365)} years</p>
                </div>
              </div>
              
              {report.compliance_status === 'action_required' && (
                <Alert className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {report.needs_deletion} record(s) past retention cutoff date ({new Date(report.cutoff_date).toLocaleDateString()}) require immediate action.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
