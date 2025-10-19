import { useState, useEffect } from "react";
import { PDFViewer } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ModernReportPDF } from "@/components/reports/ModernReportPDF";
import { usePDFTemplate, useUpdateClinicBranding, useUpdateTemplate } from "@/hooks/usePDFTemplate";
import { supabase } from "@/integrations/supabase/client";
import { Upload, RotateCcw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function TemplateEditor() {
  const { user } = useAuth();
  const [clinicId, setClinicId] = useState<string>();

  useEffect(() => {
    const fetchClinicId = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("profiles")
        .select("clinic_id")
        .eq("id", user.id)
        .single();
      
      if (data?.clinic_id) {
        setClinicId(data.clinic_id);
      }
    };
    
    fetchClinicId();
  }, [user]);
  
  const { data, isLoading } = usePDFTemplate(clinicId);
  const updateBranding = useUpdateClinicBranding();
  const updateTemplate = useUpdateTemplate();

  const [branding, setBranding] = useState({
    logo_url: "",
    primary_color: "#1e40af",
    secondary_color: "#3b82f6",
    accent_color: "#60a5fa",
    header_text: "",
    footer_text: "",
  });

  const [templateData, setTemplateData] = useState({
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
  });

  // Sample data for preview
  const sampleData = {
    patientName: "John Doe",
    patientDob: "1980-05-15",
    patientId: "P12345",
    clinicName: "Sample Dental Clinic",
    reportDate: new Date().toLocaleDateString(),
    clinicalQuestion: "Evaluation of mandibular third molar positioning and potential impaction.",
    findings:
      "The CBCT scan demonstrates a horizontally impacted lower right third molar (#48). The crown is positioned mesially against the distal aspect of the second molar. The inferior alveolar nerve canal is in close proximity to the apices of the third molar roots, with approximately 1mm separation.",
    impression:
      "Horizontally impacted mandibular third molar with close proximity to inferior alveolar nerve canal. Risk of nerve injury during extraction is moderate to high.",
    recommendations: [
      "Surgical extraction by experienced oral surgeon recommended",
      "Pre-operative counseling regarding risk of temporary or permanent nerve damage",
      "Consider coronectomy technique if nerve separation cannot be achieved safely",
      "Post-operative follow-up in 1 week",
    ],
    images: [
      {
        url: "https://via.placeholder.com/400x300/3b82f6/ffffff?text=Axial+View",
        caption: "Axial view showing tooth positioning",
      },
      {
        url: "https://via.placeholder.com/400x300/60a5fa/ffffff?text=Sagittal+View",
        caption: "Sagittal reconstruction",
      },
    ],
    reporterName: "Dr. Sample Reporter",
    caseId: "CASE-001",
  };

  useEffect(() => {
    if (data) {
      if (data.branding) {
        setBranding({
          logo_url: data.branding.logo_url || "",
          primary_color: data.branding.primary_color,
          secondary_color: data.branding.secondary_color,
          accent_color: data.branding.accent_color,
          header_text: data.branding.header_text || "",
          footer_text: data.branding.footer_text || "",
        });
      }
      if (data.template) {
        setTemplateData(data.template.template_data);
      }
    }
  }, [data]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${clinicId}-logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("reports")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("reports").getPublicUrl(filePath);

      setBranding((prev) => ({ ...prev, logo_url: publicUrl }));
      toast.success("Logo uploaded successfully");
    } catch (error: any) {
      toast.error("Failed to upload logo: " + error.message);
    }
  };

  const handleSave = async () => {
    if (!clinicId) {
      toast.error("No clinic ID found");
      return;
    }

    try {
      await updateBranding.mutateAsync({
        ...branding,
        clinic_id: clinicId!,
        template_id: data?.template.id || null,
        id: data?.branding?.id || "",
        created_at: data?.branding?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (data?.template.id) {
        await updateTemplate.mutateAsync({
          id: data.template.id,
          template_data: templateData,
        });
      }
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    }
  };

  const handleReset = () => {
    if (data) {
      if (data.branding) {
        setBranding({
          logo_url: data.branding.logo_url || "",
          primary_color: data.branding.primary_color,
          secondary_color: data.branding.secondary_color,
          accent_color: data.branding.accent_color,
          header_text: data.branding.header_text || "",
          footer_text: data.branding.footer_text || "",
        });
      }
      if (data.template) {
        setTemplateData(data.template.template_data);
      }
      toast.info("Reset to saved settings");
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading template...</div>;
  }

  return (
    <div className="h-screen flex">
      {/* Live Preview - Left Side */}
      <div className="flex-1 p-4 overflow-auto bg-muted">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Template Preview</h1>
          <div className="bg-white rounded-lg shadow-lg" style={{ height: "800px" }}>
            <PDFViewer width="100%" height="100%">
              <ModernReportPDF
                reportData={sampleData}
                template={templateData}
                branding={
                  data?.branding
                    ? {
                        ...data.branding,
                        ...branding,
                      }
                    : {
                        id: "",
                        clinic_id: clinicId || "",
                        ...branding,
                        template_id: null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      }
                }
              />
            </PDFViewer>
          </div>
        </div>
      </div>

      {/* Customization Panel - Right Side */}
      <div className="w-[350px] border-l overflow-auto">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Customize Template</h2>
            <Button variant="ghost" size="icon" onClick={handleReset} title="Reset to Saved">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Branding Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Branding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Logo</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="flex-1"
                  />
                  <Upload className="h-4 w-4 mt-2" />
                </div>
                {branding.logo_url && (
                  <img
                    src={branding.logo_url}
                    alt="Logo preview"
                    className="mt-2 h-16 object-contain"
                  />
                )}
              </div>

              <div>
                <Label>Primary Color</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    type="color"
                    value={branding.primary_color}
                    onChange={(e) =>
                      setBranding((prev) => ({ ...prev, primary_color: e.target.value }))
                    }
                    className="w-16 h-10"
                  />
                  <Input
                    value={branding.primary_color}
                    onChange={(e) =>
                      setBranding((prev) => ({ ...prev, primary_color: e.target.value }))
                    }
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label>Secondary Color</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    type="color"
                    value={branding.secondary_color}
                    onChange={(e) =>
                      setBranding((prev) => ({ ...prev, secondary_color: e.target.value }))
                    }
                    className="w-16 h-10"
                  />
                  <Input
                    value={branding.secondary_color}
                    onChange={(e) =>
                      setBranding((prev) => ({ ...prev, secondary_color: e.target.value }))
                    }
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label>Accent Color</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    type="color"
                    value={branding.accent_color}
                    onChange={(e) =>
                      setBranding((prev) => ({ ...prev, accent_color: e.target.value }))
                    }
                    className="w-16 h-10"
                  />
                  <Input
                    value={branding.accent_color}
                    onChange={(e) =>
                      setBranding((prev) => ({ ...prev, accent_color: e.target.value }))
                    }
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label>Header Text (Optional)</Label>
                <Input
                  value={branding.header_text}
                  onChange={(e) =>
                    setBranding((prev) => ({ ...prev, header_text: e.target.value }))
                  }
                  placeholder="e.g., Professional Diagnostic Imaging"
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Footer Text (Optional)</Label>
                <Input
                  value={branding.footer_text}
                  onChange={(e) =>
                    setBranding((prev) => ({ ...prev, footer_text: e.target.value }))
                  }
                  placeholder="e.g., 123 Medical St, London"
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Sections Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Report Sections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {templateData.sections.map((section) => (
                <div key={section.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={section.enabled}
                    onCheckedChange={(checked) =>
                      setTemplateData((prev) => ({
                        ...prev,
                        sections: prev.sections.map((s) =>
                          s.id === section.id ? { ...s, enabled: checked as boolean } : s
                        ),
                      }))
                    }
                  />
                  <Label className="text-sm">{section.label}</Label>
                </div>
              ))}
            </CardContent>
          </Card>

          <Separator />

          {/* Typography Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Typography</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Heading Size: {templateData.typography.headingSize}px</Label>
                <Slider
                  min={14}
                  max={24}
                  step={1}
                  value={[templateData.typography.headingSize]}
                  onValueChange={([value]) =>
                    setTemplateData((prev) => ({
                      ...prev,
                      typography: { ...prev.typography, headingSize: value },
                    }))
                  }
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Subheading Size: {templateData.typography.subheadingSize}px</Label>
                <Slider
                  min={12}
                  max={18}
                  step={1}
                  value={[templateData.typography.subheadingSize]}
                  onValueChange={([value]) =>
                    setTemplateData((prev) => ({
                      ...prev,
                      typography: { ...prev.typography, subheadingSize: value },
                    }))
                  }
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Body Size: {templateData.typography.bodySize}px</Label>
                <Slider
                  min={9}
                  max={14}
                  step={1}
                  value={[templateData.typography.bodySize]}
                  onValueChange={([value]) =>
                    setTemplateData((prev) => ({
                      ...prev,
                      typography: { ...prev.typography, bodySize: value },
                    }))
                  }
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Caption Size: {templateData.typography.captionSize}px</Label>
                <Slider
                  min={7}
                  max={11}
                  step={1}
                  value={[templateData.typography.captionSize]}
                  onValueChange={([value]) =>
                    setTemplateData((prev) => ({
                      ...prev,
                      typography: { ...prev.typography, captionSize: value },
                    }))
                  }
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Layout Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Layout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Top Margin: {templateData.margins.top}px</Label>
                <Slider
                  min={30}
                  max={150}
                  step={5}
                  value={[templateData.margins.top]}
                  onValueChange={([value]) =>
                    setTemplateData((prev) => ({
                      ...prev,
                      margins: { ...prev.margins, top: value },
                    }))
                  }
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Bottom Margin: {templateData.margins.bottom}px</Label>
                <Slider
                  min={30}
                  max={100}
                  step={5}
                  value={[templateData.margins.bottom]}
                  onValueChange={([value]) =>
                    setTemplateData((prev) => ({
                      ...prev,
                      margins: { ...prev.margins, bottom: value },
                    }))
                  }
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Side Margins: {templateData.margins.left}px</Label>
                <Slider
                  min={30}
                  max={80}
                  step={5}
                  value={[templateData.margins.left]}
                  onValueChange={([value]) =>
                    setTemplateData((prev) => ({
                      ...prev,
                      margins: { ...prev.margins, left: value, right: value },
                    }))
                  }
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Header Height: {templateData.headerHeight}px</Label>
                <Slider
                  min={60}
                  max={120}
                  step={5}
                  value={[templateData.headerHeight]}
                  onValueChange={([value]) =>
                    setTemplateData((prev) => ({ ...prev, headerHeight: value }))
                  }
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Footer Height: {templateData.footerHeight}px</Label>
                <Slider
                  min={40}
                  max={80}
                  step={5}
                  value={[templateData.footerHeight]}
                  onValueChange={([value]) =>
                    setTemplateData((prev) => ({ ...prev, footerHeight: value }))
                  }
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button onClick={handleSave} className="w-full" disabled={updateBranding.isPending}>
              Save Template
            </Button>
            <Button variant="outline" onClick={handleReset} className="w-full">
              Reset to Saved
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}