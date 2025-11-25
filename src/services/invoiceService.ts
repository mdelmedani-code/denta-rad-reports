import { supabase } from '@/integrations/supabase/client';

export const invoiceService = {
  async fetchUnbilledReports(startDate?: string, endDate?: string) {
    const { data, error } = await supabase.rpc('get_unbilled_reports', {
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (error) throw error;
    return data || [];
  },

  async fetchInvoices(statusFilter?: string) {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        clinics:clinic_id (
          name,
          contact_email
        )
      `)
      .order('created_at', { ascending: false });

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async updateInvoiceStatus(invoiceId: string, status: string) {
    const updates: any = { status, status_updated_at: new Date().toISOString() };

    if (status === 'sent') {
      updates.sent_at = new Date().toISOString();
    } else if (status === 'paid') {
      updates.paid_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', invoiceId);

    if (error) throw error;
  },

  async sendInvoiceEmail(invoiceId: string) {
    const { error } = await supabase.functions.invoke('send-invoice-email', {
      body: { invoiceId },
    });

    if (error) throw error;
  },

  async deleteInvoice(invoiceId: string, pdfStoragePath?: string) {
    // Delete PDF from storage if exists
    if (pdfStoragePath) {
      const { error: storageError } = await supabase.storage
        .from('invoices')
        .remove([pdfStoragePath]);

      if (storageError) {
        console.error('Error deleting PDF:', storageError);
      }
    }

    // Delete invoice record
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId);

    if (error) throw error;
  },

  generateInvoiceNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `INV-${year}${month}${day}-${random}`;
  },
};
