import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Save } from 'lucide-react';

interface InvoiceSettings {
  patient_identifier: 'patient_id' | 'patient_internal_id' | 'patient_name';
  show_patient_name: boolean;
  show_field_of_view: boolean;
  show_case_ref: boolean;
  show_report_date: boolean;
  show_urgency: boolean;
  table_columns: string[];
}

export default function InvoiceSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<InvoiceSettings>({
    patient_identifier: 'patient_id',
    show_patient_name: false,
    show_field_of_view: true,
    show_case_ref: false,
    show_report_date: true,
    show_urgency: true,
    table_columns: ['description', 'date', 'field_of_view', 'amount']
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pdf_template_settings')
        .select('setting_value')
        .eq('setting_key', 'invoice_template')
        .single();

      if (error) throw error;
      if (data?.setting_value) {
        setSettings(data.setting_value as unknown as InvoiceSettings);
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load invoice settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('pdf_template_settings')
        .update({
          setting_value: settings as any
        })
        .eq('setting_key', 'invoice_template');

      if (error) throw error;

      toast({
        title: 'Settings Saved',
        description: 'Invoice template settings updated successfully'
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invoice Template Settings</h1>
        <p className="text-muted-foreground mt-2">
          Customize which fields appear on generated invoices
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patient Identifier</CardTitle>
          <CardDescription>
            Choose which identifier to use for patients in invoice line items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={settings.patient_identifier}
            onValueChange={(value: any) =>
              setSettings({ ...settings, patient_identifier: value })
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="patient_id" id="patient_id" />
              <Label htmlFor="patient_id">Patient ID</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="patient_internal_id" id="patient_internal_id" />
              <Label htmlFor="patient_internal_id">Patient Internal ID</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="patient_name" id="patient_name" />
              <Label htmlFor="patient_name">Patient Name</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Fields</CardTitle>
          <CardDescription>
            Select which additional fields to display in invoices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show_patient_name"
              checked={settings.show_patient_name}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, show_patient_name: checked as boolean })
              }
            />
            <Label htmlFor="show_patient_name">
              Show patient name alongside identifier
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="show_field_of_view"
              checked={settings.show_field_of_view}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, show_field_of_view: checked as boolean })
              }
            />
            <Label htmlFor="show_field_of_view">
              Show field of view (FOV) column
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="show_case_ref"
              checked={settings.show_case_ref}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, show_case_ref: checked as boolean })
              }
            />
            <Label htmlFor="show_case_ref">
              Show case reference number
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="show_report_date"
              checked={settings.show_report_date}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, show_report_date: checked as boolean })
              }
            />
            <Label htmlFor="show_report_date">
              Show report completion date
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="show_urgency"
              checked={settings.show_urgency}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, show_urgency: checked as boolean })
              }
            />
            <Label htmlFor="show_urgency">
              Show urgency level (Standard/Urgent)
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
