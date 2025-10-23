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
import { validateDICOMZip, getReadableFileSize, checkUploadRateLimit, recordUpload } from "@/services/fileValidationService";
import { getCSRFToken } from "@/utils/csrf";
import { sanitizePatientRef, sanitizeText } from "@/utils/sanitization";
import { logCaseCreation } from "@/lib/auditLog";
import { Progress } from "@/components/ui/progress";
import { useChunkedUpload } from "@/hooks/useChunkedUpload";
import { DropboxUploadService } from "@/services/dropboxUploadService";

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
  const [postUploadProcessing, setPostUploadProcessing] = useState(false);

  const { upload, cancel, uploading, progress } = useChunkedUpload({
    bucketName: 'cbct-scans',
    onError: (error) => {
      sonnerToast.error(`Upload failed: ${error.message}`);
    }
  });
  
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
      // Validate file comprehensively
      const validation = await validateDICOMZip(file);
      
      if (!validation.valid) {
        toast({
          title: 'Invalid File',
          description: validation.error,
          variant: 'destructive',
          duration: 8000
        });
        
        // Clear the file input
        e.target.value = '';
        setZipFile(null);
        return;
      }

      // Show warnings if any
      if (validation.warnings && validation.warnings.length > 0) {
        toast({
          title: 'File Validation Warnings',
          description: validation.warnings.join('. '),
          variant: 'default',
          duration: 6000
        });
      }

      // File is valid
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
    
    // Sanitize inputs before validation
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
    
    // Check upload rate limit (20 uploads per 24 hours)
    const rateLimit = await checkUploadRateLimit();
    if (!rateLimit.allowed) {
      toast({
        title: 'Upload Limit Reached',
        description: rateLimit.error || 'You can upload 20 cases per 24 hours',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setUploadSuccess(false);
      setCreatedPatientName(sanitizedPatientName);
      
      // Get CSRF token for security
      const csrfToken = await getCSRFToken();
      
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
      
      // 2. Create case record with sanitized data
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
          status: 'uploaded'
        })
        .select()
        .single();
      
      if (caseError) throw caseError;
      
      setCreatedCaseId(newCase.id);
      setCreatedSimpleId(String(newCase.simple_id).padStart(5, '0'));
      
      // 3. Prepare ZIP
      let finalZipFile: File | Blob;
      let zipFilename: string;
      
      if (uploadMode === 'zip') {
        finalZipFile = zipFile!;
        zipFilename = zipFile!.name;
      } else {
        sonnerToast.info(`Compressing ${dicomFiles.length} DICOM files...`);
        const zipBlob = await createZipFromFiles(dicomFiles);
        finalZipFile = zipBlob;
        zipFilename = `case_${newCase.id}_dicom.zip`;
      }
      
      // 4. Upload to Supabase Storage using TUS chunked upload
      const storagePath = `${newCase.clinic_id}/${newCase.id}/${zipFilename}`;
      
      await upload(finalZipFile, storagePath);
      
      // Upload completed - show success
      setUploadSuccess(true);
      
      // Start background processing (non-blocking)
      setPostUploadProcessing(true);
      handleBackgroundProcessing(newCase, finalZipFile, zipFilename, storagePath)
        .then(() => {
          sonnerToast.success('Dropbox sync complete!');
        })
        .catch((error) => {
          console.error('Background processing failed:', error);
          sonnerToast.error('Failed to sync to Dropbox: ' + error.message);
        })
        .finally(() => {
          setPostUploadProcessing(false);
        });
      
    } catch (error) {
      console.error('Upload failed:', error);
      sonnerToast.error(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  const handleBackgroundProcessing = async (
    newCase: any,
    finalZipFile: File | Blob,
    zipFilename: string,
    storagePath: string
  ) => {
    console.log('[Dropbox Sync] Starting background processing for case:', newCase.id);
    
    // Get Dropbox upload credentials
    const { data: uploadConfigData, error: configError } = await supabase.functions.invoke(
      'get-dropbox-upload-url',
      { 
        body: { 
          caseId: newCase.id, 
          fileName: zipFilename
        } 
      }
    );

    if (configError) {
      console.error('[Dropbox Sync] Error getting upload config:', configError);
      throw new Error('Failed to get Dropbox upload credentials: ' + configError.message);
    }

    if (!uploadConfigData?.success) {
      console.error('[Dropbox Sync] Upload config failed:', uploadConfigData);
      throw new Error('Failed to get Dropbox upload credentials');
    }

    console.log('[Dropbox Sync] Upload config received:', {
      folderName: uploadConfigData.uploadConfig.folderName,
      dropboxPath: uploadConfigData.uploadConfig.dropboxPath
    });

    // Upload to Dropbox
    console.log('[Dropbox Sync] Uploading file to Dropbox...');
    await DropboxUploadService.uploadFile(
      finalZipFile instanceof File ? finalZipFile : new File([finalZipFile], zipFilename),
      uploadConfigData.uploadConfig,
      (progress) => console.log(`[Dropbox Sync] Upload progress: ${progress.percentage}%`)
    );
    
    const dropboxPath = uploadConfigData.uploadConfig.dropboxPath;
    console.log('[Dropbox Sync] File uploaded to:', dropboxPath);
    
    // Update case with paths
    await supabase
      .from('cases')
      .update({
        dropbox_path: dropboxPath,
        file_path: storagePath
      })
      .eq('id', newCase.id);
    
    console.log('[Dropbox Sync] Case updated with Dropbox path');
    
    // Record upload
    await recordUpload(
      finalZipFile instanceof File ? finalZipFile.size : finalZipFile.size,
      'application/zip'
    );
    
    // Log case creation
    await logCaseCreation(newCase.id);
    
    // Sync to Dropbox (create folders & metadata)
    console.log('[Dropbox Sync] Calling sync-case-to-dropbox edge function...');
    const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-case-to-dropbox', {
      body: { caseId: newCase.id, dropboxPath }
    });
    
    if (syncError) {
      console.error('[Dropbox Sync] sync-case-to-dropbox error:', syncError);
      throw new Error('Failed to sync case to Dropbox: ' + syncError.message);
    }
    
    console.log('[Dropbox Sync] sync-case-to-dropbox response:', syncData);
    
    // Extract metadata
    console.log('[Dropbox Sync] Calling extract-dicom-zip edge function...');
    const { data: extractData, error: extractError } = await supabase.functions.invoke('extract-dicom-zip', {
      body: { caseId: newCase.id, dropboxPath }
    });
    
    if (extractError) {
      console.error('[Dropbox Sync] extract-dicom-zip error:', extractError);
      // Don't throw - this is optional
    } else {
      console.log('[Dropbox Sync] extract-dicom-zip response:', extractData);
    }
    
    console.log('[Dropbox Sync] Background processing complete!');
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes}m`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  };

  const resetForm = () => {
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
    setUploadSuccess(false);
    setCreatedCaseId(null);
    setCreatedSimpleId(null);
    setCreatedPatientName('');
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
                    disabled={uploading || validating}
                    className="cursor-pointer"
                  />
                  {validating && (
                    <p className="text-sm text-blue-600 mt-2">
                      Validating file contents...
                    </p>
                  )}
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
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="individual-files" className="text-sm font-medium">
                      Select Individual Files
                    </Label>
                    <Input
                      id="individual-files"
                      type="file"
                      multiple
                      accept=".dcm,.dicom"
                      onChange={handleDicomFilesSelect}
                      className="cursor-pointer mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Hold Ctrl/Cmd to select multiple files
                    </p>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="folder-input" className="text-sm font-medium">
                      Select Entire Folder
                    </Label>
                    <Input
                      id="folder-input"
                      type="file"
                      {...({ webkitdirectory: "", directory: "" } as any)}
                      multiple
                      onChange={handleFolderSelect}
                      className="cursor-pointer mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Choose a folder containing DICOM files
                    </p>
                  </div>

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

          {/* Upload Progress */}
          {uploading && !uploadSuccess && (
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-1">
                    Uploading CBCT Scan...
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {createdPatientName}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-3">
                  <Progress 
                    value={progress.percentage} 
                    className="h-3 transition-all duration-150 ease-out" 
                  />
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">
                      {Math.round(progress.percentage)}%
                    </p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                  <div className="space-y-1">
                    <Activity className="h-5 w-5 mx-auto text-blue-500" />
                    <p className="text-xs text-muted-foreground">Speed</p>
                    <p className="font-semibold">{progress.speedMBps} MB/s</p>
                  </div>
                  <div className="space-y-1">
                    <Clock className="h-5 w-5 mx-auto text-orange-500" />
                    <p className="text-xs text-muted-foreground">Remaining</p>
                    <p className="font-semibold">{formatTime(progress.etaSeconds)}</p>
                  </div>
                  <div className="space-y-1">
                    <Upload className="h-5 w-5 mx-auto text-green-500" />
                    <p className="text-xs text-muted-foreground">Uploaded</p>
                    <p className="font-semibold">
                      {progress.uploadedMB} / {progress.totalMB} MB
                    </p>
                  </div>
                </div>

                {/* Cancel Button */}
                <div className="text-center">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={cancel}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel Upload
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success Animation */}
          {uploadSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-green-500 bg-green-50 dark:bg-green-950">
                <CardContent className="pt-6 text-center space-y-6">
                  {/* Animated Checkmark */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 15,
                      duration: 0.5,
                    }}
                  >
                    <CheckCircle2 className="h-20 w-20 mx-auto text-green-600" />
                  </motion.div>

                  {/* Success Message */}
                  <div>
                    <h3 className="text-2xl font-bold text-green-900 dark:text-green-100 mb-2">
                      Upload Complete!
                    </h3>
                    <p className="text-green-700 dark:text-green-300">
                      Your case has been submitted successfully.
                    </p>
                    {createdSimpleId && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                        Case ID: {createdSimpleId} - {createdPatientName}
                      </p>
                    )}
                  </div>

                  {/* Background Processing Notice */}
                  <Alert className="bg-white/60 dark:bg-white/10 border-green-300 dark:border-green-700">
                    <AlertDescription className="text-left">
                      <p className="font-semibold text-green-900 dark:text-green-100 mb-2">
                        ⏳ Processing your scan in the background
                      </p>
                      <p className="text-sm text-green-800 dark:text-green-200">
                        We're generating your referral documents (DICOM SR, PDF cover sheet).
                        You'll receive an email when your report is ready (usually 1-2 days).
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                        You can safely close this page.
                      </p>
                    </AlertDescription>
                  </Alert>

                  {/* Action Buttons */}
                  <div className="flex gap-3 justify-center pt-4">
                    <Button onClick={() => navigate('/dashboard')}>
                      View My Cases
                    </Button>
                    <Button variant="outline" onClick={resetForm}>
                      Upload Another
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

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
