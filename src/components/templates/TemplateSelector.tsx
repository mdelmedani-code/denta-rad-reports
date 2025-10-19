import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Sparkles, AlertCircle } from "lucide-react";
import { ReportTemplate, suggestTemplate, replaceTemplateVariables, trackTemplateUsage } from "@/services/templateService";
import { useReportTemplates } from "@/hooks/useReportTemplates";
import { useToast } from "@/hooks/use-toast";

interface TemplateSelectorProps {
  caseData: {
    patient_name: string;
    patient_dob: string | null;
    patient_internal_id: string | null;
    clinical_question: string;
    field_of_view: string;
    clinics: {
      name: string;
    };
  };
  onTemplateLoad: (content: {
    clinicalHistory?: string;
    imagingTechnique?: string;
    findings: string;
    impression: string;
    recommendations?: string;
  }) => void;
  disabled?: boolean;
}

export const TemplateSelector = ({ caseData, onTemplateLoad, disabled }: TemplateSelectorProps) => {
  const { templates, loading } = useReportTemplates();
  const { toast } = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [suggestedTemplate, setSuggestedTemplate] = useState<ReportTemplate | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  useEffect(() => {
    // Get suggested template based on clinical question
    const getSuggestion = async () => {
      if (caseData.clinical_question) {
        const suggestion = await suggestTemplate(caseData.clinical_question);
        setSuggestedTemplate(suggestion);
      }
    };
    getSuggestion();
  }, [caseData.clinical_question]);

  const handleLoadTemplate = async (templateId: string) => {
    if (!templateId || disabled) return;

    setLoadingTemplate(true);
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Replace variables in all sections
      const replacedContent = {
        clinicalHistory: template.clinical_history_template 
          ? replaceTemplateVariables(template.clinical_history_template, caseData)
          : undefined,
        imagingTechnique: template.imaging_technique_template
          ? replaceTemplateVariables(template.imaging_technique_template, caseData)
          : undefined,
        findings: replaceTemplateVariables(template.findings_template, caseData),
        impression: replaceTemplateVariables(template.impression_template, caseData),
        recommendations: template.recommendations_template
          ? replaceTemplateVariables(template.recommendations_template, caseData)
          : undefined,
      };

      // Track usage
      await trackTemplateUsage(templateId);

      // Load into report form
      onTemplateLoad(replacedContent);

      toast({
        title: 'Template Loaded',
        description: 'Template loaded successfully. Edit as needed for this case.',
      });
    } catch (error) {
      console.error('Error loading template:', error);
      toast({
        title: 'Error',
        description: 'Failed to load template',
        variant: 'destructive',
      });
    } finally {
      setLoadingTemplate(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-primary" />
          Load Report Template (Optional)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestedTemplate && (
          <Alert className="bg-amber-50 border-amber-200">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <span className="font-semibold">Suggested: </span>
                {suggestedTemplate.name}
                {suggestedTemplate.is_default && (
                  <Badge variant="secondary" className="ml-2">Default</Badge>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleLoadTemplate(suggestedTemplate.id)}
                disabled={disabled || loadingTemplate}
                className="ml-4"
              >
                Load This Template
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Select
            value={selectedTemplateId}
            onValueChange={setSelectedTemplateId}
            disabled={disabled || loadingTemplate}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select template or start blank" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="blank">Start Blank (No Template)</SelectItem>
              
              {templates.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Available Templates
                  </div>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        {template.name}
                        {template.is_default && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>

          {selectedTemplateId && selectedTemplateId !== 'blank' && (
            <Button
              onClick={() => handleLoadTemplate(selectedTemplateId)}
              disabled={disabled || loadingTemplate}
              className="w-full"
            >
              {loadingTemplate ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Loading Template...
                </>
              ) : (
                'Load Selected Template'
              )}
            </Button>
          )}
        </div>

        <Alert variant="default" className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Templates are starting points - edit the text as needed for each case.
            Variables like patient name and date will be automatically filled.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
