import { pdf, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import dentaradLogo from '@/assets/dentarad-logo.png';

// Helper function to strip HTML tags and convert to plain text
const stripHtmlTags = (html: string | null | undefined): string => {
  if (!html) return '';
  
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, '');
  
  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Clean up extra whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
};

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  // Header with branding
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottom: '2pt solid #333',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 40,
    objectFit: 'contain',
  },
  brandName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066cc',
    marginLeft: 10,
  },
  contactInfo: {
    fontSize: 9,
    color: '#666',
    textAlign: 'right',
  },
  // Title section
  mainTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 20,
    color: '#333',
  },
  // Patient info grid
  infoGrid: {
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    width: 150,
    color: '#333',
  },
  infoValue: {
    fontSize: 10,
    flex: 1,
    color: '#000',
  },
  // Section styles
  section: {
    marginTop: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
    textTransform: 'uppercase',
  },
  sectionContent: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#000',
  },
  // Signature section
  signatureSection: {
    marginTop: 25,
    paddingTop: 15,
    borderTop: '1pt solid #ccc',
  },
  // Image styles
  reportImage: {
    maxWidth: '100%',
    maxHeight: 300,
    objectFit: 'contain',
    marginVertical: 10,
  },
  imageCaption: {
    fontSize: 9,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#666',
    marginBottom: 10,
  },
  endOfReport: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  doctorInfo: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 3,
  },
  doctorName: {
    fontWeight: 'bold',
  },
  reportDate: {
    fontSize: 9,
    textAlign: 'center',
    color: '#666',
    marginTop: 10,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#999',
  },
});

interface ReportImage {
  id: string;
  image_url: string;
  caption?: string;
  section?: string;
  position?: number;
}

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
    signatory_name?: string;
    signatory_credentials?: string;
    signed_at?: string;
    version?: number;
  };
  images?: ReportImage[];
}

export const generateReportPDF = async (data: ReportData) => {
  const { caseData, reportData, images = [] } = data;

  const ReportDocument = () => (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* DentaRad Header */}
        <View style={styles.brandHeader}>
          <View style={styles.logoContainer}>
            <Image src={dentaradLogo} style={styles.logo} />
          </View>
          <View>
            <Text style={styles.contactInfo}>Email: Admin@dentarad.com</Text>
            <Text style={styles.contactInfo}>Your workplace address</Text>
          </View>
        </View>

        {/* Patient Information Grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Patient:</Text>
            <Text style={styles.infoValue}>{caseData.patient_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Referring Physician:</Text>
            <Text style={styles.infoValue}>{caseData.clinic.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Study:</Text>
            <Text style={styles.infoValue}>CBCT Scan - {caseData.field_of_view.replace(/_/g, ' ')}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Study date:</Text>
            <Text style={styles.infoValue}>
              {new Date(caseData.upload_date).toLocaleDateString('en-GB')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Accession Number:</Text>
            <Text style={styles.infoValue}>{caseData.patient_id}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Completion flag:</Text>
            <Text style={styles.infoValue}>Complete</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Verification flag:</Text>
            <Text style={styles.infoValue}>
              {reportData.signed_at ? 'Verified' : 'Pending'}
            </Text>
          </View>
        </View>

        {/* Main Title */}
        <Text style={styles.mainTitle}>Diagnostic Report</Text>

        {/* Clinical History */}
        {reportData.clinical_history && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CLINICAL HISTORY</Text>
            <Text style={styles.sectionContent}>
              {stripHtmlTags(reportData.clinical_history)}
            </Text>
          </View>
        )}

        {/* Technique */}
        {reportData.technique && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TECHNIQUE</Text>
            <Text style={styles.sectionContent}>
              {stripHtmlTags(reportData.technique)}
            </Text>
          </View>
        )}

        {/* Findings */}
        {reportData.findings && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FINDINGS</Text>
            <Text style={styles.sectionContent}>
              {stripHtmlTags(reportData.findings)}
            </Text>
            
            {/* Include images attached to findings */}
            {images.filter(img => img.section === 'findings').map((img) => (
              <View key={img.id} style={{ marginTop: 10 }}>
                <Image src={img.image_url} style={styles.reportImage} />
                {img.caption && (
                  <Text style={styles.imageCaption}>{img.caption}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Impression */}
        {reportData.impression && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>IMPRESSION</Text>
            <Text style={styles.sectionContent}>
              {stripHtmlTags(reportData.impression)}
            </Text>
          </View>
        )}

        {/* All Report Images Gallery */}
        {images.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>REPORT IMAGES ({images.length})</Text>
            {images.map((img) => (
              <View key={img.id} style={{ marginTop: 10 }}>
                <Image src={img.image_url} style={styles.reportImage} />
                {img.caption && (
                  <Text style={styles.imageCaption}>{img.caption}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Signature Section */}
        {reportData.signatory_name && reportData.signed_at && (
          <View style={styles.signatureSection}>
            <Text style={styles.endOfReport}>***End of Report***</Text>
            <Text style={[styles.doctorInfo, styles.doctorName]}>
              {reportData.signatory_name}
            </Text>
            {reportData.signatory_credentials && (
              <Text style={styles.doctorInfo}>
                ({reportData.signatory_credentials})
              </Text>
            )}
            <Text style={styles.reportDate}>
              Report Date: {new Date(reportData.signed_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })} - {new Date(reportData.signed_at).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>1 - 1</Text>
        </View>
      </Page>
    </Document>
  );

  // Generate PDF blob
  const blob = await pdf(<ReportDocument />).toBlob();
  return blob;
};
