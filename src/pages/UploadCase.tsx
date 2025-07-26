import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Upload, FileText, Calculator, ArrowLeft, FolderOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface PricingBreakdown {
  basePrice: number;
  fovSurcharge: number;
  urgencySurcharge: number;
  addons: { name: string; price: number }[];
  total: number;
}

const ADDON_PRICES = {
  implant_planning: 100,
  ian_nerve_tracing_left: 50,
  ian_nerve_tracing_right: 50,
};

const UploadCase = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
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
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploadMode, setUploadMode] = useState<'file' | 'folder'>('file');
  const [uploading, setUploading] = useState(false);
  const [isReupload, setIsReupload] = useState(false);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Load existing case data if in reupload mode
  useEffect(() => {
    const reuploadId = searchParams.get('reupload');
    if (reuploadId) {
      setIsReupload(true);
      setCaseId(reuploadId);
      loadExistingCaseData(reuploadId);
    }
  }, [searchParams]);

  const loadExistingCaseData = async (id: string) => {
    try {
      const { data: caseData, error } = await supabase
        .from('cases')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Pre-populate form with existing data
      setFormData({
        patientName: caseData.patient_name || "",
        patientInternalId: caseData.patient_internal_id || "",
        patientDob: caseData.patient_dob || "",
        clinicalQuestion: caseData.clinical_question || "",
        fieldOfView: caseData.field_of_view || "up_to_5x5",
        urgency: caseData.urgency || "standard",
        addons: [], // Reset addons as they're not stored in the database
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load case data: " + error.message,
        variant: "destructive",
      });
    }
  };

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
    if (uploadMode === 'file' && e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setSelectedFiles(null);
    } else if (uploadMode === 'folder' && e.target.files) {
      setSelectedFiles(e.target.files);
      setSelectedFile(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    
    if (uploadMode === 'file' && droppedFiles.length > 0) {
      // For file mode, take the first file
      setSelectedFile(droppedFiles[0]);
      setSelectedFiles(null);
    } else if (uploadMode === 'folder' && droppedFiles.length > 0) {
      // For folder mode, check if files have consistent folder structure
      const fileList = new DataTransfer();
      droppedFiles.forEach(file => fileList.items.add(file));
      setSelectedFiles(fileList.files);
      setSelectedFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submit button clicked');
    console.log('User:', user);
    console.log('Selected file:', selectedFile);
    console.log('Selected files:', selectedFiles);
    console.log('Form data:', formData);
    
    if (!user || (!selectedFile && !selectedFiles)) {
      console.log('Validation failed - missing user or files');
      return;
    }

    setUploading(true);

    try {
      let uploadPath: string;
      let uploadedFiles: string[] = [];

      if (uploadMode === 'folder' && selectedFiles) {
        // Upload multiple DICOM files from folder
        const folderName = `${user.id}/${Date.now()}`;
        
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${folderName}/${file.name}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('cbct-scans')
            .upload(fileName, file);

          if (uploadError) throw uploadError;
          uploadedFiles.push(uploadData.path);
        }
        
        uploadPath = folderName; // Store folder path as reference
      } else if (selectedFile) {
        // Upload single file
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('cbct-scans')
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;
        uploadPath = uploadData.path;
      } else {
        throw new Error('No file selected');
      }

      // Get user's clinic ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('clinic_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.clinic_id) {
        throw new Error('Unable to determine clinic association');
      }

      if (isReupload && caseId) {
        // Update existing case
        const { error: updateError } = await supabase
          .from('cases')
          .update({
            patient_name: formData.patientName,
            patient_internal_id: formData.patientInternalId || null,
            patient_dob: formData.patientDob || null,
            clinical_question: formData.clinicalQuestion,
            field_of_view: formData.fieldOfView,
            urgency: formData.urgency,
            file_path: uploadPath,
            status: 'uploaded', // Reset status back to uploaded
          })
          .eq('id', caseId);

        if (updateError) throw updateError;

        toast({
          title: "Case Updated Successfully",
          description: "File and case information have been updated.",
        });
      } else {
        // Create new case
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
            file_path: uploadPath,
          })
          .select()
          .single();

        if (caseError) throw caseError;

        // Handle ZIP extraction for single file uploads
        if (uploadMode === 'file' && selectedFile && selectedFile.name.toLowerCase().endsWith('.zip')) {
          toast({
            title: "Extracting DICOM files...",
            description: "Processing ZIP file to extract DICOM images.",
          });

          try {
            const { data: extractResult, error: extractError } = await supabase.functions
              .invoke('extract-dicom-zip', {
                body: {
                  caseId: caseData.id,
                  zipFilePath: uploadPath
                }
              });

            if (extractError) {
              console.error('Extract error:', extractError);
            } else if (extractResult?.success) {
              toast({
                title: "DICOM Files Extracted",
                description: `Successfully extracted ${extractResult.extractedCount} DICOM files.`,
              });
            }
          } catch (extractError) {
            console.error('ZIP extraction failed:', extractError);
            // Don't fail the upload, just log the error
          }
        }

        const fileCount = uploadMode === 'folder' ? selectedFiles?.length || 0 : 1;
        const fileText = uploadMode === 'folder' ? `${fileCount} DICOM files` : 'case';
        
        toast({
          title: "Case Uploaded Successfully", 
          description: `${fileText} submitted with estimated cost: £${pricing.total.toFixed(2)}. Invoice will be generated automatically.`,
        });
      }

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
              <h1 className="text-2xl font-bold text-foreground">
                {isReupload ? "Reupload Case" : "Upload New Case"}
              </h1>
              <p className="text-muted-foreground">
                {isReupload ? "Update file and case information" : "Submit a CBCT scan for analysis"}
              </p>
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
                  {/* Upload Mode Selection */}
                  <div className="mb-6">
                    <Label className="text-base font-medium mb-3 block">Upload Method</Label>
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant={uploadMode === 'file' ? 'default' : 'outline'}
                        onClick={() => {
                          setUploadMode('file');
                          setSelectedFile(null);
                          setSelectedFiles(null);
                        }}
                        className="flex-1"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload File
                      </Button>
                      <Button
                        type="button"
                        variant={uploadMode === 'folder' ? 'default' : 'outline'}
                        onClick={() => {
                          setUploadMode('folder');
                          setSelectedFile(null);
                          setSelectedFiles(null);
                        }}
                        className="flex-1"
                      >
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Upload Folder
                      </Button>
                    </div>
                  </div>

                  <div 
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      isDragOver 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {uploadMode === 'file' ? (
                      <Upload className={`w-8 h-8 mx-auto mb-4 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
                    ) : (
                      <FolderOpen className={`w-8 h-8 mx-auto mb-4 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="file-upload" className="cursor-pointer">
                        <span className="text-primary font-medium">
                          {uploadMode === 'file' ? 'Choose files to upload' : 'Choose folder to upload'}
                        </span>
                        <span className="text-muted-foreground"> or drag and drop</span>
                      </Label>
                      <Input
                        id="file-upload"
                        type="file"
                        onChange={handleFileChange}
                        accept={uploadMode === 'file' ? '.dcm,.zip,.rar,.7z' : '.dcm'}
                        {...(uploadMode === 'folder' ? { webkitdirectory: true, directory: true } : {})}
                        className="hidden"
                        required
                      />
                      <p className="text-sm text-muted-foreground">
                        {uploadMode === 'file' 
                          ? 'Supported formats: DICOM (.dcm), ZIP, RAR, 7Z'
                          : 'Select a folder containing DICOM (.dcm) files'
                        }
                      </p>
                      {isDragOver && (
                        <p className="text-sm text-primary font-medium">
                          Drop your {uploadMode === 'file' ? 'file' : 'files'} here
                        </p>
                      )}
                      {!isDragOver && uploadMode === 'file' && selectedFile && (
                        <p className="text-sm text-foreground font-medium">
                          Selected: {selectedFile.name}
                        </p>
                      )}
                      {!isDragOver && uploadMode === 'folder' && selectedFiles && (
                        <p className="text-sm text-foreground font-medium">
                          Selected: {selectedFiles.length} files from folder
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button 
                type="submit" 
                disabled={uploading || (!selectedFile && !selectedFiles) || !formData.patientName || !formData.clinicalQuestion}
                className="w-full"
              >
                {uploading ? "Uploading..." : isReupload ? "Update Case" : "Submit Case"}
              </Button>
              
              {/* Debug info */}
              <div className="text-xs text-muted-foreground mt-2 space-y-1">
                <div>Files selected: {selectedFile ? '✓ Single file' : selectedFiles ? `✓ ${selectedFiles.length} files` : '✗ No files'}</div>
                <div>Patient name: {formData.patientName ? '✓' : '✗ Required'}</div>
                <div>Clinical question: {formData.clinicalQuestion ? '✓' : '✗ Required'}</div>
              </div>
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