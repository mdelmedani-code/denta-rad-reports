import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  template_type: string;
  clinical_history: string;
  technique: string;
  findings: string;
  impression: string;
  is_default: boolean;
  use_count: number;
}

interface TemplateSelectorProps {
  onSelectTemplate: (template: Template) => void;
  disabled?: boolean;
}

export const TemplateSelector = ({ onSelectTemplate, disabled }: TemplateSelectorProps) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .order('is_default', { ascending: false })
        .order('use_count', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    try {
      // Increment use count
      await supabase
        .from('report_templates')
        .update({ use_count: template.use_count + 1 })
        .eq('id', templateId);

      onSelectTemplate(template);

      toast({
        title: 'Template Applied',
        description: `${template.name} has been loaded`,
      });
    } catch (error) {
      console.error('Error applying template:', error);
    }
  };

  return (
    <Select onValueChange={handleSelectTemplate} disabled={disabled || loading}>
      <SelectTrigger className="w-[280px]">
        <SelectValue placeholder="Load Template..." />
      </SelectTrigger>
      <SelectContent>
        {templates.map((template) => (
          <SelectItem key={template.id} value={template.id}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-medium">{template.name}</div>
                {template.description && (
                  <div className="text-xs text-muted-foreground">{template.description}</div>
                )}
              </div>
              {template.is_default && (
                <Badge variant="outline" className="ml-2">Default</Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};