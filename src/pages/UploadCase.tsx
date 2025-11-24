import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useChunkedUpload } from "@/hooks/useChunkedUpload";
import { UploadForm } from "@/components/upload/UploadForm";
import { UploadProgress } from "@/components/upload/UploadProgress";
import { PricingDisplay } from "@/components/upload/PricingDisplay";
import { uploadService } from "@/services/uploadService";
import { handleError } from "@/utils/errorHandler";
import { toast } from "@/lib/toast";
import { logCaseCreation } from "@/lib/auditLog";

const UploadCase = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);
  const [createdSimpleId, setCreatedSimpleId] = useState<string | null>(null);
  const [createdPatientName, setCreatedPatientName] = useState<string>('');
  const [currentCaseFolderName, setCurrentCaseFolderName] = useState<string>('');
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [validating, setValidating] = useState(false);
  
  const [formData, setFormData] = useState({
    patientName: "",
    patientInternalId: "",
    patientDob: "",
    clinicalQuestion: "",
    specialInstructions: "",
    fieldOfView: "up_to_5x5" as "up_to_5x5" | "up_to_8x5" | "up_to_8x8" | "over_8x8",
    urgency: "standard" as "standard" | "urgent"
  });

  useEffect(() => {
    fetchPrice();
  }, [formData.fieldOfView]);

  const fetchPrice = async () => {
    setLoadingPrice(true);
    try {
      const price = await uploadService.fetchPrice(formData.fieldOfView);
      setEstimatedCost(price);
    } catch (error) {
      handleError(error, 'Failed to fetch pricing');
    } finally {
      setLoadingPrice(false);
    }
  };

  const { upload, uploading, progress, cancel } = useChunkedUpload({
    bucketName: 'cbct-scans',
    onSuccess: async (filePath) => {
      if (createdCaseId) {
        await logCaseCreation(createdCaseId);
      }
      setUploadSuccess(true);
      toast.success('Case uploaded successfully!');
    },
    onError: async (error) => {
      if (createdCaseId) {
        await supabase.from('cases').delete().eq('id', createdCaseId);
      }
      handleError(error, 'Upload failed');
    }
  });

  const handleZipSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setValidating(true);
    try {
      const validation = await uploadService.validateFile(file);
      
      if (!validation.valid) {
        toast.error('Invalid File', validation.error || 'File validation failed');
        e.target.value = '';
        setZipFile(null);
        return;
      }

      if (validation.warnings && validation.warnings.length > 0) {
        toast.warning('File Validation Warnings', validation.warnings.join('. '));
      }

      setZipFile(file);
      
      const statsMessage = validation.stats 
        ? `Contains ${validation.stats.dicomFiles} DICOM files`
        : '';
      
      toast.success('File Validated', `${file.name} is ready to upload. ${statsMessage}`);
    } catch (error) {
      handleError(error, 'Failed to validate file');
      e.target.value = '';
      setZipFile(null);
    } finally {
      setValidating(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!zipFile) {
      toast.error('No File', 'Please select a ZIP file');
      return;
    }

    try {
      const sanitized = uploadService.sanitizeFormData(formData);
      
      if (!sanitized.patientName || !sanitized.clinicalQuestion) {
        toast.error('Invalid Input', 'Patient Name and Clinical Question contain invalid characters');
        return;
      }
      
      setUploadSuccess(false);
      setCreatedPatientName(sanitized.patientName);
      
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
      
      const folderName = await uploadService.generateFolderName(
        sanitized.patientName,
        sanitized.patientInternalId || 'UNKNOWN'
      );
      setCurrentCaseFolderName(folderName);
      
      const { data: newCase, error: caseError } = await supabase
        .from('cases')
        .insert({
          clinic_id: profile.clinic_id,
          patient_name: sanitized.patientName,
          patient_internal_id: sanitized.patientInternalId || null,
          patient_dob: formData.patientDob || null,
          clinical_question: sanitized.clinicalQuestion,
          special_instructions: sanitized.specialInstructions,
          field_of_view: formData.fieldOfView,
          urgency: formData.urgency,
          folder_name: folderName,
          status: 'uploaded'
        })
        .select()
        .single();
      
      if (caseError) throw caseError;
      
      setCreatedCaseId(newCase.id);
      setCreatedSimpleId(String(newCase.simple_id).padStart(5, '0'));
      
      const storagePath = `${folderName}/scan.zip`;
      await upload(zipFile, storagePath);
    } catch (error) {
      handleError(error, 'Upload failed');
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
                        setZipFile(null);
                        setCreatedCaseId(null);
                        setCreatedSimpleId(null);
                        setCreatedPatientName('');
                        setCurrentCaseFolderName('');
                        setFormData({
                          patientName: "",
                          patientInternalId: "",
                          patientDob: "",
                          clinicalQuestion: "",
                          specialInstructions: "",
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Case Information</CardTitle>
                <CardDescription>
                  Provide patient details and upload DICOM files
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <UploadForm
                  formData={formData}
                  onFormChange={setFormData}
                  onFileSelect={handleZipSelect}
                  zipFile={zipFile}
                  validating={validating}
                  disabled={uploading}
                />

                <PricingDisplay estimatedCost={estimatedCost} loading={loadingPrice} />

                <UploadProgress
                  uploading={uploading}
                  progress={progress.percentage}
                  onCancel={cancel}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={uploading || validating || !zipFile}
                >
                  {uploading ? 'Uploading...' : 'Upload Case'}
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
