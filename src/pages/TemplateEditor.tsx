import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { TemplateLibrary } from '@/components/template-editor/TemplateLibrary';
import { TemplateVisualEditor } from '@/components/template-editor/TemplateVisualEditor';
import { TemplateLivePreview } from '@/components/template-editor/TemplateLivePreview';
import { ChevronLeft } from 'lucide-react';

export default function TemplateEditor() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'library' | 'editor'>('library');

  useEffect(() => {
    checkRole();
  }, [user]);

  useEffect(() => {
    if (userRole === 'admin') {
      loadTemplates();
    }
  }, [userRole]);

  const checkRole = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    setUserRole(data?.role || null);
    setLoading(false);
  };

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('pdf_templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setTemplates(data);
    }
  };

  const createNewTemplate = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('pdf_templates')
      .insert({
        name: 'New Template',
        created_by: user.id,
        is_published: false,
        content: {}
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create template');
      return;
    }

    if (data) {
      setActiveTemplate(data);
      setViewMode('editor');
      loadTemplates();
      toast.success('Template created');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    const { error } = await supabase
      .from('pdf_templates')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete template');
    } else {
      toast.success('Template deleted');
      loadTemplates();
      if (activeTemplate?.id === id) {
        setViewMode('library');
        setActiveTemplate(null);
      }
    }
  };

  const handleDuplicateTemplate = async (id: string) => {
    if (!user) return;

    const template = templates.find(t => t.id === id);
    if (!template) return;

    const { data, error } = await supabase
      .from('pdf_templates')
      .insert({
        ...template,
        id: undefined,
        name: `${template.name} (Copy)`,
        created_by: user.id,
        is_published: false,
        created_at: undefined,
        updated_at: undefined
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to duplicate template');
    } else {
      toast.success('Template duplicated');
      loadTemplates();
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!user || userRole !== 'admin') {
    return <Navigate to="/admin-dashboard" replace />;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {viewMode === 'library' ? (
        <TemplateLibrary
          templates={templates}
          onCreateNew={createNewTemplate}
          onSelectTemplate={(template) => {
            setActiveTemplate(template);
            setViewMode('editor');
          }}
          onDeleteTemplate={handleDeleteTemplate}
          onDuplicateTemplate={handleDuplicateTemplate}
        />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Back button and template info */}
          <div className="w-64 border-r p-4 bg-muted/20">
            <Button 
              variant="ghost" 
              onClick={() => {
                setViewMode('library');
                setActiveTemplate(null);
              }}
              className="mb-4 w-full justify-start"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Library
            </Button>
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">Editing</h3>
              <p className="font-medium">{activeTemplate?.name}</p>
            </div>
          </div>

          {/* Center: Visual Editor */}
          <div className="flex-1 overflow-y-auto p-6">
            <TemplateVisualEditor
              template={activeTemplate}
              onChange={(updated) => {
                setActiveTemplate(updated);
                loadTemplates();
              }}
            />
          </div>

          {/* Right: Live Preview */}
          <div className="w-96 border-l overflow-y-auto">
            <TemplateLivePreview template={activeTemplate} />
          </div>
        </div>
      )}
    </div>
  );
}
