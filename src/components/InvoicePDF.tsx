import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  logo: {
    width: 120,
    height: 40,
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  invoiceNumber: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 5,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1e293b',
  },
  addressBlock: {
    lineHeight: 1.5,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 8,
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: 8,
    fontSize: 9,
  },
  col1: { width: '35%' },
  col2: { width: '20%' },
  col3: { width: '15%' },
  col4: { width: '15%' },
  col5: { width: '15%', textAlign: 'right' },
  totalsSection: {
    marginTop: 20,
    marginLeft: 'auto',
    width: '40%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 5,
  },
  totalLabel: {
    fontSize: 10,
  },
  totalValue: {
    fontSize: 10,
    textAlign: 'right',
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    backgroundColor: '#f1f5f9',
    marginTop: 5,
    fontWeight: 'bold',
    fontSize: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#64748b',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  paymentTerms: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    fontSize: 9,
    lineHeight: 1.5,
  },
  termsTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
});

interface InvoiceData {
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  clinic_name: string;
  clinic_address: string;
  clinic_email: string;
  period_start: string;
  period_end: string;
  settings?: {
    patient_identifier: string;
    show_patient_name: boolean;
    show_field_of_view: boolean;
    show_case_ref: boolean;
    show_report_date: boolean;
  };
  line_items: Array<{
    description: string;
    case_ref: string;
    date: string;
    field_of_view: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  subtotal: number;
  vat: number;
  total: number;
}

export function InvoicePDF({ invoice }: { invoice: InvoiceData }) {
  const settings = invoice.settings || {
    show_field_of_view: true,
    show_case_ref: false,
    show_report_date: true
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with Logo and Invoice Title */}
        <View style={styles.header}>
          <Image src="/dentarad-logo-pdf.jpg" style={styles.logo} />
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>#{invoice.invoice_number}</Text>
          </View>
        </View>

        {/* From/To Section */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>From:</Text>
            <View style={styles.addressBlock}>
              <Text>DentaRad Limited</Text>
              <Text>Radiology Services</Text>
              <Text>United Kingdom</Text>
              <Text>info@dentarad.com</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bill To:</Text>
            <View style={styles.addressBlock}>
              <Text>{invoice.clinic_name}</Text>
              {invoice.clinic_address && <Text>{invoice.clinic_address}</Text>}
              <Text>{invoice.clinic_email}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invoice Details:</Text>
            <View style={styles.addressBlock}>
              <Text>Date: {invoice.invoice_date}</Text>
              <Text>Due Date: {invoice.due_date}</Text>
              <Text>Period: {invoice.period_start} - {invoice.period_end}</Text>
            </View>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Description</Text>
            {settings.show_case_ref && <Text style={styles.col2}>Case Reference</Text>}
            {settings.show_report_date && <Text style={styles.col3}>Date</Text>}
            {settings.show_field_of_view && <Text style={styles.col4}>FOV</Text>}
            <Text style={styles.col5}>Amount</Text>
          </View>

          {invoice.line_items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.col1}>{item.description}</Text>
              {settings.show_case_ref && <Text style={styles.col2}>{item.case_ref}</Text>}
              {settings.show_report_date && <Text style={styles.col3}>{item.date}</Text>}
              {settings.show_field_of_view && <Text style={styles.col4}>{item.field_of_view}</Text>}
              <Text style={styles.col5}>£{item.total.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Totals Section */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>£{invoice.subtotal.toFixed(2)}</Text>
          </View>
          {invoice.vat > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>VAT (20%):</Text>
              <Text style={styles.totalValue}>£{invoice.vat.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.grandTotal}>
            <Text>Total Amount Due:</Text>
            <Text>£{invoice.total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment Terms */}
        <View style={styles.paymentTerms}>
          <Text style={styles.termsTitle}>Payment Terms:</Text>
          <Text>• Payment is due within 30 days of invoice date</Text>
          <Text>• Please include invoice number #{invoice.invoice_number} with payment</Text>
          <Text>• Bank transfer details available upon request</Text>
          <Text>• Contact info@dentarad.com for any billing queries</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>DentaRad Limited | Professional CBCT Reporting Services</Text>
          <Text>Thank you for your business</Text>
        </View>
      </Page>
    </Document>
  );
}
