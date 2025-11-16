import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Save, Eye, Code, Loader2, RotateCcw, FileText } from 'lucide-react';

interface EmailTemplate {
  id: string;
  template_key: string;
  template_name: string;
  subject: string;
  html_content: string;
  description: string;
  available_variables: string[];
  is_active: boolean;
}

export default function EmailTemplateSettings() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'editor' | 'preview'>('editor');

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('template_name');

      if (error) throw error;

      const typedData = (data || []).map(template => ({
        ...template,
        available_variables: Array.isArray(template.available_variables) 
          ? template.available_variables as string[]
          : []
      }));

      setTemplates(typedData as EmailTemplate[]);
      if (typedData && typedData.length > 0 && !selectedTemplate) {
        selectTemplate(typedData[0] as EmailTemplate);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  }

  function selectTemplate(template: EmailTemplate) {
    setSelectedTemplate(template);
    setSubject(template.subject);
    setHtmlContent(template.html_content);
    setPreviewMode('editor');
  }

  async function saveTemplate() {
    if (!selectedTemplate) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          subject,
          html_content: htmlContent,
          updated_at: new Date().toISOString(),
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', selectedTemplate.id);

      if (error) throw error;

      toast.success('Template saved successfully');
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  async function resetToDefault() {
    if (!selectedTemplate) return;
    
    const confirmReset = window.confirm(
      'Are you sure you want to reset this template to its default content? This action cannot be undone.'
    );
    
    if (!confirmReset) return;

    setSaving(true);
    try {
      // Reload the original template from database
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', selectedTemplate.id)
        .single();

      if (error) throw error;

      const typedData = {
        ...data,
        available_variables: Array.isArray(data.available_variables) 
          ? data.available_variables as string[]
          : []
      };

      selectTemplate(typedData as EmailTemplate);
      toast.success('Template reset to default');
    } catch (error) {
      console.error('Error resetting template:', error);
      toast.error('Failed to reset template');
    } finally {
      setSaving(false);
    }
  }

  function renderPreview() {
    if (!selectedTemplate) return null;

    // Create sample data for preview
    const sampleData: Record<string, string> = {
      invoice_number: 'INV-000123',
      clinic_name: 'Sample Dental Clinic',
      amount: '450.00',
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
      days_until_due: '7',
      days_overdue: '3'
    };

    // Replace variables in content
    let previewHtml = htmlContent;
    let previewSubject = subject;

    Object.keys(sampleData).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      previewHtml = previewHtml.replace(regex, sampleData[key]);
      previewSubject = previewSubject.replace(regex, sampleData[key]);
    });

    return (
      <div className="space-y-4">
        <div className="border-b pb-2">
          <div className="text-sm text-muted-foreground">Subject:</div>
          <div className="font-medium">{previewSubject}</div>
        </div>
        <div
          className="border rounded-lg p-4 bg-background"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Email Template Settings</h1>
        <p className="text-muted-foreground mt-2">
          Customize email templates for invoices and payment reminders
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Template Selector */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Templates</CardTitle>
            <CardDescription>Select a template to edit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {templates.map((template) => (
              <Button
                key={template.id}
                variant={selectedTemplate?.id === template.id ? 'default' : 'outline'}
                className="w-full justify-start"
                onClick={() => selectTemplate(template)}
              >
                <div className="text-left">
                  <div className="font-medium">{template.template_name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {template.description}
                  </div>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Editor / Preview */}
        <Card className="md:col-span-3">
          {selectedTemplate ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedTemplate.template_name}</CardTitle>
                    <CardDescription>{selectedTemplate.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetToDefault}
                      disabled={saving}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset to Default
                    </Button>
                    <Button onClick={saveTemplate} disabled={saving}>
                      {saving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as 'editor' | 'preview')}>
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="editor">
                      <Code className="h-4 w-4 mr-2" />
                      Editor
                    </TabsTrigger>
                    <TabsTrigger value="preview">
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="editor" className="space-y-4">
                    {/* Available Variables */}
                    <div className="bg-muted p-3 rounded-md">
                      <div className="text-sm font-medium mb-2">Available Variables:</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedTemplate.available_variables.map((variable) => (
                          <Badge key={variable} variant="secondary" className="font-mono text-xs">
                            {`{{${variable}}}`}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Use these variables in your template. They will be replaced with actual values when emails are sent.
                      </p>
                    </div>

                    {/* Subject Field */}
                    <div className="space-y-2">
                      <Label htmlFor="subject">Email Subject</Label>
                      <Input
                        id="subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Enter email subject..."
                      />
                    </div>

                    {/* HTML Content */}
                    <div className="space-y-2">
                      <Label htmlFor="html-content">HTML Content</Label>
                      <Textarea
                        id="html-content"
                        value={htmlContent}
                        onChange={(e) => setHtmlContent(e.target.value)}
                        placeholder="Enter HTML content..."
                        className="font-mono text-sm min-h-[400px]"
                      />
                      <p className="text-xs text-muted-foreground">
                        Use inline CSS styles for best email client compatibility
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="preview">
                    <div className="border rounded-lg p-6 bg-muted/50">
                      <div className="max-w-2xl mx-auto bg-background rounded-lg shadow-lg p-6">
                        {renderPreview()}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center min-h-[400px]">
              <div className="text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a template to begin editing</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
