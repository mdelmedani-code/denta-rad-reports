import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Edit, Copy, Trash2, FileText, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PDFTemplate {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  template_data: any;
  created_at: string;
}

interface ClinicUsage {
  template_id: string;
  count: number;
}

const AdminTemplates = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<PDFTemplate[]>([]);
  const [clinicUsage, setClinicUsage] = useState<ClinicUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  const [copyFromTemplateId, setCopyFromTemplateId] = useState<string>("");

  useEffect(() => {
    fetchTemplates();
    fetchClinicUsage();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('pdf_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClinicUsage = async () => {
    try {
      const { data, error } = await supabase
        .from('clinic_branding')
        .select('template_id');

      if (error) throw error;

      const usage = (data || []).reduce((acc: Record<string, number>, curr) => {
        if (curr.template_id) {
          acc[curr.template_id] = (acc[curr.template_id] || 0) + 1;
        }
        return acc;
      }, {});

      setClinicUsage(
        Object.entries(usage).map(([template_id, count]) => ({
          template_id,
          count: count as number,
        }))
      );
    } catch (error) {
      console.error('Error fetching clinic usage:', error);
    }
  };

  const getUsageCount = (templateId: string): number => {
    return clinicUsage.find(u => u.template_id === templateId)?.count || 0;
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast({
        title: "Validation Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      let templateData = {
        layout: "modern",
        headerHeight: 80,
        footerHeight: 50,
        margins: { top: 100, bottom: 70, left: 50, right: 50 },
        sections: [
          { id: "patient-info", label: "Patient Information", enabled: true, order: 1 },
          { id: "clinical-question", label: "Clinical Question", enabled: true, order: 2 },
          { id: "findings", label: "Findings", enabled: true, order: 3 },
          { id: "images", label: "Reference Images", enabled: true, order: 4 },
          { id: "impression", label: "Impression", enabled: true, order: 5 },
          { id: "recommendations", label: "Recommendations", enabled: true, order: 6 },
        ],
        typography: {
          headingSize: 18,
          subheadingSize: 14,
          bodySize: 11,
          captionSize: 9,
        },
      };

      // If copying from existing template, use its data
      if (copyFromTemplateId) {
        const sourceTemplate = templates.find(t => t.id === copyFromTemplateId);
        if (sourceTemplate) {
          templateData = sourceTemplate.template_data;
        }
      }

      const { error } = await supabase
        .from('pdf_templates')
        .insert({
          name: newTemplateName,
          description: newTemplateDescription || null,
          is_default: false,
          template_data: templateData,
        });

      if (error) throw error;

      toast({
        title: "Template Created",
        description: "New template has been created successfully",
      });

      setShowCreateDialog(false);
      setNewTemplateName("");
      setNewTemplateDescription("");
      setCopyFromTemplateId("");
      fetchTemplates();
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
      });
    }
  };

  const handleDuplicateTemplate = async (template: PDFTemplate) => {
    try {
      const { error } = await supabase
        .from('pdf_templates')
        .insert({
          name: `${template.name} (Copy)`,
          description: template.description,
          is_default: false,
          template_data: template.template_data,
        });

      if (error) throw error;

      toast({
        title: "Template Duplicated",
        description: "Template has been duplicated successfully",
      });

      fetchTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate template",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string, isDefault: boolean) => {
    if (isDefault) {
      toast({
        title: "Cannot Delete",
        description: "Default templates cannot be deleted",
        variant: "destructive",
      });
      return;
    }

    const usageCount = getUsageCount(templateId);
    if (usageCount > 0) {
      toast({
        title: "Cannot Delete",
        description: `This template is used by ${usageCount} clinic(s)`,
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('pdf_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "Template Deleted",
        description: "Template has been deleted successfully",
      });

      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/admin')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">PDF Template Management</h1>
              <p className="text-muted-foreground">Create and manage report templates</p>
            </div>
          </div>

          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        </div>

        {/* Templates List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Available Templates
            </CardTitle>
            <CardDescription>
              Manage PDF report templates for your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">
                    <Building2 className="w-4 h-4 inline mr-1" />
                    Used By
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No templates found. Create your first template to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-md truncate">
                        {template.description || "No description"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {getUsageCount(template.id)} clinic(s)
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {template.is_default && (
                          <Badge variant="default">Default</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/admin/template-editor?templateId=${template.id}`)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDuplicateTemplate(template)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          {!template.is_default && getUsageCount(template.id) === 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteTemplate(template.id, template.is_default)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create Template Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
              <DialogDescription>
                Create a new PDF report template for your clinics
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="e.g., Modern Medical, Classic Report"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTemplateDescription}
                  onChange={(e) => setNewTemplateDescription(e.target.value)}
                  placeholder="Describe this template..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="copyFrom">Copy Settings From (Optional)</Label>
                <select
                  id="copyFrom"
                  className="w-full border border-input bg-background px-3 py-2 rounded-md"
                  value={copyFromTemplateId}
                  onChange={(e) => setCopyFromTemplateId(e.target.value)}
                >
                  <option value="">Start from scratch</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTemplate}>
                Create Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminTemplates;
