import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2pt solid #333',
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    backgroundColor: '#f0f0f0',
    padding: 5,
  },
  content: {
    fontSize: 11,
    lineHeight: 1.5,
  },
  patientInfo: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
  },
  patientRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    fontWeight: 'bold',
    width: 120,
  },
  value: {
    flex: 1,
  },
  signature: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#e8f5e9',
    borderRadius: 4,
    borderLeft: '4pt solid #4caf50',
  },
  signatureTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2e7d32',
  },
  signatureText: {
    fontSize: 10,
    marginBottom: 3,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: '1pt solid #ccc',
    paddingTop: 10,
    fontSize: 9,
    color: '#666',
  },
});

interface ReportData {
  caseData: {
    patient_name: string;
    patient_dob: string;
    patient_id: string;
    folder_name: string;
    clinical_question: string;
    field_of_view: string;
    upload_date: string;
    clinic: {
      name: string;
    };
  };
  reportData: {
    clinical_history: string;
    technique: string;
    findings: string;
    impression: string;
    recommendations: string;
    signatory_name?: string;
    signatory_credentials?: string;
    signed_at?: string;
    version?: number;
  };
}

export const generateReportPDF = async (data: ReportData) => {
  const { caseData, reportData } = data;

  const ReportDocument = () => (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>CBCT Radiology Report</Text>
          <Text style={styles.subtitle}>
            Generated: {new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {/* Patient Information */}
        <View style={styles.patientInfo}>
          <View style={styles.patientRow}>
            <Text style={styles.label}>Patient Name:</Text>
            <Text style={styles.value}>{caseData.patient_name}</Text>
          </View>
          <View style={styles.patientRow}>
            <Text style={styles.label}>Patient ID:</Text>
            <Text style={styles.value}>{caseData.patient_id}</Text>
          </View>
          <View style={styles.patientRow}>
            <Text style={styles.label}>Date of Birth:</Text>
            <Text style={styles.value}>
              {new Date(caseData.patient_dob).toLocaleDateString('en-GB')}
            </Text>
          </View>
          <View style={styles.patientRow}>
            <Text style={styles.label}>Scan Date:</Text>
            <Text style={styles.value}>
              {new Date(caseData.upload_date).toLocaleDateString('en-GB')}
            </Text>
          </View>
          <View style={styles.patientRow}>
            <Text style={styles.label}>Referring Practice:</Text>
            <Text style={styles.value}>{caseData.clinic.name}</Text>
          </View>
          <View style={styles.patientRow}>
            <Text style={styles.label}>Field of View:</Text>
            <Text style={styles.value}>{caseData.field_of_view.replace(/_/g, ' ')}</Text>
          </View>
        </View>

        {/* Clinical History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CLINICAL HISTORY</Text>
          <Text style={styles.content}>{reportData.clinical_history || 'Not provided'}</Text>
        </View>

        {/* Technique */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TECHNIQUE</Text>
          <Text style={styles.content}>{reportData.technique || 'Not provided'}</Text>
        </View>

        {/* Findings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FINDINGS</Text>
          <Text style={styles.content}>{reportData.findings || 'Not provided'}</Text>
        </View>

        {/* Impression */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>IMPRESSION</Text>
          <Text style={styles.content}>{reportData.impression || 'Not provided'}</Text>
        </View>

        {/* Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RECOMMENDATIONS</Text>
          <Text style={styles.content}>{reportData.recommendations || 'Not provided'}</Text>
        </View>

        {/* Electronic Signature */}
        {reportData.signatory_name && reportData.signed_at && (
          <View style={styles.signature}>
            <Text style={styles.signatureTitle}>✓ ELECTRONICALLY SIGNED</Text>
            <Text style={styles.signatureText}>Signed by: {reportData.signatory_name}</Text>
            {reportData.signatory_credentials && (
              <Text style={styles.signatureText}>
                Credentials: {reportData.signatory_credentials}
              </Text>
            )}
            <Text style={styles.signatureText}>
              Date & Time:{' '}
              {new Date(reportData.signed_at).toLocaleString('en-GB', {
                dateStyle: 'long',
                timeStyle: 'long',
              })}
            </Text>
            {reportData.version && reportData.version > 1 && (
              <Text style={styles.signatureText}>Version: {reportData.version}</Text>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Report ID: {caseData.folder_name}</Text>
          <Text>
            This report was generated electronically and is valid without a handwritten signature.
          </Text>
        </View>
      </Page>
    </Document>
  );

  // Generate PDF blob
  const blob = await pdf(<ReportDocument />).toBlob();
  return blob;
};
