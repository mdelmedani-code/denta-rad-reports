import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw, Eye } from "lucide-react";

const defaultPlaceholder = 'Enter your radiology report content here...';

export default function ReportTemplateSettings() {
  const [placeholder, setPlaceholder] = useState(defaultPlaceholder);
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
        const value = data.setting_value as any;
        setPlaceholder(value.content_placeholder || defaultPlaceholder);
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
          setting_value: { content_placeholder: placeholder },
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
    setPlaceholder(defaultPlaceholder);
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
          Customize the default placeholder text for new report content
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Default Template Configuration</CardTitle>
            <CardDescription>
              This placeholder text appears when creating new reports
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold text-lg">Report Content Template</h3>
              <div className="space-y-2">
                <Label htmlFor="content_placeholder">Placeholder Text</Label>
                <Textarea
                  id="content_placeholder"
                  value={placeholder}
                  onChange={(e) => setPlaceholder(e.target.value)}
                  placeholder="Placeholder text that appears in new reports"
                  rows={8}
                />
                <p className="text-xs text-muted-foreground">
                  Tip: You can include section headers like TECHNIQUE:, FINDINGS:, IMPRESSION: to guide report structure.
                </p>
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
              Preview of the placeholder text that will appear in new reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground italic whitespace-pre-wrap">{placeholder}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
