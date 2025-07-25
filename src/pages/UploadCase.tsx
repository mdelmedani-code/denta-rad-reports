import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Upload, FileText, Calculator, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface PricingBreakdown {
  basePrice: number;
  fovSurcharge: number;
  urgencySurcharge: number;
  addons: { name: string; price: number }[];
  total: number;
}

const ADDON_PRICES = {
  airway_analysis: 75,
  tmj_analysis: 100,
  implant_planning: 125,
  orthodontic_analysis: 85,
  pathology_screening: 60,
  ian_nerve_tracing_left: 50,
  ian_nerve_tracing_right: 50,
};

const UploadCase = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    patientName: "",
    patientInternalId: "",
    patientDob: "",
    clinicalQuestion: "",
    fieldOfView: "up_to_5x5" as "up_to_5x5" | "up_to_8x5" | "up_to_8x8" | "over_8x8",
    urgency: "standard" as "standard" | "urgent",
    addons: [] as string[],
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const calculatePricing = (): PricingBreakdown => {
    const basePrices = {
      up_to_5x5: 125,
      up_to_8x5: 145,
      up_to_8x8: 165,
      over_8x8: 185,
    };
    
    const basePrice = basePrices[formData.fieldOfView];
    const fovSurcharge = 0; // Price is already included in base price
    const subtotal = basePrice;
    const urgencySurcharge = formData.urgency === "urgent" ? 50 : 0;
    
    const addons = formData.addons.map(addon => ({
      name: addon.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
      price: ADDON_PRICES[addon as keyof typeof ADDON_PRICES] || 0,
    }));
    
    const addonTotal = addons.reduce((sum, addon) => sum + addon.price, 0);
    const total = subtotal + urgencySurcharge + addonTotal;
    
    return {
      basePrice,
      fovSurcharge,
      urgencySurcharge,
      addons,
      total,
    };
  };

  const pricing = calculatePricing();

  const handleAddonChange = (addonId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      addons: checked 
        ? [...prev.addons, addonId]
        : prev.addons.filter(id => id !== addonId)
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedFile) return;

    setUploading(true);

    try {
      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('cbct-scans')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get user's clinic ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('clinic_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.clinic_id) {
        throw new Error('Unable to determine clinic association');
      }

      // Create case record
      const { data: caseData, error: caseError } = await supabase
        .from('cases')
        .insert({
          patient_name: formData.patientName,
          patient_internal_id: formData.patientInternalId || null,
          patient_dob: formData.patientDob || null,
          clinical_question: formData.clinicalQuestion,
          field_of_view: formData.fieldOfView,
          urgency: formData.urgency,
          clinic_id: profile.clinic_id,
          file_path: uploadData.path,
        })
        .select()
        .single();

      if (caseError) throw caseError;

      toast({
        title: "Case Uploaded Successfully",
        description: `Case submitted with estimated cost: £${pricing.total.toFixed(2)}. Invoice will be generated automatically.`,
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/dashboard")}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Upload New Case</h1>
              <p className="text-muted-foreground">Submit a CBCT scan for analysis</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Patient Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Patient Information</CardTitle>
                  <CardDescription>
                    Enter the patient details for this case
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="patientName">Patient Name *</Label>
                      <Input
                        id="patientName"
                        value={formData.patientName}
                        onChange={(e) => setFormData(prev => ({ ...prev, patientName: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="patientInternalId">Patient ID (Optional)</Label>
                      <Input
                        id="patientInternalId"
                        value={formData.patientInternalId}
                        onChange={(e) => setFormData(prev => ({ ...prev, patientInternalId: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="patientDob">Date of Birth (Optional)</Label>
                    <Input
                      id="patientDob"
                      type="date"
                      value={formData.patientDob}
                      onChange={(e) => setFormData(prev => ({ ...prev, patientDob: e.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Clinical Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Clinical Information</CardTitle>
                  <CardDescription>
                    Provide details about the clinical case and scan requirements
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="clinicalQuestion">Clinical Question *</Label>
                    <Textarea
                      id="clinicalQuestion"
                      value={formData.clinicalQuestion}
                      onChange={(e) => setFormData(prev => ({ ...prev, clinicalQuestion: e.target.value }))}
                      placeholder="Describe the clinical question or reason for the CBCT scan..."
                      required
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fieldOfView">Field of View *</Label>
                       <Select 
                        value={formData.fieldOfView} 
                        onValueChange={(value: "up_to_5x5" | "up_to_8x5" | "up_to_8x8" | "over_8x8") => 
                          setFormData(prev => ({ ...prev, fieldOfView: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="up_to_5x5">Up to 5×5cm (£125)</SelectItem>
                          <SelectItem value="up_to_8x5">Up to 8×5cm (£145)</SelectItem>
                          <SelectItem value="up_to_8x8">Up to 8×8cm (£165)</SelectItem>
                          <SelectItem value="over_8x8">Over 8×8cm (£185)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="urgency">Urgency Level *</Label>
                      <Select 
                        value={formData.urgency} 
                        onValueChange={(value: "standard" | "urgent") => 
                          setFormData(prev => ({ ...prev, urgency: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard (3-5 working days)</SelectItem>
                          <SelectItem value="urgent">Priority 24h Service (+£50)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Add-on Services */}
              <Card>
                <CardHeader>
                  <CardTitle>Additional Analysis Services</CardTitle>
                  <CardDescription>
                    Select additional analysis services (optional)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(ADDON_PRICES).map(([id, price]) => (
                    <div key={id} className="flex items-center space-x-2">
                      <Checkbox
                        id={id}
                        checked={formData.addons.includes(id)}
                        onCheckedChange={(checked) => handleAddonChange(id, checked as boolean)}
                      />
                      <Label htmlFor={id} className="flex-1 cursor-pointer">
                        {id.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())} (+£{price})
                      </Label>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* File Upload */}
              <Card>
                <CardHeader>
                  <CardTitle>CBCT Scan Upload</CardTitle>
                  <CardDescription>
                    Upload the CBCT scan files
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                    <div className="space-y-2">
                      <Label htmlFor="file-upload" className="cursor-pointer">
                        <span className="text-primary font-medium">Choose files to upload</span>
                        <span className="text-muted-foreground"> or drag and drop</span>
                      </Label>
                      <Input
                        id="file-upload"
                        type="file"
                        onChange={handleFileChange}
                        accept=".dcm,.zip,.rar,.7z"
                        className="hidden"
                        required
                      />
                      <p className="text-sm text-muted-foreground">
                        Supported formats: DICOM (.dcm), ZIP, RAR, 7Z
                      </p>
                      {selectedFile && (
                        <p className="text-sm text-foreground font-medium">
                          Selected: {selectedFile.name}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button 
                type="submit" 
                disabled={uploading || !selectedFile || !formData.patientName || !formData.clinicalQuestion}
                className="w-full"
              >
                {uploading ? "Uploading..." : "Submit Case"}
              </Button>
            </form>
          </div>

          {/* Pricing Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="w-5 h-5 mr-2" />
                  Pricing Estimate
                </CardTitle>
                <CardDescription>
                  Cost breakdown for this case
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Base Analysis</span>
                    <span>£{pricing.basePrice.toFixed(2)}</span>
                  </div>
                  
                  {pricing.fovSurcharge > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Large FOV Surcharge</span>
                      <span>+£{pricing.fovSurcharge.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {pricing.urgencySurcharge > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Priority 24h Service</span>
                      <span>+£{pricing.urgencySurcharge.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {pricing.addons.map(addon => (
                    <div key={addon.name} className="flex justify-between text-sm">
                      <span>{addon.name}</span>
                      <span>+£{addon.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                
                <Separator />
                
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>£{pricing.total.toFixed(2)}</span>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <p>• Invoice will be automatically generated</p>
                  <p>• Payment terms: Net 30 days</p>
                  <p>• Analysis typically completed in 2-5 business days</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadCase;