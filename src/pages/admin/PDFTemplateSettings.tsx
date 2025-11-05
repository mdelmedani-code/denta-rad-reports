import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Eye, FileText, Palette, Download } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { pdf, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import dentaradLogo from '@/assets/dentarad-logo-pdf.jpg';

interface PDFSettings {
  logo_dimensions: { width: number; height: number };
  contact_info: { email: string; address: string };
  header_colors: { border_color: string; label_color: string };
  branding: { company_name: string; footer_text: string };
  footer_logo: { show_logo: boolean; width: number; height: number };
}

const PDFTemplateSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [settings, setSettings] = useState<PDFSettings>({
    logo_dimensions: { width: 1100, height: 175 },
    contact_info: { email: "Admin@dentarad.com", address: "Your workplace address" },
    header_colors: { border_color: "#5fa8a6", label_color: "#5fa8a6" },
    branding: { company_name: "DentaRad", footer_text: "DentaRad - Professional CBCT Reporting" },
    footer_logo: { show_logo: false, width: 80, height: 25 }
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pdf_template_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      if (data) {
        const settingsObj: any = {};
        data.forEach((item) => {
          settingsObj[item.setting_key] = item.setting_value;
        });
        setSettings(settingsObj as PDFSettings);
      }
    } catch (error: any) {
      toast({
        title: "Error Loading Settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      const { data: { user } } = await supabase.auth.getUser();

      // Update each setting
      const updates = [
        {
          setting_key: 'logo_dimensions',
          setting_value: settings.logo_dimensions,
          updated_by: user?.id
        },
        {
          setting_key: 'contact_info',
          setting_value: settings.contact_info,
          updated_by: user?.id
        },
        {
          setting_key: 'header_colors',
          setting_value: settings.header_colors,
          updated_by: user?.id
        },
        {
          setting_key: 'branding',
          setting_value: settings.branding,
          updated_by: user?.id
        },
        {
          setting_key: 'footer_logo',
          setting_value: settings.footer_logo,
          updated_by: user?.id
        }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('pdf_template_settings')
          .upsert({
            ...update,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'setting_key'
          });

        if (error) throw error;
      }

      toast({
        title: "Settings Saved",
        description: "PDF template settings have been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error Saving Settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const generatePreview = async () => {
    try {
      setPreviewing(true);

      // Create styles with current settings
      const styles = StyleSheet.create({
        page: {
          padding: 40,
          fontSize: 10,
          fontFamily: 'Helvetica',
          backgroundColor: '#ffffff',
        },
        brandHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 25,
          paddingBottom: 20,
          borderBottom: `2pt solid ${settings.header_colors.border_color}`,
        },
        logo: {
          width: settings.logo_dimensions.width,
          height: settings.logo_dimensions.height,
          objectFit: 'contain',
        },
        contactInfo: {
          fontSize: 9,
          color: '#666',
          textAlign: 'right',
          marginBottom: 3,
        },
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

      // Sample preview document
      const PreviewDocument = () => (
        <Document>
          <Page size="A4" style={styles.page}>
            {/* Header */}
            <View style={styles.brandHeader}>
              <Image src={dentaradLogo} style={styles.logo} />
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
                  <Text style={styles.infoValue}>John Smith (Sample)</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Age</Text>
                  <Text style={styles.infoValue}>45 years</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Date of Birth</Text>
                  <Text style={styles.infoValue}>15/03/1979</Text>
                </View>
              </View>
            </View>

            {/* Case Information */}
            <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>Case Information</Text>
              <View style={styles.infoGrid}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Clinical Question</Text>
                  <Text style={styles.infoValue}>Sample CBCT evaluation for implant planning</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Field of View</Text>
                  <Text style={styles.infoValue}>UP TO 8X8</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Urgency Level</Text>
                  <Text style={styles.infoValue}>Standard</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Upload Date</Text>
                  <Text style={styles.infoValue}>{new Date().toLocaleDateString('en-GB')}</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Report Title */}
            <Text style={styles.reportTitle}>Diagnostic Report (Sample)</Text>

            {/* Sample Findings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Findings</Text>
              <Text style={styles.sectionContent}>
                This is a sample preview of how your PDF reports will appear with the current template settings. 
                The actual report content will vary based on the radiologist's findings for each case.
              </Text>
            </View>

            {/* Sample Impression */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Impression</Text>
              <Text style={styles.sectionContent}>
                Sample impression text demonstrating the layout and styling of the diagnostic report.
              </Text>
            </View>

            {/* Signature Section */}
            <View style={styles.signatureSection}>
              <Text style={styles.endOfReport}>***End of Report***</Text>
              <Text style={[styles.doctorInfo, styles.doctorName]}>
                Dr. Sample Radiologist
              </Text>
              <Text style={styles.doctorInfo}>
                (BDS, MSc Oral Radiology)
              </Text>
              <Text style={styles.reportDate}>
                Report Date: {new Date().toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })} - {new Date().toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>

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
      const blob = await pdf(<PreviewDocument />).toBlob();
      const url = URL.createObjectURL(blob);
      
      // Open in new window
      window.open(url, '_blank');

      toast({
        title: "Preview Generated",
        description: "Opening preview in new window...",
      });
    } catch (error: any) {
      toast({
        title: "Preview Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPreviewing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">PDF Template Settings</h1>
          <p className="text-muted-foreground">Customize the appearance of generated PDF reports</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={generatePreview} disabled={previewing} variant="outline">
            {previewing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </>
            )}
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="logo" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="logo">
            <FileText className="w-4 h-4 mr-2" />
            Logo
          </TabsTrigger>
          <TabsTrigger value="contact">
            <FileText className="w-4 h-4 mr-2" />
            Contact Info
          </TabsTrigger>
          <TabsTrigger value="colors">
            <Palette className="w-4 h-4 mr-2" />
            Colors
          </TabsTrigger>
          <TabsTrigger value="branding">
            <Eye className="w-4 h-4 mr-2" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="footer">
            <FileText className="w-4 h-4 mr-2" />
            Footer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logo">
          <Card>
            <CardHeader>
              <CardTitle>Logo Dimensions</CardTitle>
              <CardDescription>
                Adjust the size of the logo in PDF reports (in pixels)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="logo-width">Width (px)</Label>
                  <Input
                    id="logo-width"
                    type="number"
                    value={settings.logo_dimensions.width}
                    onChange={(e) => setSettings({
                      ...settings,
                      logo_dimensions: {
                        ...settings.logo_dimensions,
                        width: parseInt(e.target.value) || 0
                      }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo-height">Height (px)</Label>
                  <Input
                    id="logo-height"
                    type="number"
                    value={settings.logo_dimensions.height}
                    onChange={(e) => setSettings({
                      ...settings,
                      logo_dimensions: {
                        ...settings.logo_dimensions,
                        height: parseInt(e.target.value) || 0
                      }
                    })}
                  />
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Current dimensions: {settings.logo_dimensions.width}px × {settings.logo_dimensions.height}px
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Recommended: Keep aspect ratio similar to your logo image for best results.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>
                Update the contact details shown in the PDF header
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.contact_info.email}
                  onChange={(e) => setSettings({
                    ...settings,
                    contact_info: {
                      ...settings.contact_info,
                      email: e.target.value
                    }
                  })}
                  placeholder="admin@dentarad.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Office Address</Label>
                <Textarea
                  id="address"
                  value={settings.contact_info.address}
                  onChange={(e) => setSettings({
                    ...settings,
                    contact_info: {
                      ...settings.contact_info,
                      address: e.target.value
                    }
                  })}
                  placeholder="Your workplace address"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colors">
          <Card>
            <CardHeader>
              <CardTitle>Color Scheme</CardTitle>
              <CardDescription>
                Customize the colors used in PDF reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="border-color">Header Border Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="border-color"
                    type="color"
                    value={settings.header_colors.border_color}
                    onChange={(e) => setSettings({
                      ...settings,
                      header_colors: {
                        ...settings.header_colors,
                        border_color: e.target.value
                      }
                    })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.header_colors.border_color}
                    onChange={(e) => setSettings({
                      ...settings,
                      header_colors: {
                        ...settings.header_colors,
                        border_color: e.target.value
                      }
                    })}
                    placeholder="#5fa8a6"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="label-color">Section Label Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="label-color"
                    type="color"
                    value={settings.header_colors.label_color}
                    onChange={(e) => setSettings({
                      ...settings,
                      header_colors: {
                        ...settings.header_colors,
                        label_color: e.target.value
                      }
                    })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.header_colors.label_color}
                    onChange={(e) => setSettings({
                      ...settings,
                      header_colors: {
                        ...settings.header_colors,
                        label_color: e.target.value
                      }
                    })}
                    placeholder="#5fa8a6"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Branding Text</CardTitle>
              <CardDescription>
                Customize company name and footer text
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={settings.branding.company_name}
                  onChange={(e) => setSettings({
                    ...settings,
                    branding: {
                      ...settings.branding,
                      company_name: e.target.value
                    }
                  })}
                  placeholder="DentaRad"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footer-text">Footer Text</Label>
                <Input
                  id="footer-text"
                  value={settings.branding.footer_text}
                  onChange={(e) => setSettings({
                    ...settings,
                    branding: {
                      ...settings.branding,
                      footer_text: e.target.value
                    }
                  })}
                  placeholder="DentaRad - Professional CBCT Reporting"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="footer">
          <Card>
            <CardHeader>
              <CardTitle>Footer Logo Settings</CardTitle>
              <CardDescription>
                Configure logo display in the PDF footer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="show-footer-logo"
                  checked={settings.footer_logo.show_logo}
                  onChange={(e) => setSettings({
                    ...settings,
                    footer_logo: {
                      ...settings.footer_logo,
                      show_logo: e.target.checked
                    }
                  })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="show-footer-logo">Show logo in footer</Label>
              </div>

              {settings.footer_logo.show_logo && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="footer-logo-width">Logo Width (px)</Label>
                      <Input
                        id="footer-logo-width"
                        type="number"
                        value={settings.footer_logo.width}
                        onChange={(e) => setSettings({
                          ...settings,
                          footer_logo: {
                            ...settings.footer_logo,
                            width: parseInt(e.target.value) || 0
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="footer-logo-height">Logo Height (px)</Label>
                      <Input
                        id="footer-logo-height"
                        type="number"
                        value={settings.footer_logo.height}
                        onChange={(e) => setSettings({
                          ...settings,
                          footer_logo: {
                            ...settings.footer_logo,
                            height: parseInt(e.target.value) || 0
                          }
                        })}
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Footer logo dimensions: {settings.footer_logo.width}px × {settings.footer_logo.height}px
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      The logo will appear centered above the footer text.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Preview Note</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Changes will be reflected in all newly generated PDFs. To see the changes, download a report PDF after saving.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PDFTemplateSettings;
