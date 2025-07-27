import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, ArrowLeft, Cloud } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

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
    urgency: "standard" as "standard" | "urgent"
  });
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Files selected:', e.target.files);
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      console.log('Converting to array:', files.length, 'files');
      setSelectedFiles(files);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== STARTING UPLOAD ===');
    console.log('User:', user?.id);
    console.log('Files:', selectedFiles.length);
    console.log('Form data:', formData);

    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to upload files",
        variant: "destructive",
      });
      return;
    }

    if (selectedFiles.length === 0) {
      toast({
        title: "Error", 
        description: "Please select files to upload",
        variant: "destructive",
      });
      return;
    }

    if (!formData.patientName || !formData.clinicalQuestion) {
      toast({
        title: "Error",
        description: "Please fill in Patient Name and Clinical Question",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      // Get user's clinic ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('clinic_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.clinic_id) {
        throw new Error('Unable to determine clinic association');
      }

      setUploadProgress(20);

      // Step 1: Upload to PACS server first
      let pacsSuccess = false;
      let pacsStudyUID = null;
      
      try {
        console.log('=== UPLOADING TO PACS SERVER ===');
        setUploadProgress(25);
        
        // Upload only the first file to PACS for now (to test connectivity)
        if (selectedFiles.length > 0) {
          const file = selectedFiles[0];
          console.log(`Uploading to PACS: ${file.name}`);
          
          // Convert file to base64 for the edge function
          const fileBuffer = await file.arrayBuffer();
          const bytes = new Uint8Array(fileBuffer);
          let binary = '';
          const chunkSize = 8192;
          
          for (let j = 0; j < bytes.length; j += chunkSize) {
            const chunk = bytes.slice(j, j + chunkSize);
            binary += String.fromCharCode.apply(null, Array.from(chunk));
          }
          
          const base64File = btoa(binary);
          
          console.log('Invoking orthanc-proxy function...');
          
          // Upload to PACS via edge function with timeout
          const { data: pacsData, error: pacsError } = await supabase.functions.invoke('orthanc-proxy', {
            body: {
              fileName: file.name,
              fileData: base64File,
              contentType: file.type || 'application/dicom'
            }
          });
          
          console.log('PACS response received:', { data: pacsData, error: pacsError });
          
          if (pacsError) {
            console.error('PACS upload error details:', pacsError);
            throw new Error(`PACS Error: ${pacsError.message || 'Unknown error'}`);
          }
          
          if (pacsData) {
            pacsSuccess = true;
            pacsStudyUID = pacsData.StudyInstanceUID || pacsData.ParentStudy || pacsData.ID;
            console.log('PACS upload successful:', pacsData);
            
            toast({
              title: "PACS Upload Complete",
              description: "Files successfully uploaded to imaging server",
            });
          }
        }
        
        setUploadProgress(50);
        
      } catch (pacsError) {
        console.error('PACS upload failed:', pacsError);
        toast({
          title: "PACS Upload Failed", 
          description: `PACS server error: ${pacsError instanceof Error ? pacsError.message : 'Connection failed'}. Continuing with local storage.`,
          variant: "destructive",
        });
      }

      // Step 2: Upload to Supabase storage (backup)
      console.log('=== UPLOADING TO SUPABASE STORAGE ===');
      const uploadedFiles: string[] = [];
      const folderName = `${user.id}/${Date.now()}`;

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        console.log(`Uploading to storage: ${file.name}`);
        
        const fileName = `${folderName}/${file.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('cbct-scans')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw uploadError;
        }

        uploadedFiles.push(uploadData.path);
        setUploadProgress(50 + (35 * (i + 1)) / selectedFiles.length);
      }

      console.log('Supabase storage upload complete');
      setUploadProgress(85);

      // Create case in database
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
          file_path: folderName,
          status: 'uploaded'
        })
        .select()
        .single();

      if (caseError) {
        console.error('Case creation error:', caseError);
        throw caseError;
      }

      setUploadProgress(100);

      console.log('Case created successfully:', caseData.id);

      toast({
        title: "Success!",
        description: `Case uploaded successfully. ${selectedFiles.length} files processed.`,
      });

      // Reset form
      setFormData({
        patientName: "",
        patientInternalId: "",
        patientDob: "",
        clinicalQuestion: "",
        fieldOfView: "up_to_5x5",
        urgency: "standard"
      });
      setSelectedFiles([]);
      
      // Navigate to dashboard after short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error: any) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "An error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const canSubmit = !uploading && 
    selectedFiles.length > 0 && 
    formData.patientName.trim() !== '' && 
    formData.clinicalQuestion.trim() !== '';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Upload New Case</h1>
          <p className="text-muted-foreground">Upload DICOM files for radiological analysis</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Information */}
          <Card>
            <CardHeader>
              <CardTitle>Patient Information</CardTitle>
              <CardDescription>Basic patient details for this case</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="patientName">Patient Name *</Label>
                  <Input
                    id="patientName"
                    value={formData.patientName}
                    onChange={(e) => setFormData(prev => ({ ...prev, patientName: e.target.value }))}
                    placeholder="Enter patient name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="patientInternalId">Patient ID (Optional)</Label>
                  <Input
                    id="patientInternalId"
                    value={formData.patientInternalId}
                    onChange={(e) => setFormData(prev => ({ ...prev, patientInternalId: e.target.value }))}
                    placeholder="Internal patient ID"
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
              <CardDescription>Details about the scan and clinical requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="clinicalQuestion">Clinical Question *</Label>
                <Textarea
                  id="clinicalQuestion"
                  value={formData.clinicalQuestion}
                  onChange={(e) => setFormData(prev => ({ ...prev, clinicalQuestion: e.target.value }))}
                  placeholder="Describe the clinical question or indication for this scan"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fieldOfView">Field of View</Label>
                  <Select
                    value={formData.fieldOfView}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, fieldOfView: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="up_to_5x5">Up to 5x5 cm</SelectItem>
                      <SelectItem value="up_to_8x5">Up to 8x5 cm</SelectItem>
                      <SelectItem value="up_to_8x8">Up to 8x8 cm</SelectItem>
                      <SelectItem value="over_8x8">Over 8x8 cm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="urgency">Urgency</Label>
                  <Select
                    value={formData.urgency}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, urgency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard (3-5 days)</SelectItem>
                      <SelectItem value="urgent">Urgent (24 hours)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle>File Upload</CardTitle>
              <CardDescription>Select DICOM files or ZIP archives to upload</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fileInput" className="cursor-pointer">
                      <Button type="button" variant="outline" asChild>
                        <span>Choose Files</span>
                      </Button>
                    </Label>
                    <Input
                      id="fileInput"
                      type="file"
                      onChange={handleFileChange}
                      accept=".dcm,.zip,.rar"
                      multiple
                      className="hidden"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Supported: DICOM files (.dcm), ZIP archives (.zip, .rar)
                  </p>
                  {selectedFiles.length > 0 && (
                    <div className="text-sm text-foreground">
                      <p className="font-medium">Selected: {selectedFiles.length} file(s)</p>
                      <div className="max-h-32 overflow-y-auto mt-2 text-xs text-muted-foreground">
                        {selectedFiles.map((file, index) => (
                          <div key={index}>{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload Progress */}
          {uploading && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Upload Progress</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full md:w-auto px-8"
            >
              <Cloud className="w-4 h-4 mr-2" />
              {uploading ? `Uploading... ${uploadProgress}%` : "Upload Case"}
            </Button>
          </div>

          {/* PACS Connection Test */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <h3 className="font-medium">PACS Server Test</h3>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    try {
                      console.log('Testing PACS connection...');
                      const { data, error } = await supabase.functions.invoke('test-orthanc-connection');
                      console.log('PACS test result:', { data, error });
                      
                      if (error) {
                        toast({
                          title: "PACS Test Failed",
                          description: `Error: ${error.message}`,
                          variant: "destructive",
                        });
                      } else if (data?.success) {
                        toast({
                          title: "PACS Test Successful",
                          description: "Connection to Orthanc server is working",
                        });
                      } else {
                        toast({
                          title: "PACS Test Failed",
                          description: `Server returned status ${data?.status}`,
                          variant: "destructive",
                        });
                      }
                    } catch (err) {
                      console.error('PACS test error:', err);
                      toast({
                        title: "PACS Test Error",
                        description: "Failed to test connection",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Test PACS Connection
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Debug Info */}
          <div className="text-xs text-muted-foreground border rounded p-2 space-y-1">
            <div><strong>Debug Info:</strong></div>
            <div>Files: {selectedFiles.length > 0 ? `✓ ${selectedFiles.length} files` : '✗ No files'}</div>
            <div>Patient Name: {formData.patientName ? '✓ ' + formData.patientName : '✗ Required'}</div>
            <div>Clinical Question: {formData.clinicalQuestion ? '✓ Provided' : '✗ Required'}</div>
            <div>Can Submit: {canSubmit ? '✓ Ready' : '✗ Missing requirements'}</div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadCase;