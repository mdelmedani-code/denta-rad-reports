import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Edit, Trash2, Save, Loader2, FileText, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TemplateIndication {
  id: string;
  indication_name: string;
  description: string;
  keywords: string[];
  template_id: string | null;
  created_at: string;
  updated_at: string;
  pdf_templates?: {
    id: string;
    name: string;
    company_name: string;
  };
}

interface PDFTemplate {
  id: string;
  name: string;
  company_name: string;
  indication_type: string | null;
  is_active: boolean;
}

const TemplateManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [indications, setIndications] = useState<TemplateIndication[]>([]);
  const [templates, setTemplates] = useState<PDFTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingIndication, setEditingIndication] = useState<TemplateIndication | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newIndication, setNewIndication] = useState({
    indication_name: '',
    description: '',
    keywords: '',
    template_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch indications with their assigned templates
      const { data: indicationsData, error: indicationsError } = await supabase
        .from('template_indications')
        .select(`
          *,
          pdf_templates:template_id(id, name, company_name)
        `)
        .order('indication_name');

      if (indicationsError) throw indicationsError;

      // Fetch all templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('pdf_templates')
        .select('id, name, company_name, indication_type, is_active')
        .order('name');

      if (templatesError) throw templatesError;

      setIndications(indicationsData || []);
      setTemplates(templatesData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load template management data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIndication = async (indication: TemplateIndication) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('template_indications')
        .update({
          description: indication.description,
          keywords: indication.keywords,
          template_id: indication.template_id || null
        })
        .eq('id', indication.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template indication updated successfully",
      });

      fetchData();
      setEditingIndication(null);
    } catch (error: any) {
      console.error('Error updating indication:', error);
      toast({
        title: "Error",
        description: "Failed to update template indication",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddIndication = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('template_indications')
        .insert({
          indication_name: newIndication.indication_name,
          description: newIndication.description,
          keywords: newIndication.keywords.split(',').map(k => k.trim()).filter(k => k),
          template_id: newIndication.template_id || null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "New template indication added successfully",
      });

      setShowAddDialog(false);
      setNewIndication({
        indication_name: '',
        description: '',
        keywords: '',
        template_id: ''
      });
      fetchData();
    } catch (error: any) {
      console.error('Error adding indication:', error);
      toast({
        title: "Error",
        description: "Failed to add template indication",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const testDetection = async (clinicalQuestion: string) => {
    try {
      const { data: indication } = await supabase.rpc(
        'detect_indication_from_clinical_question',
        { clinical_question: clinicalQuestion }
      );

      toast({
        title: "Detection Result",
        description: `Detected indication: ${indication}`,
      });
    } catch (error: any) {
      console.error('Error testing detection:', error);
      toast({
        title: "Error",
        description: "Failed to test indication detection",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/admin')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Template Management</h1>
              <p className="text-muted-foreground">Manage CBCT report templates by clinical indication</p>
            </div>
          </div>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Indication
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Template Indication</DialogTitle>
                <DialogDescription>
                  Create a new clinical indication with keywords for automatic template detection.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="indication_name">Indication Name</Label>
                  <Input
                    id="indication_name"
                    value={newIndication.indication_name}
                    onChange={(e) => setNewIndication(prev => ({ ...prev, indication_name: e.target.value }))}
                    placeholder="e.g., implant_planning"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newIndication.description}
                    onChange={(e) => setNewIndication(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g., Implant Planning and Assessment"
                  />
                </div>
                <div>
                  <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                  <Textarea
                    id="keywords"
                    value={newIndication.keywords}
                    onChange={(e) => setNewIndication(prev => ({ ...prev, keywords: e.target.value }))}
                    placeholder="e.g., implant, placement, bone density"
                  />
                </div>
                <div>
                  <Label htmlFor="template_id">Assigned Template (Optional)</Label>
                  <Select value={newIndication.template_id} onValueChange={(value) => setNewIndication(prev => ({ ...prev, template_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No specific template</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} ({template.company_name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddIndication} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Add Indication
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          {indications.map((indication) => (
            <Card key={indication.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Target className="h-5 w-5" />
                      <span>{indication.indication_name.replace('_', ' ').toUpperCase()}</span>
                    </CardTitle>
                    <CardDescription>{indication.description}</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingIndication(indication)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                      {indication.keywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Assigned Template</h4>
                    {indication.pdf_templates ? (
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">
                          {indication.pdf_templates.name} ({indication.pdf_templates.company_name})
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Uses default template</span>
                    )}
                  </div>

                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testDetection(`Patient needs ${indication.indication_name.replace('_', ' ')} assessment`)}
                    >
                      Test Detection
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {editingIndication && (
          <Dialog open={!!editingIndication} onOpenChange={() => setEditingIndication(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Template Indication</DialogTitle>
                <DialogDescription>
                  Modify the clinical indication settings and template assignment.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit_description">Description</Label>
                  <Input
                    id="edit_description"
                    value={editingIndication.description}
                    onChange={(e) => setEditingIndication(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_keywords">Keywords (comma-separated)</Label>
                  <Textarea
                    id="edit_keywords"
                    value={editingIndication.keywords.join(', ')}
                    onChange={(e) => setEditingIndication(prev => prev ? ({ 
                      ...prev, 
                      keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                    }) : null)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_template">Assigned Template</Label>
                  <Select 
                    value={editingIndication.template_id || ''} 
                    onValueChange={(value) => setEditingIndication(prev => prev ? ({ ...prev, template_id: value || null }) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No specific template</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} ({template.company_name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setEditingIndication(null)}>
                    Cancel
                  </Button>
                  <Button onClick={() => handleSaveIndication(editingIndication)} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default TemplateManagement;