import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileArchive, Files, Info, CheckCircle2, Upload, Activity, Clock, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import JSZip from "jszip";
import { validateDICOMZip, getReadableFileSize } from "@/services/fileValidationService";
import { getCSRFToken } from "@/utils/csrf";
import { sanitizePatientRef, sanitizeText } from "@/utils/sanitization";
import { logCaseCreation } from "@/lib/auditLog";
import { Progress } from "@/components/ui/progress";

type UploadMode = 'zip' | 'individual';

const UploadCase = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [uploadMode, setUploadMode] = useState<UploadMode>('zip');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [dicomFiles, setDicomFiles] = useState<File[]>([]);
  const [processingFiles, setProcessingFiles] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);
  const [createdSimpleId, setCreatedSimpleId] = useState<string | null>(null);
  const [createdPatientName, setCreatedPatientName] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [formData, setFormData] = useState({
    patientName: "",
    patientInternalId: "",
    patientDob: "",
    clinicalQuestion: "",
    fieldOfView: "up_to_5x5" as "up_to_5x5" | "up_to_8x5" | "up_to_8x8" | "over_8x8",
    urgency: "standard" as "standard" | "urgent"
  });

  const [validating, setValidating] = useState(false);

  const handleZipSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setValidating(true);
    try {
      const validation = await validateDICOMZip(file);
      
      if (!validation.valid) {
        toast({
          title: 'Invalid File',
          description: validation.error,
          variant: 'destructive',
          duration: 8000
        });
        
        e.target.value = '';
        setZipFile(null);
        return;
      }

      if (validation.warnings && validation.warnings.length > 0) {
        toast({
          title: 'File Validation Warnings',
          description: validation.warnings.join('. '),
          variant: 'default',
          duration: 6000
        });
      }

      setZipFile(file);
      
      const statsMessage = validation.stats 
        ? `Contains ${validation.stats.dicomFiles} DICOM files (${validation.stats.totalFiles} total files)`
        : '';
      
      toast({
        title: 'File Validated Successfully',
        description: `${file.name} (${getReadableFileSize(file.size)}) is ready to upload. ${statsMessage}`,
      });
      
    } catch (error) {
      console.error('File validation error:', error);
      toast({
        title: 'Validation Error',
        description: 'Failed to validate file. Please try again.',
        variant: 'destructive'
      });
      
      e.target.value = '';
      setZipFile(null);
    } finally {
      setValidating(false);
    }
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

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const validFiles = files.filter(file => {
      const name = file.name.toLowerCase();
      return name.endsWith('.dcm') || name.endsWith('.dicom') || !name.includes('.');
    });
    
    if (validFiles.length === 0) {
      toast({ 
        title: 'No Valid DICOM Files', 
        description: 'No DICOM files found in selected folder', 
        variant: 'destructive' 
      });
      return;
    }
    
    const totalSize = validFiles.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > 500 * 1024 * 1024) {
      toast({ 
        title: 'Files Too Large', 
        description: 'Total folder size must be less than 500MB', 
        variant: 'destructive' 
      });
      return;
    }
    
    toast({
      title: 'Folder Selected',
      description: `Found ${validFiles.length} DICOM files in folder`
    });
    
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

  const generateFolderName = async (patientName: string, patientId: string): Promise<string> => {
    // Sanitize name: uppercase, remove special chars, replace spaces with underscores
    const cleanName = patientName
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .trim();

    // Get highest counter for this patient
    const { data: existingCases } = await supabase
      .from('cases')
      .select('folder_name')
      .ilike('folder_name', `${cleanName}_%`)
      .order('created_at', { ascending: false });

    let maxCounter = 0;
    if (existingCases && existingCases.length > 0) {
      for (const c of existingCases) {
        const match = c.folder_name?.match(/_(\d{5})$/);
        if (match) {
          const counter = parseInt(match[1], 10);
          if (counter > maxCounter) maxCounter = counter;
        }
      }
    }

    const newCounter = maxCounter + 1;
    const paddedCounter = String(newCounter).padStart(5, '0');
    
    return `${cleanName}_${paddedCounter}`;
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

    // Validate file size
    const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
    const MIN_FILE_SIZE = 1024; // 1KB
    
    const fileToValidate = uploadMode === 'zip' ? zipFile : null;
    if (fileToValidate) {
      if (fileToValidate.size > MAX_FILE_SIZE) {
        toast({
          title: 'File Too Large',
          description: 'Maximum file size: 2GB',
          variant: 'destructive'
        });
        return;
      }
      
      if (fileToValidate.size < MIN_FILE_SIZE) {
        toast({
          title: 'File Too Small',
          description: 'Please upload a valid CBCT scan',
          variant: 'destructive'
        });
        return;
      }
    }
    
    // Sanitize inputs
    const sanitizedPatientName = sanitizeText(formData.patientName);
    const sanitizedPatientInternalId = formData.patientInternalId ? sanitizePatientRef(formData.patientInternalId) : '';
    const sanitizedClinicalQuestion = sanitizeText(formData.clinicalQuestion);
    
    if (!sanitizedPatientName || !sanitizedClinicalQuestion) {
      toast({
        title: 'Invalid Input',
        description: 'Patient Name and Clinical Question contain invalid characters',
        variant: 'destructive'
      });
      return;
    }
    
    let createdCase: any = null;
    
    try {
      setUploading(true);
      setUploadProgress(0);
      setUploadSuccess(false);
      setCreatedPatientName(sanitizedPatientName);
      
      // Get user and clinic
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
      
      // Generate unique folder name
      const folderName = await generateFolderName(sanitizedPatientName, sanitizedPatientInternalId || 'UNKNOWN');
      
      // Create case record
      const { data: newCase, error: caseError } = await supabase
        .from('cases')
        .insert({
          clinic_id: profile.clinic_id,
          patient_name: sanitizedPatientName,
          patient_internal_id: sanitizedPatientInternalId || null,
          patient_dob: formData.patientDob || null,
          clinical_question: sanitizedClinicalQuestion,
          field_of_view: formData.fieldOfView,
          urgency: formData.urgency,
          folder_name: folderName,
          status: 'uploaded'
        })
        .select()
        .single();
      
      if (caseError) throw caseError;
      
      createdCase = newCase;
      setCreatedCaseId(newCase.id);
      setCreatedSimpleId(String(newCase.simple_id).padStart(5, '0'));
      
      setUploadProgress(20);
      
      // Prepare ZIP file
      let finalZipFile: File | Blob;
      let zipFilename: string;
      
      if (uploadMode === 'zip') {
        finalZipFile = zipFile!;
        zipFilename = 'scan.zip';
      } else {
        sonnerToast.info(`Compressing ${dicomFiles.length} DICOM files...`);
        const zipBlob = await createZipFromFiles(dicomFiles);
        finalZipFile = zipBlob;
        zipFilename = 'scan.zip';
      }
      
      setUploadProgress(40);
      
      // Upload to Supabase Storage
      const storagePath = `${folderName}/${zipFilename}`;
      
      console.log('[Upload] Uploading to Supabase Storage:', storagePath);
      
      const { error: uploadError } = await supabase.storage
        .from('cbct-scans')
        .upload(storagePath, finalZipFile, {
          contentType: 'application/zip',
          upsert: false
        });
      
      if (uploadError) {
        console.error('[Upload] Storage upload failed:', uploadError);
        throw new Error(`Failed to upload scan: ${uploadError.message}`);
      }
      
      setUploadProgress(80);
      
      console.log('[Upload] File uploaded successfully');
      
      // Update case with success flag
      await supabase
        .from('cases')
        .update({
          upload_completed: true
        })
        .eq('id', newCase.id);
      
      setUploadProgress(100);
      
      // Log case creation
      await logCaseCreation(newCase.id);
      
      setUploadSuccess(true);
      sonnerToast.success('Case uploaded successfully!');
      
    } catch (error) {
      console.error('Upload failed:', error);
      
      // Rollback: delete case if upload failed
      if (createdCase) {
        console.log('Rolling back: deleting case record');
        await supabase.from('cases').delete().eq('id', createdCase.id);
      }
      
      sonnerToast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4 hover:bg-secondary/50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-4xl font-bold text-foreground mb-2">Upload New Case</h1>
          <p className="text-muted-foreground">
            Submit CBCT scans for expert analysis
          </p>
        </motion.div>

        {/* Success Message */}
        {uploadSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6"
          >
            <Card className="border-2 border-green-500 bg-green-50 dark:bg-green-950/20">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="flex justify-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle2 className="w-10 h-10 text-white" />
                    </div>
                  </motion.div>
                  
                  <div>
                    <h3 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
                      Upload Successful!
                    </h3>
                    <p className="text-green-600 dark:text-green-300">
                      Case #{createdSimpleId} for {createdPatientName} has been uploaded successfully.
                    </p>
                  </div>
                  
                  <div className="flex gap-3 justify-center pt-4">
                    <Button
                      size="lg"
                      onClick={() => navigate('/dashboard')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Go to Dashboard
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => {
                        setUploadSuccess(false);
                        setUploadProgress(0);
                        setZipFile(null);
                        setDicomFiles([]);
                        setFormData({
                          patientName: "",
                          patientInternalId: "",
                          patientDob: "",
                          clinicalQuestion: "",
                          fieldOfView: "up_to_5x5",
                          urgency: "standard"
                        });
                      }}
                      className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40"
                    >
                      Upload Another Scan
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Main Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileArchive className="w-5 h-5 mr-2" />
                  Case Information
                </CardTitle>
                <CardDescription>
                  Provide patient details and upload DICOM files
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Patient Information */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="patientName">
                      Patient Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="patientName"
                      placeholder="John Smith"
                      value={formData.patientName}
                      onChange={(e) => setFormData({...formData, patientName: e.target.value})}
                      required
                      disabled={uploading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="patientInternalId">
                      Patient Internal ID
                    </Label>
                    <Input
                      id="patientInternalId"
                      placeholder="Optional clinic reference"
                      value={formData.patientInternalId}
                      onChange={(e) => setFormData({...formData, patientInternalId: e.target.value})}
                      disabled={uploading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="patientDob">Date of Birth</Label>
                    <Input
                      id="patientDob"
                      type="date"
                      value={formData.patientDob}
                      onChange={(e) => setFormData({...formData, patientDob: e.target.value})}
                      disabled={uploading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="clinicalQuestion">
                      Clinical Question <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="clinicalQuestion"
                      placeholder="What specific information are you seeking?"
                      value={formData.clinicalQuestion}
                      onChange={(e) => setFormData({...formData, clinicalQuestion: e.target.value})}
                      required
                      disabled={uploading}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fieldOfView">Field of View</Label>
                      <Select 
                        value={formData.fieldOfView} 
                        onValueChange={(value: any) => setFormData({...formData, fieldOfView: value})}
                        disabled={uploading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="up_to_5x5">Up to 5x5</SelectItem>
                          <SelectItem value="up_to_8x5">Up to 8x5</SelectItem>
                          <SelectItem value="up_to_8x8">Up to 8x8</SelectItem>
                          <SelectItem value="over_8x8">Over 8x8</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="urgency">Urgency</Label>
                      <Select 
                        value={formData.urgency} 
                        onValueChange={(value: any) => setFormData({...formData, urgency: value})}
                        disabled={uploading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Upload Mode Selection */}
                <div className="space-y-4 pt-4 border-t">
                  <Label>Upload Method</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      type="button"
                      variant={uploadMode === 'zip' ? 'default' : 'outline'}
                      onClick={() => setUploadMode('zip')}
                      className="h-auto py-4"
                      disabled={uploading}
                    >
                      <div className="text-center">
                        <FileArchive className="w-6 h-6 mx-auto mb-2" />
                        <div className="font-semibold">ZIP File</div>
                        <div className="text-xs text-muted-foreground">
                          Pre-packaged archive
                        </div>
                      </div>
                    </Button>
                    
                    <Button
                      type="button"
                      variant={uploadMode === 'individual' ? 'default' : 'outline'}
                      onClick={() => setUploadMode('individual')}
                      className="h-auto py-4"
                      disabled={uploading}
                    >
                      <div className="text-center">
                        <Files className="w-6 h-6 mx-auto mb-2" />
                        <div className="font-semibold">DICOM Files</div>
                        <div className="text-xs text-muted-foreground">
                          Individual files/folder
                        </div>
                      </div>
                    </Button>
                  </div>
                </div>

                {/* File Upload */}
                {uploadMode === 'zip' && (
                  <div>
                    <Label htmlFor="zipFile">
                      Upload ZIP File <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="zipFile"
                      type="file"
                      accept=".zip"
                      onChange={handleZipSelect}
                      disabled={uploading || validating}
                      required
                    />
                    {validating && (
                      <p className="text-sm text-muted-foreground mt-2">
                        <Clock className="w-4 h-4 inline animate-spin mr-1" />
                        Validating file...
                      </p>
                    )}
                    {zipFile && !validating && (
                      <p className="text-sm text-green-600 mt-2">
                        <CheckCircle2 className="w-4 h-4 inline mr-1" />
                        {zipFile.name} ({getReadableFileSize(zipFile.size)})
                      </p>
                    )}
                  </div>
                )}

                {uploadMode === 'individual' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="dicomFiles">Upload DICOM Files</Label>
                      <Input
                        id="dicomFiles"
                        type="file"
                        multiple
                        accept=".dcm,.dicom"
                        onChange={handleDicomFilesSelect}
                        disabled={uploading}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dicomFolder">Or Select Folder</Label>
                      <Input
                        id="dicomFolder"
                        type="file"
                        // @ts-ignore
                        webkitdirectory=""
                        directory=""
                        multiple
                        onChange={handleFolderSelect}
                        disabled={uploading}
                      />
                    </div>
                    {dicomFiles.length > 0 && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          {dicomFiles.length} DICOM file(s) selected
                          ({getReadableFileSize(dicomFiles.reduce((sum, f) => sum + f.size, 0))})
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* Upload Progress */}
                {uploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Uploading...</span>
                      <span className="font-medium">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={uploading || validating || processingFiles}
                >
                  {uploading ? (
                    <>
                      <Activity className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : processingFiles ? (
                    <>
                      <Activity className="w-4 h-4 mr-2 animate-spin" />
                      Processing Files...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Case
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default UploadCase;
