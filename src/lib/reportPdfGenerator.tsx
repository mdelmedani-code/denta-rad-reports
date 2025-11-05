import { pdf, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import dentaradLogo from '@/assets/dentarad-logo-pdf.jpg';
import { supabase } from '@/integrations/supabase/client';

// Load PDF template settings from database
const loadPDFSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('pdf_template_settings')
      .select('setting_key, setting_value');

    if (error) throw error;

    const settings: any = {
      logo_dimensions: { width: 1100, height: 175 },
      header_logo: { show_logo: true, width: 1100, height: 175 },
      contact_info: { email: "Admin@dentarad.com", address: "Your workplace address" },
      header_colors: { border_color: "#5fa8a6", label_color: "#5fa8a6" },
      branding: { company_name: "DentaRad", footer_text: "DentaRad - Professional CBCT Reporting" },
      footer_logo: { show_logo: false, width: 80, height: 25 }
    };

    if (data) {
      data.forEach((item) => {
        settings[item.setting_key] = item.setting_value;
      });
    }

    return settings;
  } catch (error) {
    console.error('Error loading PDF settings:', error);
    // Return defaults if loading fails
    return {
      logo_dimensions: { width: 1100, height: 175 },
      header_logo: { show_logo: true, width: 1100, height: 175 },
      contact_info: { email: "Admin@dentarad.com", address: "Your workplace address" },
      header_colors: { border_color: "#5fa8a6", label_color: "#5fa8a6" },
      branding: { company_name: "DentaRad", footer_text: "DentaRad - Professional CBCT Reporting" },
      footer_logo: { show_logo: false, width: 80, height: 25 }
    };
  }
};

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

// PDF Styles - now created dynamically with settings
const createStyles = (settings: any) => StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  // Header with branding
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    paddingBottom: 20,
    borderBottom: `2pt solid ${settings.header_colors.border_color}`,
  },
  logo: {
    width: settings.header_logo?.width || settings.logo_dimensions.width,
    height: settings.header_logo?.height || settings.logo_dimensions.height,
    objectFit: 'contain',
  },
  contactInfo: {
    fontSize: 9,
    color: '#666',
    textAlign: 'right',
    marginBottom: 3,
  },
  // Patient info section
  infoSection: {
    marginBottom: 20,
  },
  infoSectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  infoGrid: {
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottom: '0.5pt solid #e5e5e5',
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    width: 140,
    color: settings.header_colors.label_color,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 10,
    flex: 1,
    color: '#1a1a1a',
  },
  // Main title
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#1a1a1a',
    textTransform: 'uppercase',
  },
  divider: {
    height: 2,
    backgroundColor: settings.header_colors.border_color,
    marginVertical: 15,
  },
  // Section styles
  section: {
    marginTop: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1a1a1a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    fontSize: 10,
    lineHeight: 1.7,
    color: '#1a1a1a',
    textAlign: 'justify',
  },
  // Signature section
  signatureSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTop: `2pt solid ${settings.header_colors.border_color}`,
    backgroundColor: '#f9fafb',
    padding: 20,
    borderRadius: 4,
  },
  endOfReport: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#1a1a1a',
  },
  doctorInfo: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 3,
    color: '#1a1a1a',
  },
  doctorName: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  reportDate: {
    fontSize: 9,
    textAlign: 'center',
    color: '#666',
    marginTop: 12,
  },
  // Image styles
  imageSection: {
    marginTop: 20,
  },
  imageSectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1a1a1a',
    textTransform: 'uppercase',
  },
  reportImage: {
    maxWidth: '100%',
    maxHeight: 280,
    objectFit: 'contain',
    marginVertical: 10,
    border: '1pt solid #e5e5e5',
  },
  imageCaption: {
    fontSize: 9,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#666',
    marginTop: 5,
    marginBottom: 15,
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
    borderTop: '0.5pt solid #e5e5e5',
    paddingTop: 10,
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
    patient_internal_id?: string;
    folder_name: string;
    clinical_question: string;
    field_of_view: string;
    upload_date: string;
    urgency?: string;
    created_at?: string;
    clinic: {
      name: string;
    };
  };
  reportData: {
    clinical_history?: string;
    technique?: string;
    findings?: string;
    impression?: string;
    signatory_name?: string;
    signatory_credentials?: string;
    signed_at?: string;
    is_signed?: boolean;
    version?: number;
  };
  images?: ReportImage[];
}

export const generateReportPDF = async (data: ReportData) => {
  const { caseData, reportData, images = [] } = data;

  // Load PDF settings from database
  const settings = await loadPDFSettings();
  const styles = createStyles(settings);

  // Calculate patient age from DOB
  const calculateAge = (dob: string) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} years`;
  };

  // Format field of view
  const formatFieldOfView = (fov: string) => {
    return fov?.replace(/_/g, ' ').toUpperCase() || 'N/A';
  };

  const ReportDocument = () => (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* DentaRad Header */}
        <View style={styles.brandHeader}>
          {(!settings.header_logo || settings.header_logo.show_logo) && (
            <Image src={dentaradLogo} style={styles.logo} />
          )}
          <View>
            <Text style={styles.contactInfo}>Email: {settings.contact_info.email}</Text>
            <Text style={styles.contactInfo}>{settings.contact_info.address}</Text>
          </View>
        </View>

        {/* Patient Information */}
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>Patient Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Patient Name</Text>
              <Text style={styles.infoValue}>{caseData.patient_name || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Age</Text>
              <Text style={styles.infoValue}>{calculateAge(caseData.patient_dob)}</Text>
            </View>
            {caseData.patient_internal_id && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Internal ID</Text>
                <Text style={styles.infoValue}>{caseData.patient_internal_id}</Text>
              </View>
            )}
            {caseData.patient_dob && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date of Birth</Text>
                <Text style={styles.infoValue}>
                  {new Date(caseData.patient_dob).toLocaleDateString('en-GB')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Case Information */}
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>Case Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Clinical Question</Text>
              <Text style={styles.infoValue}>{caseData.clinical_question || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Field of View</Text>
              <Text style={styles.infoValue}>{formatFieldOfView(caseData.field_of_view)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Urgency Level</Text>
              <Text style={styles.infoValue}>
                {caseData.urgency ? caseData.urgency.charAt(0).toUpperCase() + caseData.urgency.slice(1) : 'N/A'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Upload Date</Text>
              <Text style={styles.infoValue}>
                {caseData.created_at || caseData.upload_date 
                  ? new Date(caseData.created_at || caseData.upload_date).toLocaleDateString('en-GB')
                  : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Report Title */}
        <Text style={styles.reportTitle}>Diagnostic Report</Text>

        {/* Clinical History */}
        {reportData.clinical_history && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Clinical History</Text>
            <Text style={styles.sectionContent}>
              {stripHtmlTags(reportData.clinical_history)}
            </Text>
          </View>
        )}

        {/* Technique */}
        {reportData.technique && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Technique</Text>
            <Text style={styles.sectionContent}>
              {stripHtmlTags(reportData.technique)}
            </Text>
          </View>
        )}

        {/* Findings */}
        {reportData.findings && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Findings</Text>
            <Text style={styles.sectionContent}>
              {stripHtmlTags(reportData.findings)}
            </Text>
            
            {/* Include images attached to findings */}
            {images.filter(img => img.section === 'findings').length > 0 && (
              <View style={{ marginTop: 15 }}>
                {images.filter(img => img.section === 'findings').map((img) => (
                  <View key={img.id} style={{ marginBottom: 10 }}>
                    <Image src={img.image_url} style={styles.reportImage} />
                    {img.caption && (
                      <Text style={styles.imageCaption}>{img.caption}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Impression */}
        {reportData.impression && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Impression</Text>
            <Text style={styles.sectionContent}>
              {stripHtmlTags(reportData.impression)}
            </Text>
          </View>
        )}

        {/* Signature Section */}
        {reportData.is_signed && reportData.signatory_name && reportData.signed_at && (
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

        {/* All Report Images */}
        {images.length > 0 && (
          <View style={styles.imageSection}>
            <Text style={styles.imageSectionTitle}>Report Images ({images.length})</Text>
            {images.map((img) => (
              <View key={img.id} style={{ marginBottom: 15 }}>
                <Image src={img.image_url} style={styles.reportImage} />
                {img.caption && (
                  <Text style={styles.imageCaption}>{img.caption}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          {settings.footer_logo.show_logo && (
            <Image 
              src={dentaradLogo} 
              style={{
                width: settings.footer_logo.width,
                height: settings.footer_logo.height,
                objectFit: 'contain',
                marginBottom: 5,
                alignSelf: 'center',
              }} 
            />
          )}
          <Text>{settings.branding.footer_text}</Text>
        </View>
      </Page>
    </Document>
  );

  // Generate PDF blob
  const blob = await pdf(<ReportDocument />).toBlob();
  return blob;
};
