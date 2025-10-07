import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileArchive, Files, Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import JSZip from "jszip";

type UploadMode = 'zip' | 'individual';

const UploadCase = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [uploadMode, setUploadMode] = useState<UploadMode>('zip');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [dicomFiles, setDicomFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processingFiles, setProcessingFiles] = useState(false);
  
  const [formData, setFormData] = useState({
    patientName: "",
    patientInternalId: "",
    patientDob: "",
    clinicalQuestion: "",
    fieldOfView: "up_to_5x5" as "up_to_5x5" | "up_to_8x5" | "up_to_8x8" | "over_8x8",
    urgency: "standard" as "standard" | "urgent"
  });

  const handleZipSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast({ 
        title: 'Invalid File', 
        description: 'Please select a ZIP file', 
        variant: 'destructive' 
      });
      return;
    }
    
    if (file.size > 500 * 1024 * 1024) {
      toast({ 
        title: 'File Too Large', 
        description: 'ZIP must be less than 500MB', 
        variant: 'destructive' 
      });
      return;
    }
    
    setZipFile(file);
  };

  const handleDicomFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const validFiles = files.filter(file => {
      const name = file.name.toLowerCase();
      return name.endsWith('.dcm') || name.endsWith('.dicom') || !name.includes('.');
    });
    
    if (validFiles.length === 0) {
      toast({ 
        title: 'No Valid Files', 
        description: 'Please select DICOM files (.dcm or .dicom)', 
        variant: 'destructive' 
      });
      return;
    }
    
    const totalSize = validFiles.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > 500 * 1024 * 1024) {
      toast({ 
        title: 'Files Too Large', 
        description: 'Total file size must be less than 500MB', 
        variant: 'destructive' 
      });
      return;
    }
    
    setDicomFiles(validFiles);
  };

  const createZipFromFiles = async (files: File[]): Promise<Blob> => {
    setProcessingFiles(true);
    try {
      const zip = new JSZip();
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filename = file.name.split('/').pop() || `slice_${i}.dcm`;
        zip.file(filename, file);
      }
      
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      return zipBlob;
    } finally {
      setProcessingFiles(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (uploadMode === 'zip' && !zipFile) {
      toast({ 
        title: 'No File', 
        description: 'Please select a ZIP file', 
        variant: 'destructive' 
      });
      return;
    }
    
    if (uploadMode === 'individual' && dicomFiles.length === 0) {
      toast({ 
        title: 'No Files', 
        description: 'Please select DICOM files', 
        variant: 'destructive' 
      });
      return;
    }
    
    if (!formData.patientName || !formData.clinicalQuestion) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in Patient Name and Clinical Question',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setUploading(true);
      
      // 1. Get user and clinic
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        throw new Error('Not authenticated');
      }
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('clinic_id')
        .eq('id', authUser.id)
        .single();
      
      if (profileError) throw profileError;
      if (!profile?.clinic_id) throw new Error('No clinic associated with your account');
      
      // 2. Create case record
      const { data: newCase, error: caseError } = await supabase
        .from('cases')
        .insert({
          clinic_id: profile.clinic_id,
          patient_name: formData.patientName,
          patient_internal_id: formData.patientInternalId || null,
          patient_dob: formData.patientDob || null,
          clinical_question: formData.clinicalQuestion,
          field_of_view: formData.fieldOfView,
          urgency: formData.urgency,
          status: 'uploaded'
        })
        .select()
        .single();
      
      if (caseError) throw caseError;
      
      // 3. Prepare ZIP
      let finalZipFile: File | Blob;
      let zipFilename: string;
      
      if (uploadMode === 'zip') {
        finalZipFile = zipFile!;
        zipFilename = zipFile!.name;
      } else {
        toast({ 
          title: 'Creating ZIP', 
          description: `Compressing ${dicomFiles.length} DICOM files...` 
        });
        const zipBlob = await createZipFromFiles(dicomFiles);
        finalZipFile = zipBlob;
        zipFilename = `case_${newCase.id}_dicom.zip`;
      }
      
      // 4. Upload to storage
      const zipPath = `${profile.clinic_id}/${newCase.id}/${zipFilename}`;
      const { error: uploadError } = await supabase.storage
        .from('cbct-scans')
        .upload(zipPath, finalZipFile, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        await supabase.from('cases').delete().eq('id', newCase.id);
        throw uploadError;
      }
      
      // 5. Update case with ZIP path
      const { error: updateError } = await supabase
        .from('cases')
        .update({
          file_path: zipPath
        })
        .eq('id', newCase.id);
      
      if (updateError) throw updateError;
      
      // 6. Trigger edge function to extract metadata
      const { error: functionError } = await supabase.functions.invoke('extract-dicom-zip', {
        body: {
          caseId: newCase.id,
          zipPath: zipPath
        }
      });
      
      if (functionError) {
        console.error('Edge function error:', functionError);
        // Don't fail - metadata extraction can be retried
      }
      
      toast({
        title: 'Upload Successful',
        description: 'DICOM files are being processed. You will be notified when ready.'
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
      setZipFile(null);
      setDicomFiles([]);
      
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Upload failed',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const canSubmit = !uploading && 
    !processingFiles &&
    formData.patientName.trim() !== '' && 
    formData.clinicalQuestion.trim() !== '' &&
    (uploadMode === 'zip' ? zipFile !== null : dicomFiles.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
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
          {/* Upload Mode Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Method</CardTitle>
              <CardDescription>Choose how you want to upload DICOM files</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setUploadMode('zip')}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    uploadMode === 'zip' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <FileArchive className="w-8 h-8 mb-2 mx-auto text-primary" />
                  <div className="font-semibold">Upload ZIP</div>
                  <div className="text-sm text-muted-foreground">Pre-packaged DICOM files</div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setUploadMode('individual')}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    uploadMode === 'individual' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Files className="w-8 h-8 mb-2 mx-auto text-primary" />
                  <div className="font-semibold">Select Files</div>
                  <div className="text-sm text-muted-foreground">Auto-zip individual DICOMs</div>
                </button>
              </div>
            </CardContent>
          </Card>

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
              <CardTitle>DICOM Files</CardTitle>
              <CardDescription>
                {uploadMode === 'zip' 
                  ? 'Select a ZIP file containing DICOM files' 
                  : 'Select individual DICOM files (will be auto-zipped)'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {uploadMode === 'zip' ? (
                <div>
                  <Input
                    type="file"
                    accept=".zip"
                    onChange={handleZipSelect}
                    className="cursor-pointer"
                  />
                  {zipFile && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <p className="font-medium">{zipFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(zipFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <Input
                    type="file"
                    multiple
                    accept=".dcm,.dicom"
                    onChange={handleDicomFilesSelect}
                    className="cursor-pointer"
                  />
                  {dicomFiles.length > 0 && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">
                        Selected Files ({dicomFiles.length})
                      </h4>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {dicomFiles.slice(0, 5).map((file, index) => (
                          <p key={index} className="text-sm text-muted-foreground">
                            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </p>
                        ))}
                        {dicomFiles.length > 5 && (
                          <p className="text-sm text-muted-foreground font-medium">
                            ...and {dicomFiles.length - 5} more files
                          </p>
                        )}
                      </div>
                      <p className="text-sm font-medium mt-2">
                        Total: {(dicomFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-2">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900 dark:text-blue-100">
                    <p className="font-medium mb-1">File Requirements:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Maximum file size: 500MB</li>
                      <li>Accepted formats: .dcm, .dicom, or ZIP archives</li>
                      <li>Individual files will be automatically compressed into a ZIP</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full md:w-auto px-8"
            >
              {processingFiles ? 'Creating ZIP...' : uploading ? 'Uploading...' : 'Upload Case'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadCase;
