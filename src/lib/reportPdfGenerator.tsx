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
      footer_logo: { show_logo: false, width: 80, height: 25 },
      logo_urls: { header_logo_url: null, footer_logo_url: null }
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
      footer_logo: { show_logo: false, width: 80, height: 25 },
      logo_urls: { header_logo_url: null, footer_logo_url: null }
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
    id?: string;
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
    id?: string;
    clinical_history?: string;
    report_content?: string; // New single content field
    technique?: string; // Legacy field for backward compatibility
    findings?: string; // Legacy field for backward compatibility
    impression?: string; // Legacy field for backward compatibility
    signatory_name?: string;
    signatory_title?: string;
    signatory_credentials?: string;
    signature_statement?: string;
    signed_at?: string;
    is_signed?: boolean;
    version?: number;
  };
  images?: ReportImage[];
}

export const generateReportPDF = async (data: ReportData, templateId?: string) => {
  const { caseData, reportData, images = [] } = data;

  // Load template if provided
  let template = null;
  if (templateId) {
    const { data: templateData } = await supabase
      .from('pdf_templates')
      .select('*')
      .eq('id', templateId)
      .single();
    
    template = templateData;
  }

  // Load PDF settings from database (legacy)
  const settings = await loadPDFSettings();

  // Use template config or fallback to settings
  const headerConfig = template?.header_config || settings.header_logo || {
    logo_url: settings.logo_urls?.header_logo_url,
    logo_height: settings.logo_dimensions?.height || 175,
    background_color: '#ffffff',
    height: 80
  };

  const footerConfig = template?.footer_config || settings.footer_logo || {
    text: settings.branding?.footer_text || 'DentaRad - Professional CBCT Reporting',
    background_color: '#f8f9fa',
    show_page_numbers: true
  };

  const colorScheme = template?.color_scheme || {
    primary: settings.header_colors?.border_color || '#5fa8a6',
    secondary: '#64748b',
    background: '#ffffff',
    text: '#0f172a',
    heading: settings.header_colors?.label_color || '#5fa8a6'
  };

  const typography = template?.typography_config || {
    h1_size: 18,
    h2_size: 13,
    body_size: 10,
    line_height: 1.7
  };

  const layoutConfig = template?.layout_config || {
    margin_top: 40,
    margin_bottom: 40,
    margin_left: 40,
    margin_right: 40
  };

  const styles = createStyles({ 
    ...settings, 
    header_colors: { 
      border_color: colorScheme.primary, 
      label_color: colorScheme.heading 
    }
  });

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
          {(headerConfig.logo_url || (!settings.header_logo || settings.header_logo.show_logo)) && (
            <Image 
              src={headerConfig.logo_url || settings.logo_urls?.header_logo_url || dentaradLogo} 
              style={styles.logo} 
            />
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

        {/* Signature and Audit Trail Section */}
        {reportData.is_signed && reportData.signatory_name && reportData.signed_at && (
          <View style={styles.signatureSection}>
            <Text style={styles.endOfReport}>***End of Report***</Text>
            
            {/* Signature Block */}
            <View style={{ marginTop: 20, padding: 15, backgroundColor: '#f8f9fa', borderRadius: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 10, color: '#1a1a1a' }}>
                Electronic Signature
              </Text>
              
              <Text style={[styles.doctorInfo, styles.doctorName, { marginBottom: 3 }]}>
                {reportData.signatory_name}
              </Text>
              
              {reportData.signatory_title && (
                <Text style={[styles.doctorInfo, { marginBottom: 2, fontStyle: 'italic' }]}>
                  {reportData.signatory_title}
                </Text>
              )}
              
              {reportData.signatory_credentials && (
                <Text style={[styles.doctorInfo, { marginBottom: 8 }]}>
                  {reportData.signatory_credentials}
                </Text>
              )}
              
              <View style={{ borderTop: '1pt solid #dee2e6', paddingTop: 8, marginTop: 8 }}>
                <Text style={[styles.reportDate, { marginBottom: 3 }]}>
                  Signed: {new Date(reportData.signed_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })} at {new Date(reportData.signed_at).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                
                {reportData.signature_statement && (
                  <Text style={{ fontSize: 8, color: '#6c757d', marginTop: 5, fontStyle: 'italic' }}>
                    {reportData.signature_statement}
                  </Text>
                )}
              </View>
            </View>
            
            {/* Audit Trail */}
            <View style={{ marginTop: 15, padding: 12, backgroundColor: '#ffffff', border: '1pt solid #dee2e6', borderRadius: 4 }}>
              <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 8, color: '#495057' }}>
                Audit Trail
              </Text>
              <View style={{ fontSize: 8, color: '#6c757d' }}>
                <Text style={{ marginBottom: 2 }}>
                  Report ID: {reportData.id}
                </Text>
                <Text style={{ marginBottom: 2 }}>
                  Case ID: {caseData.id}
                </Text>
                <Text style={{ marginBottom: 2 }}>
                  Generated: {new Date().toLocaleDateString('en-GB')} at {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {reportData.version && reportData.version > 1 && (
                  <Text style={{ marginBottom: 2 }}>
                    Report Version: {reportData.version}
                  </Text>
                )}
              </View>
            </View>
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
        <View style={styles.footer} fixed>
          {settings.footer_logo.show_logo && (
            <Image 
              src={settings.logo_urls?.footer_logo_url || dentaradLogo} 
              style={{
                width: settings.footer_logo.width,
                height: settings.footer_logo.height,
                objectFit: 'contain',
                marginBottom: 5,
                alignSelf: 'center',
              }} 
            />
          )}
          <Text>{footerConfig.text || settings.branding.footer_text}</Text>
          {footerConfig.show_page_numbers && (
            <Text render={({ pageNumber, totalPages }) => 
              `Page ${pageNumber} of ${totalPages}`
            } />
          )}
        </View>
      </Page>
    </Document>
  );

  // Generate PDF blob
  const blob = await pdf(<ReportDocument />).toBlob();
  return blob;
};
