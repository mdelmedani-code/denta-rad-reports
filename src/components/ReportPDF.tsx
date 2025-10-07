import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

interface ReportPDFProps {
  data: {
    patient_name: string;
    patient_dob?: string;
    case_id: string;
    clinical_question: string;
    findings: string;
    impression: string;
    recommendations?: string;
    field_of_view: string;
    created_at: string;
  };
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica'
  },
  header: {
    marginBottom: 20,
    borderBottom: '2 solid #333',
    paddingBottom: 10
  },
  title: {
    fontSize: 24,
    marginBottom: 5,
    fontWeight: 'bold'
  },
  subtitle: {
    fontSize: 10,
    color: '#666'
  },
  section: {
    marginBottom: 15
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a56db'
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 3
  },
  content: {
    fontSize: 11,
    lineHeight: 1.5,
    marginBottom: 5
  },
  footer: {
    marginTop: 30,
    paddingTop: 10,
    borderTop: '1 solid #ddd',
    fontSize: 9,
    color: '#666',
    textAlign: 'center'
  }
});

export function ReportPDF({ data }: ReportPDFProps) {
  const calculateAge = (dob: string | undefined) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>CBCT Diagnostic Report</Text>
          <Text style={styles.subtitle}>Report ID: {data.case_id}</Text>
          <Text style={styles.subtitle}>
            Generated: {new Date().toLocaleDateString('en-GB')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.content}>{data.patient_name}</Text>
          <Text style={styles.label}>Age:</Text>
          <Text style={styles.content}>{calculateAge(data.patient_dob)} years</Text>
          <Text style={styles.label}>Field of View:</Text>
          <Text style={styles.content}>{data.field_of_view.replace(/_/g, ' ')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clinical Question</Text>
          <Text style={styles.content}>{data.clinical_question}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Findings</Text>
          <Text style={styles.content}>{data.findings}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Impression</Text>
          <Text style={styles.content}>{data.impression}</Text>
        </View>

        {data.recommendations && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommendations</Text>
            <Text style={styles.content}>{data.recommendations}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text>This report was generated electronically and is valid without signature</Text>
          <Text>CBCT Radiology Platform</Text>
        </View>
      </Page>
    </Document>
  );
}
