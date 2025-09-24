import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer';

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    backgroundColor: '#0066cc',
    color: '#FFFFFF',
    padding: 20,
    marginBottom: 20,
    borderRadius: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.9,
  },
  patientInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    marginBottom: 20,
    borderRadius: 5,
    borderLeft: '4pt solid #0066cc',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  infoItem: {
    width: '50%',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0066cc',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 12,
    color: '#333333',
  },
  clinicalQuestion: {
    backgroundColor: '#fff3cd',
    padding: 15,
    marginBottom: 20,
    borderRadius: 5,
    border: '1pt solid #ffeaa7',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0066cc',
    marginBottom: 10,
    borderBottom: '2pt solid #0066cc',
    paddingBottom: 5,
  },
  reportContent: {
    lineHeight: 1.6,
    padding: 15,
    backgroundColor: '#fafafa',
    borderRadius: 5,
    fontSize: 11,
  },
  imagesSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imagePlaceholder: {
    width: '45%',
    height: 120,
    backgroundColor: '#f0f0f0',
    border: '1pt dashed #cccccc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    marginBottom: 10,
  },
  imagePlaceholderText: {
    fontSize: 10,
    color: '#999999',
    textAlign: 'center',
  },
  footer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f8f9fa',
    textAlign: 'center',
    fontSize: 10,
    color: '#666666',
    borderTop: '1pt solid #dddddd',
  },
  urgencyBadge: {
    backgroundColor: '#e8f5e8',
    color: '#2e7d32',
    padding: '2 8',
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 'bold',
  },
  urgentBadge: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
});

interface PDFReportProps {
  reportData: {
    reportId: string;
    caseData: {
      patient_name: string;
      patient_dob?: string;
      patient_internal_id?: string;
      clinical_question: string;
      field_of_view: string;
      urgency: string;
      upload_date: string;
      clinic_name?: string;
      clinic_contact_email?: string;
    };
    reportText: string;
  };
  template: {
    company_name: string;
    header_text: string;
    footer_text: string;
    primary_color: string;
    secondary_color: string;
  };
}

// PDF Document Component
const PDFReport: React.FC<PDFReportProps> = ({ reportData, template }) => {
  const currentDate = new Date().toLocaleDateString();
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: template.primary_color }]}>
          <Text style={styles.headerTitle}>{template.company_name}</Text>
          <Text style={styles.headerSubtitle}>{template.header_text}</Text>
        </View>

        {/* Patient Information */}
        <View style={[styles.patientInfo, { backgroundColor: template.secondary_color }]}>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Patient Name</Text>
              <Text style={styles.infoValue}>{reportData.caseData.patient_name}</Text>
            </View>
            
            {reportData.caseData.patient_dob && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Date of Birth</Text>
                <Text style={styles.infoValue}>
                  {new Date(reportData.caseData.patient_dob).toLocaleDateString()}
                </Text>
              </View>
            )}
            
            {reportData.caseData.patient_internal_id && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Patient ID</Text>
                <Text style={styles.infoValue}>{reportData.caseData.patient_internal_id}</Text>
              </View>
            )}
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Field of View</Text>
              <Text style={styles.infoValue}>
                {reportData.caseData.field_of_view.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Urgency</Text>
              <Text style={[
                styles.urgencyBadge,
                reportData.caseData.urgency === 'urgent' ? styles.urgentBadge : {}
              ]}>
                {reportData.caseData.urgency.toUpperCase()}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Report Date</Text>
              <Text style={styles.infoValue}>
                {new Date(reportData.caseData.upload_date).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </Text>
            </View>
          </View>

          {reportData.caseData.clinic_name && (
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Referring Clinic</Text>
                <Text style={styles.infoValue}>{reportData.caseData.clinic_name}</Text>
              </View>
              {reportData.caseData.clinic_contact_email && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Contact Email</Text>
                  <Text style={styles.infoValue}>{reportData.caseData.clinic_contact_email}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Clinical Question */}
        <View style={styles.clinicalQuestion}>
          <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Clinical Question:</Text>
          <Text>{reportData.caseData.clinical_question}</Text>
        </View>

        {/* Diagnostic Findings */}
        <View>
          <Text style={[styles.sectionTitle, { color: template.primary_color }]}>
            Diagnostic Findings
          </Text>
          <View style={styles.reportContent}>
            <Text>{reportData.reportText}</Text>
          </View>
        </View>

        {/* Clinical Images Section */}
        <View style={styles.imagesSection}>
          <Text style={[styles.sectionTitle, { color: template.primary_color }]}>
            Clinical Images
          </Text>
          <View style={styles.imagesGrid}>
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>Image 1{'\n'}[To be added]</Text>
            </View>
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>Image 2{'\n'}[To be added]</Text>
            </View>
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>Image 3{'\n'}[To be added]</Text>
            </View>
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>Image 4{'\n'}[To be added]</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: template.secondary_color }]}>
          <Text style={{ fontWeight: 'bold', color: template.primary_color, marginBottom: 5 }}>
            {template.company_name}
          </Text>
          <Text>{template.footer_text}</Text>
          <Text style={{ marginTop: 10 }}>
            Report ID: {reportData.reportId} | Generated: {currentDate}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

// Component that provides the download link
interface PDFDownloadButtonProps {
  reportData: PDFReportProps['reportData'];
  template: PDFReportProps['template'];
  fileName?: string;
  children: React.ReactNode;
}

export const PDFDownloadButton: React.FC<PDFDownloadButtonProps> = ({
  reportData,
  template,
  fileName = `report-${reportData.reportId}.pdf`,
  children
}) => {
  return (
    <PDFDownloadLink
      document={<PDFReport reportData={reportData} template={template} />}
      fileName={fileName}
    >
      {({ blob, url, loading, error }) => {
        if (loading) return <div>Generating PDF...</div>;
        if (error) return <div>Error generating PDF: {error.message}</div>;
        return children;
      }}
    </PDFDownloadLink>
  );
};

export default PDFReport;