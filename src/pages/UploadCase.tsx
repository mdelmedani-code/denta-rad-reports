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
import { uploadDICOMAndCreateCase, UploadProgress } from "@/services/dicomUploadService";

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
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [currentStep, setCurrentStep] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Files selected:', e.target.files);
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      console.log('Converting to array:', files.length, 'files');
      setSelectedFiles(files);
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Folder selected:', e.target.files);
    if (e.target.files && e.target.files.length > 0) {
      // Filter for DICOM files
      const allFiles = Array.from(e.target.files);
      const dicomFiles = allFiles.filter(file => 
        file.name.toLowerCase().endsWith('.dcm') || 
        file.type === 'application/dicom' ||
        file.name.toLowerCase().includes('dicom')
      );
      console.log('DICOM files found:', dicomFiles.length, 'out of', allFiles.length);
      setSelectedFiles(dicomFiles);
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
    setUploadProgress({ bytesUploaded: 0, bytesTotal: 0, percentage: 0, stage: 'uploading' });
    setCurrentStep("Preparing upload...");

    try {
      // Get user's clinic ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('clinic_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        throw new Error(`Database error: ${profileError.message}`);
      }
      
      if (!profile?.clinic_id) {
        throw new Error('Unable to determine clinic association. Please contact support.');
      }

      setUploadProgress({ bytesUploaded: 0, bytesTotal: 0, percentage: 10, stage: 'uploading' });
      setCurrentStep(`Uploading ${selectedFiles.length} files...`);
      console.log('=== UPLOADING USING NEW SERVICE ===');
      
      // Upload using new service
      const result = await uploadDICOMAndCreateCase(
        selectedFiles,
        {
          patientName: formData.patientName,
          patientInternalId: formData.patientInternalId,
          patientDob: formData.patientDob,
          clinicalQuestion: formData.clinicalQuestion,
          fieldOfView: formData.fieldOfView,
          urgency: formData.urgency,
          clinicId: profile.clinic_id
        },
        (progress) => {
          setUploadProgress(progress);
          setCurrentStep(
            progress.stage === 'uploading' ? 'Uploading files...' :
            progress.stage === 'processing' ? 'Processing with PACS...' :
            progress.stage === 'complete' ? 'Upload complete!' :
            'Upload failed'
          );
        }
      );
      
      if (!result.orthancResult.success) {
        throw new Error(`Upload failed: ${result.orthancResult.error}`);
      }

      console.log('Upload and case creation completed successfully:', result);
      
      setCurrentStep("Upload completed successfully!");

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
      setUploadProgress({ bytesUploaded: 0, bytesTotal: 0, percentage: 0, stage: 'error' });
      setCurrentStep("Upload failed");
      toast({
        title: "Upload Failed",
        description: error.message || "An error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setTimeout(() => {
        setUploadProgress(null);
        setCurrentStep("");
      }, 3000);
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
              <CardDescription>Select DICOM files to upload</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label htmlFor="file-upload" className="block text-sm font-medium text-foreground mb-2">
                    Select DICOM Files or Folder
                  </label>
                  <div className="flex flex-col space-y-2">
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".dcm,application/dicom"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                    <p className="text-xs text-muted-foreground">
                      Select individual DICOM files (Ctrl/Cmd+click for multiple)
                    </p>
                    
                    <div className="relative">
                      <input
                        id="folder-upload"
                        type="file"
                        {...({ webkitdirectory: "", directory: "" } as any)}
                        multiple
                        onChange={handleFolderChange}
                        className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/90"
                        style={{
                          WebkitAppearance: 'none',
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Choose Folder - Select an entire folder containing DICOM files
                      </p>
                    </div>
                  </div>
                  
                  {selectedFiles.length > 0 && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <h4 className="font-medium text-foreground mb-2">
                        Selected Files ({selectedFiles.length})
                      </h4>
                      <div className="max-h-32 overflow-y-auto">
                        {selectedFiles.slice(0, 10).map((file, index) => (
                          <p key={index} className="text-sm text-muted-foreground">
                            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </p>
                        ))}
                        {selectedFiles.length > 10 && (
                          <p className="text-sm text-muted-foreground font-medium">
                            ...and {selectedFiles.length - 10} more files
                          </p>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground mt-2">
                        Total size: {(selectedFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload Progress */}
          {uploading && uploadProgress && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Cloud className={`w-6 h-6 ${uploadProgress.stage === 'uploading' ? 'animate-pulse' : ''}`} />
                      <div>
                        <div className="text-lg font-medium">Upload in Progress</div>
                        <div className="text-sm text-muted-foreground">{currentStep}</div>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setUploading(false);
                        setUploadProgress(null);
                        setCurrentStep("");
                      }}
                      className="ml-4"
                    >
                      Cancel
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progress</span>
                      <span>{uploadProgress.percentage}%</span>
                    </div>
                    <Progress value={uploadProgress.percentage} className="w-full" />
                    {uploadProgress.bytesTotal > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {(uploadProgress.bytesUploaded / 1024 / 1024).toFixed(1)} MB / {(uploadProgress.bytesTotal / 1024 / 1024).toFixed(1)} MB
                      </div>
                    )}
                  </div>
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
              {uploading ? `Uploading... ${uploadProgress?.percentage || 0}%` : "Upload Case"}
            </Button>
          </div>

          {/* Debug Section - Only for Testing */}
          <Card className="border-dashed border-muted-foreground/30">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <h3 className="font-medium text-muted-foreground">🔧 Debug Tools (Testing Only)</h3>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        console.log('Getting PACS studies...');
                        const { data, error } = await supabase.functions.invoke('list-pacs-studies');
                        console.log('PACS studies result:', { data, error });
                        
                        if (error) {
                          toast({
                            title: "PACS Query Failed",
                            description: `Error: ${error.message}`,
                            variant: "destructive",
                          });
                        } else if (data?.success) {
                          toast({
                            title: "PACS Studies Found",
                            description: `Found ${data.totalStudies} studies in PACS`,
                          });
                        } else {
                          toast({
                            title: "Query Complete",
                            description: `${data?.totalStudies || 0} studies found`,
                          });
                        }
                      } catch (err) {
                        console.error('PACS query error:', err);
                        toast({
                          title: "PACS Query Error",
                          description: "Failed to query studies",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Check PACS Studies
                  </Button>
                </div>
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