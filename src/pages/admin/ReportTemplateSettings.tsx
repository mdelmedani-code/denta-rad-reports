import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw, Eye } from "lucide-react";

interface TemplateSettings {
  technique_heading: string;
  technique_placeholder: string;
  findings_heading: string;
  findings_placeholder: string;
  impression_heading: string;
  impression_placeholder: string;
}

const defaultSettings: TemplateSettings = {
  technique_heading: 'TECHNIQUE:',
  technique_placeholder: 'Enter technique details here...',
  findings_heading: 'FINDINGS:',
  findings_placeholder: 'Enter findings here...',
  impression_heading: 'IMPRESSION:',
  impression_placeholder: 'Enter impression here...',
};

export default function ReportTemplateSettings() {
  const [settings, setSettings] = useState<TemplateSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('template_settings')
        .select('setting_value')
        .eq('setting_key', 'default_template')
        .single();

      if (error) throw error;
      if (data?.setting_value) {
        setSettings(data.setting_value as any as TemplateSettings);
      }
    } catch (error: any) {
      console.error('Error fetching template settings:', error);
      toast.error('Failed to load template settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('template_settings')
        .update({
          setting_value: settings as any,
          updated_at: new Date().toISOString(),
          updated_by: userData.user?.id,
        })
        .eq('setting_key', 'default_template');

      if (error) throw error;
      
      toast.success('Template settings saved successfully');
    } catch (error: any) {
      console.error('Error saving template settings:', error);
      toast.error('Failed to save template settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    toast.success('Settings reset to defaults (click Save to apply)');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Report Template Settings</h1>
        <p className="text-muted-foreground mt-2">
          Customize the default headings and placeholder text for report sections
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Default Template Configuration</CardTitle>
            <CardDescription>
              These settings control the default headings and placeholder text when creating new reports
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
          {/* Technique Section */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold text-lg">Technique Section</h3>
            <div className="space-y-2">
              <Label htmlFor="technique_heading">Section Heading</Label>
              <Input
                id="technique_heading"
                value={settings.technique_heading}
                onChange={(e) => setSettings({ ...settings, technique_heading: e.target.value })}
                placeholder="e.g., TECHNIQUE:"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="technique_placeholder">Placeholder Text</Label>
              <Textarea
                id="technique_placeholder"
                value={settings.technique_placeholder}
                onChange={(e) => setSettings({ ...settings, technique_placeholder: e.target.value })}
                placeholder="Placeholder text that appears in new reports"
                rows={3}
              />
            </div>
          </div>

          {/* Findings Section */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold text-lg">Findings Section</h3>
            <div className="space-y-2">
              <Label htmlFor="findings_heading">Section Heading</Label>
              <Input
                id="findings_heading"
                value={settings.findings_heading}
                onChange={(e) => setSettings({ ...settings, findings_heading: e.target.value })}
                placeholder="e.g., FINDINGS:"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="findings_placeholder">Placeholder Text</Label>
              <Textarea
                id="findings_placeholder"
                value={settings.findings_placeholder}
                onChange={(e) => setSettings({ ...settings, findings_placeholder: e.target.value })}
                placeholder="Placeholder text that appears in new reports"
                rows={3}
              />
            </div>
          </div>

          {/* Impression Section */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold text-lg">Impression Section</h3>
            <div className="space-y-2">
              <Label htmlFor="impression_heading">Section Heading</Label>
              <Input
                id="impression_heading"
                value={settings.impression_heading}
                onChange={(e) => setSettings({ ...settings, impression_heading: e.target.value })}
                placeholder="e.g., IMPRESSION:"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="impression_placeholder">Placeholder Text</Label>
              <Textarea
                id="impression_placeholder"
                value={settings.impression_placeholder}
                onChange={(e) => setSettings({ ...settings, impression_placeholder: e.target.value })}
                placeholder="Placeholder text that appears in new reports"
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={saving}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Template Preview
          </CardTitle>
          <CardDescription>
            Preview of how the report structure will appear with current settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-2">
              <p className="font-semibold text-foreground">{settings.technique_heading}</p>
              <p className="text-sm text-muted-foreground italic">{settings.technique_placeholder}</p>
            </div>
            
            <div className="space-y-2">
              <p className="font-semibold text-foreground">{settings.findings_heading}</p>
              <p className="text-sm text-muted-foreground italic">{settings.findings_placeholder}</p>
            </div>
            
            <div className="space-y-2">
              <p className="font-semibold text-foreground">{settings.impression_heading}</p>
              <p className="text-sm text-muted-foreground italic">{settings.impression_placeholder}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
