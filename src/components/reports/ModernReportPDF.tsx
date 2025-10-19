import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { TemplateData, ClinicBranding } from "@/hooks/usePDFTemplate";

interface ReportData {
  patientName: string;
  patientDob: string;
  patientId: string;
  clinicName: string;
  reportDate: string;
  clinicalQuestion: string;
  findings: string;
  impression: string;
  recommendations: string[];
  images?: Array<{ url: string; caption: string }>;
  reporterName: string;
  caseId: string;
}

interface ModernReportPDFProps {
  reportData: ReportData;
  template: TemplateData;
  branding?: ClinicBranding | null;
}

export const ModernReportPDF = ({ reportData, template, branding }: ModernReportPDFProps) => {
  const primaryColor = branding?.primary_color || "#1e40af";
  const secondaryColor = branding?.secondary_color || "#3b82f6";
  const accentColor = branding?.accent_color || "#60a5fa";

  const styles = StyleSheet.create({
    page: {
      backgroundColor: "#ffffff",
      paddingTop: template.margins.top,
      paddingBottom: template.margins.bottom,
      paddingLeft: template.margins.left,
      paddingRight: template.margins.right,
      fontFamily: "Helvetica",
      fontSize: template.typography.bodySize,
      lineHeight: 1.6,
      color: "#0f172a",
    },
    header: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: template.headerHeight,
      backgroundColor: primaryColor,
      padding: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerText: {
      color: "#ffffff",
      fontSize: template.typography.headingSize,
      fontWeight: "bold",
    },
    headerDate: {
      color: "#ffffff",
      fontSize: template.typography.bodySize,
    },
    logo: {
      width: 60,
      height: 60,
      objectFit: "contain",
    },
    footer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: template.footerHeight,
      backgroundColor: "#f8fafc",
      borderTop: `2px solid ${secondaryColor}`,
      padding: 15,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: template.typography.captionSize,
      color: "#64748b",
    },
    patientInfoBox: {
      backgroundColor: "#f1f5f9",
      borderLeft: `3px solid ${primaryColor}`,
      padding: 15,
      marginBottom: 20,
    },
    patientInfoRow: {
      flexDirection: "row",
      marginBottom: 5,
    },
    patientInfoLabel: {
      fontWeight: "bold",
      width: 120,
    },
    clinicalQuestionBox: {
      backgroundColor: "#fef3c7",
      borderLeft: `3px solid ${accentColor}`,
      padding: 15,
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: template.typography.subheadingSize,
      fontWeight: "bold",
      color: primaryColor,
      marginTop: 15,
      marginBottom: 10,
      borderBottom: `1px solid ${primaryColor}`,
      paddingBottom: 5,
    },
    bodyText: {
      textAlign: "justify",
      marginBottom: 10,
    },
    imageContainer: {
      marginVertical: 15,
      alignItems: "center",
    },
    image: {
      maxHeight: 300,
      border: `2px solid ${accentColor}`,
    },
    imageCaption: {
      fontSize: template.typography.captionSize,
      fontStyle: "italic",
      marginTop: 5,
      color: "#64748b",
    },
    impressionBox: {
      backgroundColor: "#dbeafe",
      borderLeft: `3px solid ${secondaryColor}`,
      padding: 15,
      marginVertical: 15,
    },
    recommendationsList: {
      marginLeft: 20,
    },
    recommendationItem: {
      flexDirection: "row",
      marginBottom: 8,
    },
    recommendationNumber: {
      color: primaryColor,
      fontWeight: "bold",
      marginRight: 10,
    },
    signoff: {
      marginTop: 30,
      paddingTop: 15,
      borderTop: `1px solid #cbd5e1`,
    },
    signoffText: {
      fontSize: template.typography.bodySize,
      marginBottom: 5,
    },
  });

  const enabledSections = template.sections
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case "patient-info":
        return (
          <View style={styles.patientInfoBox} key="patient-info">
            <View style={styles.patientInfoRow}>
              <Text style={styles.patientInfoLabel}>Patient Name:</Text>
              <Text>{reportData.patientName}</Text>
            </View>
            <View style={styles.patientInfoRow}>
              <Text style={styles.patientInfoLabel}>Date of Birth:</Text>
              <Text>{reportData.patientDob}</Text>
            </View>
            <View style={styles.patientInfoRow}>
              <Text style={styles.patientInfoLabel}>Patient ID:</Text>
              <Text>{reportData.patientId}</Text>
            </View>
            <View style={styles.patientInfoRow}>
              <Text style={styles.patientInfoLabel}>Clinic:</Text>
              <Text>{reportData.clinicName}</Text>
            </View>
            <View style={styles.patientInfoRow}>
              <Text style={styles.patientInfoLabel}>Report Date:</Text>
              <Text>{reportData.reportDate}</Text>
            </View>
          </View>
        );

      case "clinical-question":
        return (
          <View key="clinical-question">
            <Text style={styles.sectionTitle}>Clinical Question</Text>
            <View style={styles.clinicalQuestionBox}>
              <Text>{reportData.clinicalQuestion}</Text>
            </View>
          </View>
        );

      case "findings":
        return (
          <View key="findings">
            <Text style={styles.sectionTitle}>Findings</Text>
            <Text style={styles.bodyText}>{reportData.findings}</Text>
          </View>
        );

      case "images":
        return reportData.images && reportData.images.length > 0 ? (
          <View key="images">
            <Text style={styles.sectionTitle}>Reference Images</Text>
            {reportData.images.map((img, idx) => (
              <View style={styles.imageContainer} key={idx}>
                <Image src={img.url} style={styles.image} />
                <Text style={styles.imageCaption}>
                  Figure {idx + 1}: {img.caption}
                </Text>
              </View>
            ))}
          </View>
        ) : null;

      case "impression":
        return (
          <View key="impression">
            <Text style={styles.sectionTitle}>Impression</Text>
            <View style={styles.impressionBox}>
              <Text>{reportData.impression}</Text>
            </View>
          </View>
        );

      case "recommendations":
        return reportData.recommendations && reportData.recommendations.length > 0 ? (
          <View key="recommendations">
            <Text style={styles.sectionTitle}>Recommendations</Text>
            <View style={styles.recommendationsList}>
              {reportData.recommendations.map((rec, idx) => (
                <View style={styles.recommendationItem} key={idx}>
                  <Text style={styles.recommendationNumber}>{idx + 1}.</Text>
                  <Text>{rec}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null;

      default:
        return null;
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Fixed Header */}
        <View style={styles.header} fixed>
          {branding?.logo_url && <Image src={branding.logo_url} style={styles.logo} />}
          <View>
            <Text style={styles.headerText}>
              {branding?.header_text || "CBCT Radiology Report"}
            </Text>
            <Text style={styles.headerDate}>{reportData.reportDate}</Text>
          </View>
        </View>

        {/* Dynamic Sections */}
        {enabledSections.map((section) => renderSection(section.id))}

        {/* Sign-off */}
        <View style={styles.signoff}>
          <Text style={styles.signoffText}>Reported by: {reportData.reporterName}</Text>
          <Text style={styles.signoffText}>Date: {reportData.reportDate}</Text>
        </View>

        {/* Fixed Footer */}
        <View style={styles.footer} fixed>
          <Text>{branding?.footer_text || reportData.clinicName}</Text>
          <Text>Case ID: {reportData.caseId}</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
};