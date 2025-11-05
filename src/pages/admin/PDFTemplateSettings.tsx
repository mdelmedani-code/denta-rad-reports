import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Eye, FileText, Palette } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PDFSettings {
  logo_dimensions: { width: number; height: number };
  contact_info: { email: string; address: string };
  header_colors: { border_color: string; label_color: string };
  branding: { company_name: string; footer_text: string };
}

const PDFTemplateSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PDFSettings>({
    logo_dimensions: { width: 1100, height: 175 },
    contact_info: { email: "Admin@dentarad.com", address: "Your workplace address" },
    header_colors: { border_color: "#5fa8a6", label_color: "#5fa8a6" },
    branding: { company_name: "DentaRad", footer_text: "DentaRad - Professional CBCT Reporting" }
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

      <Tabs defaultValue="logo" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
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
