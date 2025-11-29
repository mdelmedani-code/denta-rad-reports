import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { handleError } from '@/utils/errorHandler';
import { useToast } from '@/hooks/use-toast';
import { TableSkeleton } from '@/components/shared/TableSkeleton';

interface Invoice {
  id: string;
  invoice_number: string;
  created_at: string;
  amount: number;
  status: string;
  due_date: string | null;
  pdf_storage_path: string | null;
  period_start: string | null;
  period_end: string | null;
  sent_at: string | null;
  paid_at: string | null;
}

export default function ClinicInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      handleError(error, 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = async (invoice: Invoice) => {
    if (!invoice.pdf_storage_path) {
      toast({
        title: 'Error',
        description: 'Invoice PDF not available',
        variant: 'destructive',
      });
      return;
    }

    try {
      setDownloadingId(invoice.id);
      const { data, error } = await supabase.storage
        .from('invoices')
        .createSignedUrl(invoice.pdf_storage_path, 60);

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      handleError(error, 'Failed to download invoice');
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Draft', variant: 'secondary' as const, icon: Clock, className: '' },
      sent: { label: 'Sent', variant: 'default' as const, icon: FileText, className: '' },
      paid: { label: 'Paid', variant: 'outline' as const, icon: CheckCircle2, className: 'bg-green-50 text-green-700 border-green-200' },
      overdue: { label: 'Overdue', variant: 'destructive' as const, icon: AlertCircle, className: '' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`flex items-center gap-1 w-fit ${config.className}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const dueInvoices = invoices.filter(inv => inv.status === 'sent' || inv.status === 'overdue');
  const paidInvoices = invoices.filter(inv => inv.status === 'paid');
  const totalDue = dueInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Invoices</h1>
          <p className="text-muted-foreground">
            View and download your invoices
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Outstanding Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dueInvoices.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Due
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{totalDue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Paid Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{paidInvoices.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Invoices</CardTitle>
            <CardDescription>
              View all invoices issued to your clinic
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={5} columns={6} />
            ) : invoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No invoices found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">Invoice Number</th>
                      <th className="text-left py-3 px-2">Date</th>
                      <th className="text-left py-3 px-2">Period</th>
                      <th className="text-left py-3 px-2">Amount</th>
                      <th className="text-left py-3 px-2">Due Date</th>
                      <th className="text-left py-3 px-2">Status</th>
                      <th className="text-left py-3 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b hover:bg-muted/50">
                        <td className="py-4 px-2 font-medium">{invoice.invoice_number}</td>
                        <td className="py-4 px-2">
                          {new Date(invoice.created_at).toLocaleDateString('en-GB')}
                        </td>
                        <td className="py-4 px-2">
                          {invoice.period_start && invoice.period_end ? (
                            <span className="text-sm">
                              {new Date(invoice.period_start).toLocaleDateString('en-GB')} - {new Date(invoice.period_end).toLocaleDateString('en-GB')}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-4 px-2 font-semibold">
                          £{invoice.amount.toFixed(2)}
                        </td>
                        <td className="py-4 px-2">
                          {invoice.due_date ? (
                            <span className={`text-sm ${
                              invoice.status === 'overdue' ? 'text-destructive font-semibold' : ''
                            }`}>
                              {new Date(invoice.due_date).toLocaleDateString('en-GB')}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-4 px-2">
                          {getStatusBadge(invoice.status)}
                        </td>
                        <td className="py-4 px-2">
                          {invoice.pdf_storage_path && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadInvoice(invoice)}
                              disabled={downloadingId === invoice.id}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              {downloadingId === invoice.id ? 'Downloading...' : 'Download'}
                            </Button>
                          )}
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
}
