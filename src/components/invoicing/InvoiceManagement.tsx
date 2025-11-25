import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invoiceService } from '@/services/invoiceService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Download, Mail, Clock, CheckCircle, Search, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface Invoice {
  id: string;
  invoice_number: string;
  created_at: string;
  amount: number;
  status: string;
  pdf_url: string;
  pdf_storage_path: string;
  case_ids: string[];
  clinics: {
    name: string;
    contact_email: string;
  };
}

export function InvoiceManagement({ onUpdate }: { onUpdate: () => void }) {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, [statusFilter]);

  async function loadInvoices() {
    try {
      setLoading(true);
      let query = supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          created_at,
          amount,
          status,
          pdf_url,
          case_ids,
          clinic_id
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch clinic details separately
      const invoicesWithClinics = await Promise.all(
        (data || []).map(async (invoice: any) => {
          const { data: clinic } = await supabase
            .from('clinics')
            .select('name, contact_email')
            .eq('id', invoice.clinic_id)
            .single();
          
          return {
            ...invoice,
            clinics: clinic || { name: 'Unknown', contact_email: '' }
          };
        })
      );

      setInvoices(invoicesWithClinics);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  async function sendInvoiceEmail(invoice: Invoice) {
    try {
      setSendingEmail(invoice.id);
      await invoiceService.sendInvoiceEmail(invoice.id);

      toast({
        title: 'Invoice Sent',
        description: `Invoice emailed to ${invoice.clinics.contact_email}`
      });

      await loadInvoices();
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invoice',
        variant: 'destructive'
      });
    } finally {
      setSendingEmail(null);
    }
  }

  async function markAsPaid(invoiceId: string) {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', invoiceId);

      if (error) throw error;

      toast({
        title: 'Invoice Updated',
        description: 'Invoice marked as paid'
      });

      await loadInvoices();
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  }

  async function changeInvoiceStatus(invoiceId: string, newStatus: string) {
    try {
      const updateData: any = {
        status: newStatus,
        status_updated_at: new Date().toISOString()
      };

      // Set/clear timestamps based on status
      if (newStatus === 'paid') {
        updateData.paid_at = new Date().toISOString();
      } else if (newStatus === 'sent') {
        updateData.sent_at = new Date().toISOString();
        updateData.paid_at = null;
      } else {
        updateData.sent_at = null;
        updateData.paid_at = null;
      }

      const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Invoice status changed to ${newStatus}`
      });

      await loadInvoices();
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  }

  function confirmDelete(invoice: Invoice) {
    setInvoiceToDelete(invoice);
    setDeleteDialogOpen(true);
  }

  async function deleteInvoice() {
    if (!invoiceToDelete) return;

    try {
      setDeleting(true);
      await invoiceService.deleteInvoice(invoiceToDelete.id, invoiceToDelete.pdf_storage_path);

      toast({
        title: 'Invoice Deleted',
        description: `Invoice ${invoiceToDelete.invoice_number} has been deleted`
      });

      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
      await loadInvoices();
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete invoice',
        variant: 'destructive'
      });
    } finally {
      setDeleting(false);
    }
  }

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.clinics.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      draft: 'secondary',
      sent: 'default',
      paid: 'default',
      overdue: 'destructive'
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status === 'paid' && <CheckCircle className="h-3 w-3 mr-1" />}
        {status === 'overdue' && <Clock className="h-3 w-3 mr-1" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice List</CardTitle>
        <CardDescription>View and manage all generated invoices</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by invoice number or clinic..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Clinic</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Cases</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{invoice.clinics.name}</div>
                      <div className="text-sm text-muted-foreground">{invoice.clinics.contact_email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{format(new Date(invoice.created_at), 'dd MMM yyyy')}</TableCell>
                  <TableCell>{invoice.case_ids?.length || 0}</TableCell>
                  <TableCell>£{Number(invoice.amount).toFixed(2)}</TableCell>
                  <TableCell>
                    <Select 
                      value={invoice.status} 
                      onValueChange={(value) => changeInvoiceStatus(invoice.id, value)}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(invoice.pdf_url, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {invoice.status !== 'paid' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => sendInvoiceEmail(invoice)}
                            disabled={sendingEmail === invoice.id}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsPaid(invoice.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmDelete(invoice)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredInvoices.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No invoices found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice {invoiceToDelete?.invoice_number}?
              This action cannot be undone and will permanently delete the invoice and its PDF file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteInvoice}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
