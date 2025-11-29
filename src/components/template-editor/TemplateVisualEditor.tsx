import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';

export function TemplateVisualEditor({ template, onChange }: any) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [headerConfig, setHeaderConfig] = useState(template?.header_config || {});
  const [footerConfig, setFooterConfig] = useState(template?.footer_config || {});
  const [colorScheme, setColorScheme] = useState(template?.color_scheme || {});
  const [typographyConfig, setTypographyConfig] = useState(template?.typography_config || {});
  const [isPublished, setIsPublished] = useState(template?.is_published || false);
  const [isDefault, setIsDefault] = useState(template?.is_default || false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || '');
      setHeaderConfig(template.header_config || {});
      setFooterConfig(template.footer_config || {});
      setColorScheme(template.color_scheme || {});
      setTypographyConfig(template.typography_config || {});
      setIsPublished(template.is_published || false);
      setIsDefault(template.is_default || false);
    }
  }, [template]);

  const handleLogoUpload = async (file: File) => {
    const fileName = `${template.id}-${Date.now()}.${file.name.split('.').pop()}`;
    
    const { error: uploadError } = await supabase.storage
      .from('template-logos')
      .upload(fileName, file);

    if (uploadError) {
      toast.error('Failed to upload logo');
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('template-logos')
      .getPublicUrl(fileName);

    const updated = { ...headerConfig, logo_url: publicUrl };
    setHeaderConfig(updated);
    await saveTemplate({ header_config: updated });
  };

  const handleRemoveLogo = async () => {
    if (headerConfig.logo_url) {
      const fileName = headerConfig.logo_url.split('/').pop();
      await supabase.storage
        .from('template-logos')
        .remove([fileName]);
    }

    const updated = { ...headerConfig, logo_url: null };
    setHeaderConfig(updated);
    await saveTemplate({ header_config: updated });
  };

  const saveTemplate = async (updates: any) => {
    const { error } = await supabase
      .from('pdf_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', template.id);

    if (error) {
      toast.error('Failed to save changes');
    } else {
      onChange({ ...template, ...updates });
    }
  };

  const handleSaveBasicInfo = async () => {
    await saveTemplate({ name, description, is_published: isPublished, is_default: isDefault });
    toast.success('Template info saved');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Template Information</CardTitle>
          <CardDescription>Basic details about this template</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleSaveBasicInfo}
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSaveBasicInfo}
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Published</Label>
              <p className="text-sm text-muted-foreground">Make available to reporters</p>
            </div>
            <Switch
              checked={isPublished}
              onCheckedChange={async (checked) => {
                setIsPublished(checked);
                await saveTemplate({ is_published: checked });
                toast.success(checked ? 'Template published' : 'Template unpublished');
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Default Template</Label>
              <p className="text-sm text-muted-foreground">Auto-select for new reports</p>
            </div>
            <Switch
              checked={isDefault}
              onCheckedChange={async (checked) => {
                setIsDefault(checked);
                await saveTemplate({ is_default: checked });
                toast.success(checked ? 'Set as default' : 'Removed as default');
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="header" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="header">Header</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
        </TabsList>

        <TabsContent value="header">
          <Card>
            <CardHeader>
              <CardTitle>Header Configuration</CardTitle>
              <CardDescription>Customize the PDF header appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Logo</Label>
                {headerConfig.logo_url ? (
                  <div className="mt-2 space-y-2">
                    <img src={headerConfig.logo_url} alt="Logo" className="h-16 rounded border" />
                    <Button variant="outline" size="sm" onClick={handleRemoveLogo}>
                      <X className="mr-2 h-4 w-4" />
                      Remove Logo
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2">
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                      className="cursor-pointer"
                    />
                  </div>
                )}
              </div>

              <div>
                <Label>Logo Height (px)</Label>
                <Input
                  type="number"
                  min="40"
                  max="120"
                  value={headerConfig.logo_height || 60}
                  onChange={(e) => {
                    const updated = { ...headerConfig, logo_height: parseInt(e.target.value) };
                    setHeaderConfig(updated);
                  }}
                  onBlur={() => saveTemplate({ header_config: headerConfig })}
                />
              </div>

              <div>
                <Label>Background Color</Label>
                <Input
                  type="color"
                  value={headerConfig.background_color || '#ffffff'}
                  onChange={(e) => {
                    const updated = { ...headerConfig, background_color: e.target.value };
                    setHeaderConfig(updated);
                    saveTemplate({ header_config: updated });
                  }}
                />
              </div>

              <div>
                <Label>Height (px)</Label>
                <Input
                  type="number"
                  min="60"
                  max="120"
                  value={headerConfig.height || 80}
                  onChange={(e) => {
                    const updated = { ...headerConfig, height: parseInt(e.target.value) };
                    setHeaderConfig(updated);
                  }}
                  onBlur={() => saveTemplate({ header_config: headerConfig })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="footer">
          <Card>
            <CardHeader>
              <CardTitle>Footer Configuration</CardTitle>
              <CardDescription>Customize the PDF footer appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Footer Text</Label>
                <Textarea
                  value={footerConfig.text || ''}
                  onChange={(e) => {
                    const updated = { ...footerConfig, text: e.target.value };
                    setFooterConfig(updated);
                  }}
                  onBlur={() => saveTemplate({ footer_config: footerConfig })}
                  placeholder="Enter footer text..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Background Color</Label>
                <Input
                  type="color"
                  value={footerConfig.background_color || '#f8f9fa'}
                  onChange={(e) => {
                    const updated = { ...footerConfig, background_color: e.target.value };
                    setFooterConfig(updated);
                    saveTemplate({ footer_config: updated });
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Page Numbers</Label>
                  <p className="text-sm text-muted-foreground">Display page numbers in footer</p>
                </div>
                <Switch
                  checked={footerConfig.show_page_numbers ?? true}
                  onCheckedChange={(checked) => {
                    const updated = { ...footerConfig, show_page_numbers: checked };
                    setFooterConfig(updated);
                    saveTemplate({ footer_config: updated });
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colors">
          <Card>
            <CardHeader>
              <CardTitle>Color Scheme</CardTitle>
              <CardDescription>Customize the color palette for your template</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'primary', label: 'Primary Color', description: 'Main brand color' },
                { key: 'secondary', label: 'Secondary Color', description: 'Accent color' },
                { key: 'heading', label: 'Heading Color', description: 'Color for headings' },
                { key: 'text', label: 'Text Color', description: 'Body text color' },
                { key: 'background', label: 'Background Color', description: 'Page background' },
              ].map(({ key, label, description }) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{label}</Label>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                  <Input
                    type="color"
                    value={colorScheme[key] || '#000000'}
                    onChange={(e) => {
                      const updated = { ...colorScheme, [key]: e.target.value };
                      setColorScheme(updated);
                      saveTemplate({ color_scheme: updated });
                    }}
                    className="w-20"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="typography">
          <Card>
            <CardHeader>
              <CardTitle>Typography</CardTitle>
              <CardDescription>Configure font sizes and spacing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'h1_size', label: 'Heading 1 Size', min: 18, max: 32 },
                { key: 'h2_size', label: 'Heading 2 Size', min: 16, max: 24 },
                { key: 'h3_size', label: 'Heading 3 Size', min: 12, max: 18 },
                { key: 'body_size', label: 'Body Text Size', min: 10, max: 14 },
              ].map(({ key, label, min, max }) => (
                <div key={key}>
                  <Label>{label} (pt)</Label>
                  <Input
                    type="number"
                    min={min}
                    max={max}
                    value={typographyConfig[key] || 11}
                    onChange={(e) => {
                      const updated = { ...typographyConfig, [key]: parseInt(e.target.value) };
                      setTypographyConfig(updated);
                    }}
                    onBlur={() => saveTemplate({ typography_config: typographyConfig })}
                  />
                </div>
              ))}

              <div>
                <Label>Line Height</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="2.0"
                  value={typographyConfig.line_height || 1.5}
                  onChange={(e) => {
                    const updated = { ...typographyConfig, line_height: parseFloat(e.target.value) };
                    setTypographyConfig(updated);
                  }}
                  onBlur={() => saveTemplate({ typography_config: typographyConfig })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
