import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ReportTemplate } from '@/services/templateService';
import { useToast } from '@/hooks/use-toast';

export const useReportTemplates = (category?: string) => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('cbct_report_templates')
        .select('*')
        .order('indication_category', { ascending: true })
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });
      
      if (category && category !== 'All') {
        query = query.eq('indication_category', category);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (template: Partial<ReportTemplate>) => {
    try {
      const { data, error } = await supabase
        .from('cbct_report_templates')
        .insert(template as any)
        .select()
        .single();
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Template created successfully',
      });
      
      await fetchTemplates();
      return data;
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: 'Error',
        description: 'Failed to create template',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateTemplate = async (id: string, updates: Partial<ReportTemplate>) => {
    try {
      const { error } = await supabase
        .from('cbct_report_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Template updated successfully',
      });
      
      await fetchTemplates();
      return true;
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: 'Error',
        description: 'Failed to update template',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteTemplate = async (id: string, usageCount: number, isDefault: boolean) => {
    if (isDefault) {
      toast({
        title: 'Cannot Delete',
        description: 'Default templates cannot be deleted',
        variant: 'destructive',
      });
      return false;
    }

    if (usageCount > 0) {
      toast({
        title: 'Cannot Delete',
        description: `This template has been used ${usageCount} times and cannot be deleted`,
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('cbct_report_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Template deleted successfully',
      });
      
      await fetchTemplates();
      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      });
      return false;
    }
  };

  const duplicateTemplate = async (template: ReportTemplate) => {
    try {
      const { data, error } = await supabase
        .from('cbct_report_templates')
        .insert({
          name: `${template.name} (Copy)`,
          description: template.description,
          indication_category: template.indication_category,
          is_default: false,
          clinical_history_template: template.clinical_history_template,
          imaging_technique_template: template.imaging_technique_template,
          findings_template: template.findings_template,
          impression_template: template.impression_template,
          recommendations_template: template.recommendations_template,
        } as any)
        .select()
        .single();
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Template duplicated successfully',
      });
      
      await fetchTemplates();
      return data;
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate template',
        variant: 'destructive',
      });
      return null;
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [category]);

  return {
    templates,
    loading,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
  };
};
