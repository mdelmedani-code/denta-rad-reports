import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Mail, Eye, Search, Filter, FileText, Loader2, CheckCircle, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface Invoice {
  id: string;
  invoice_number: string;
  clinic_id: string;
  clinics: {
    name: string;
    contact_email: string;
  };
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  due_date: string;
  sent_at: string | null;
  paid_at: string | null;
  period_start: string;
  period_end: string;
  pdf_url: string;
  pdf_storage_path: string;
  case_ids: string[];
}

export default function InvoiceViewer() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderInvoice, setReminderInvoice] = useState<Invoice | null>(null);
  const [reminderType, setReminderType] = useState<'pre_due' | 'overdue'>('pre_due');
  const [sendingReminder, setSendingReminder] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, [statusFilter]);

  async function loadInvoices() {
    setLoading(true);
    try {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          clinics (
            name,
            contact_email
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      setInvoices((data as any) || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }

  async function downloadInvoice(invoice: Invoice) {
    try {
      const { data, error } = await supabase.storage
        .from('invoices')
        .download(invoice.pdf_storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${invoice.invoice_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Invoice downloaded');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    }
  }

  function openReminderDialog(invoice: Invoice) {
    setReminderInvoice(invoice);
    
    // Auto-detect reminder type based on due date
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    const isOverdue = dueDate < today;
    
    setReminderType(isOverdue ? 'overdue' : 'pre_due');
    setReminderDialogOpen(true);
  }

  async function sendReminderEmail() {
    if (!reminderInvoice) return;
    
    setSendingReminder(true);
    try {
      const dueDate = new Date(reminderInvoice.due_date);
      const today = new Date();
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      const { error } = await supabase.functions.invoke('send-invoice-reminder', {
        body: {
          invoice_id: reminderInvoice.id,
          clinic_email: reminderInvoice.clinics.contact_email,
          clinic_name: reminderInvoice.clinics.name,
          invoice_number: reminderInvoice.invoice_number,
          amount: reminderInvoice.amount,
          due_date: reminderInvoice.due_date,
          reminder_type: reminderType,
          days_until_due: reminderType === 'pre_due' ? daysUntilDue : undefined,
          days_overdue: reminderType === 'overdue' ? daysOverdue : undefined
        }
      });

      if (error) throw error;

      toast.success(`${reminderType === 'pre_due' ? 'Payment reminder' : 'Overdue notice'} sent to ${reminderInvoice.clinics.contact_email}`);
      setReminderDialogOpen(false);
      setReminderInvoice(null);
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('Failed to send reminder email');
    } finally {
      setSendingReminder(false);
    }
  }

  async function sendInvoiceEmail(invoice: Invoice) {
    setSendingEmail(invoice.id);
    try {
      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          invoice_id: invoice.id,
          clinic_email: invoice.clinics.contact_email,
          clinic_name: invoice.clinics.name,
          invoice_number: invoice.invoice_number,
          pdf_storage_path: invoice.pdf_storage_path,
          amount: invoice.amount,
          due_date: invoice.due_date
        }
      });

      if (error) throw error;

      toast.success(`Invoice emailed to ${invoice.clinics.contact_email}`);
      loadInvoices(); // Reload to show updated status
    } catch (error) {
      console.error('Error sending invoice email:', error);
      toast.error('Failed to send invoice email');
    } finally {
      setSendingEmail(null);
    }
  }

  async function updateInvoiceStatus() {
    if (!selectedInvoice) return;

    try {
      const updates: any = {
        status: newStatus,
        status_updated_at: new Date().toISOString()
      };

      if (newStatus === 'paid') {
        updates.paid_at = new Date().toISOString();
        updates.payment_method = paymentMethod;
      }

      const { error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', selectedInvoice.id);

      if (error) throw error;

      toast.success('Invoice status updated');
      setUpdateDialogOpen(false);
      loadInvoices();
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice status');
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      draft: { variant: 'secondary', label: 'Draft' },
      sent: { variant: 'default', label: 'Sent' },
      paid: { variant: 'default', label: 'Paid', className: 'bg-green-500' },
      overdue: { variant: 'destructive', label: 'Overdue' }
    };
    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const filteredInvoices = invoices.filter(inv =>
    inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.clinics.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const paidAmount = filteredInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + Number(inv.amount), 0);

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Invoice Manager</h1>
          <p className="text-muted-foreground">
            Browse, manage, and track all generated invoices
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredInvoices.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{totalAmount.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">£{paidAmount.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">£{(totalAmount - paidAmount).toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Invoice # or clinic..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={loadInvoices} disabled={loading}>
                <Filter className="mr-2 h-4 w-4" />
                Apply Filters
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setStartDate('');
                  setEndDate('');
                  loadInvoices();
                }}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading invoices...</p>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No invoices found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Clinic</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Cases</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{invoice.clinics.name}</div>
                          <div className="text-sm text-muted-foreground">{invoice.clinics.contact_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(invoice.created_at).toLocaleDateString('en-GB')}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(invoice.period_start).toLocaleDateString('en-GB')} - {new Date(invoice.period_end).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{invoice.case_ids.length} cases</Badge>
                      </TableCell>
                      <TableCell className="font-semibold">£{Number(invoice.amount).toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadInvoice(invoice)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendInvoiceEmail(invoice)}
                            disabled={sendingEmail === invoice.id}
                          >
                            {sendingEmail === invoice.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Mail className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openReminderDialog(invoice)}
                            title="Send payment reminder"
                          >
                            <Bell className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setNewStatus(invoice.status);
                              setPaymentMethod('');
                              setUpdateDialogOpen(true);
                            }}
                          >
                            Update Status
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Update Status Dialog */}
        <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Invoice Status</DialogTitle>
              <DialogDescription>
                Update the status for invoice {selectedInvoice?.invoice_number}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-status">Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger id="new-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newStatus === 'paid' && (
                <div>
                  <Label htmlFor="payment-method">Payment Method</Label>
                  <Input
                    id="payment-method"
                    placeholder="e.g., Bank Transfer, Check..."
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={updateInvoiceStatus}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Update Status
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Send Reminder Dialog */}
        <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Payment Reminder</DialogTitle>
              <DialogDescription>
                Send a payment reminder email to {reminderInvoice?.clinics.name} ({reminderInvoice?.clinics.contact_email})
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Reminder Type</Label>
                <RadioGroup value={reminderType} onValueChange={(value) => setReminderType(value as 'pre_due' | 'overdue')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pre_due" id="pre_due" />
                    <Label htmlFor="pre_due" className="font-normal cursor-pointer">
                      Pre-Due Reminder - Friendly reminder before due date
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="overdue" id="overdue" />
                    <Label htmlFor="overdue" className="font-normal cursor-pointer">
                      Overdue Notice - Urgent payment request for overdue invoice
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="bg-muted p-3 rounded-md text-sm">
                <div><strong>Invoice:</strong> {reminderInvoice?.invoice_number}</div>
                <div><strong>Amount:</strong> £{reminderInvoice?.amount.toFixed(2)}</div>
                <div><strong>Due Date:</strong> {reminderInvoice && new Date(reminderInvoice.due_date).toLocaleDateString('en-GB')}</div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReminderDialogOpen(false)} disabled={sendingReminder}>
                Cancel
              </Button>
              <Button onClick={sendReminderEmail} disabled={sendingReminder}>
                {sendingReminder ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Bell className="mr-2 h-4 w-4" />
                    Send Reminder
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
