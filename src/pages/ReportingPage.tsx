import { PDFDownloadButton } from "@/components/PDFReportGenerator";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PDFViewer } from "@react-pdf/renderer";
import { ModernReportPDF } from "@/components/reports/ModernReportPDF";
import { usePDFTemplate } from "@/hooks/usePDFTemplate";
import { TemplateSelector } from "@/components/templates/TemplateSelector";
import { 
  ArrowLeft,
  Save,
  FileText,
  Wand2,
  Loader2,
  Users,
  AlertTriangle,
  Download,
  ImageIcon,
  Upload,
  X,
  Eye,
  Folder
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { ImageAnnotator } from "@/components/ImageAnnotator";
import { getCSRFToken, verifyCSRFToken } from "@/utils/csrf";
import { sanitizeClinicalText } from "@/utils/sanitization";
import { logReportCreation } from "@/lib/auditLog";

interface Case {
  id: string;
  patient_name: string;
  upload_date: string;
  clinical_question: string;
  status: 'uploaded' | 'in_progress' | 'report_ready' | 'awaiting_payment';
  urgency: 'standard' | 'urgent';
  field_of_view: 'up_to_5x5' | 'up_to_8x5' | 'up_to_8x8' | 'over_8x8';
  clinic_id: string;
  file_path: string | null;
  patient_dob: string | null;
  patient_internal_id: string | null;
  patient_id: string;
  dropbox_path: string | null;
  clinics: {
    name: string;
    contact_email: string;
  };
  reports?: {
    id: string;
    pdf_url: string | null;
    report_text: string | null;
  }[];
  annotations?: {
    id: string;
    image_url: string;
    annotation_data: any;
  }[];
}

const ReportingPage = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportText, setReportText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [concurrentUsers, setConcurrentUsers] = useState<string[]>([]);
  const [showConcurrentWarning, setShowConcurrentWarning] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<{url: string, name: string, id: string}[]>([]);
  const [showImageAnnotator, setShowImageAnnotator] = useState(false);
  const [currentImageForAnnotation, setCurrentImageForAnnotation] = useState<{url: string, name: string} | null>(null);
  const [pdfTemplate, setPdfTemplate] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);

  // Fetch clinic branding for PDF preview
  const { data: templateData } = usePDFTemplate(caseData?.clinic_id);

  useEffect(() => {
    if (caseId) {
      fetchCaseData();
    }
  }, [caseId]);

  useEffect(() => {
    if (caseData?.clinical_question) {
      fetchPDFTemplate();
    }
  }, [caseData?.clinical_question]);

  // Track unsaved changes
  useEffect(() => {
    if (reportText) {
      setHasUnsavedChanges(true);
    }
  }, [reportText]);

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !isSaving) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, isSaving]);

  // Clear flag after successful save
  useEffect(() => {
    if (!isSaving) {
      setHasUnsavedChanges(false);
    }
  }, [isSaving]);

  // Real-time presence tracking for concurrent editing
  useEffect(() => {
    if (!caseData) return;

    let currentUserId: string | null = null;

    const initializeChannel = async () => {
      const user = await supabase.auth.getUser();
      currentUserId = user.data.user?.id || null;

      const channel = supabase.channel(`case_${caseData.id}`)
        .on('presence', { event: 'sync' }, () => {
          const newState = channel.presenceState();
          const users = Object.keys(newState).filter(key => key !== currentUserId);
          setConcurrentUsers(users);
          setShowConcurrentWarning(users.length > 0);
        })
        .on('presence', { event: 'join' }, ({ key }) => {
          console.log('User joined case:', key);
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          console.log('User left case:', key);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && currentUserId) {
            await channel.track({
              user_id: currentUserId,
              case_id: caseData.id,
              online_at: new Date().toISOString(),
            });
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = initializeChannel();
    return () => {
      cleanup.then(fn => fn?.());
    };
  }, [caseData]);

  const fetchPDFTemplate = async () => {
    try {
      if (!caseData?.clinical_question) return;
      
      // Detect indication from clinical question
      const { data: indication } = await supabase.rpc(
        'detect_indication_from_clinical_question', 
        { clinical_question: caseData.clinical_question }
      );
      
      console.log('Detected indication:', indication, 'for clinical question:', caseData.clinical_question);
      
      // Get appropriate template for this indication
      const { data: templateId } = await supabase.rpc(
        'get_template_for_indication',
        { p_indication_name: indication || 'general' }
      );
      
      if (templateId) {
        const { data: template, error } = await supabase
          .from('pdf_templates')
          .select('*')
          .eq('id', templateId)
          .single();

        if (error) throw error;
        setPdfTemplate({ ...template, indication_detected: indication });
      }
    } catch (error: any) {
      console.error('Error fetching PDF template:', error);
      
      // Fallback to default hard-coded template
      setPdfTemplate({
        company_name: 'DentaRad AI Diagnostics',
        header_text: 'CBCT Diagnostic Report', 
        footer_text: 'This report was generated by DentaRad AI diagnostic services.',
        primary_color: '#0066cc',
        secondary_color: '#f8f9fa'
      });
    }
  };

  const fetchCaseData = async () => {
    try {
      console.log('Fetching case data for caseId:', caseId);
      
      if (!caseId) {
        throw new Error('Case ID is missing');
      }

      // Fetch case data from database with clinic information
      const { data: caseData, error: caseError } = await supabase
        .from('cases')
        .select(`
          *,
          clinics (
            name,
            contact_email
          ),
          reports (
            id,
            pdf_url,
            report_text
          )
        `)
        .eq('id', caseId)
        .maybeSingle();

      if (caseError) {
        throw new Error(`Database error: ${caseError.message}`);
      }

      if (!caseData) {
        toast({
          title: "Case not found",
          description: "The requested case could not be found.",
          variant: "destructive",
        });
        navigate('/admin/reporter');
        return;
      }

      setCaseData(caseData as Case);
      
      // Load existing report if available
      const existingReport = caseData.reports?.[0];
      setReportText(existingReport?.report_text || '');

      // Update case status to in_progress if not already completed
      if (caseData.status !== 'report_ready' && caseData.status !== 'awaiting_payment') {
        const { error: updateError } = await supabase
          .from('cases')
          .update({ status: 'in_progress' })
          .eq('id', caseId);

        if (updateError) {
          console.error('Error updating case status:', updateError);
        }
      }
    } catch (error) {
      console.error('Error fetching case data:', error);
      toast({
        title: "Error",
        description: "Failed to load case data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!caseData || !reportText.trim()) {
      toast({
        title: "Error",
        description: "Please enter some text before AI enhancement",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-diagnostic-report', {
        body: {
          transcribedText: reportText,
          caseDetails: {
            patient_name: caseData.patient_name,
            field_of_view: caseData.field_of_view,
            urgency: caseData.urgency,
            clinical_question: caseData.clinical_question
          },
          reportStyle: 'detailed'
        }
      });

      if (error) throw error;

      if (data?.generatedReport) {
        setReportText(data.generatedReport);
        toast({
          title: "Report Enhanced",
          description: "AI has enhanced your report with professional medical terminology",
        });
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI report",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveDraft = async () => {
    if (!caseData || !reportText.trim()) return;

    setIsSaving(true);
    try {
      // Check if report already exists
      const existingReport = caseData.reports?.[0];
      
      if (existingReport) {
        // Update existing report
        const { error } = await supabase
          .from('reports')
          .update({ 
            report_text: reportText,
            author_id: (await supabase.auth.getUser()).data.user?.id 
          })
          .eq('id', existingReport.id);

        if (error) throw error;
      } else {
        // Create new report
        const { error } = await supabase
          .from('reports')
          .insert({
            case_id: caseData.id,
            report_text: reportText,
            author_id: (await supabase.auth.getUser()).data.user?.id
          });

        if (error) throw error;
      }
      
      toast({
        title: "Draft saved successfully",
        description: "Your work has been saved as a draft. You can continue editing later.",
      });
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "Error saving draft",
        description: "Please try again or contact support if the problem persists.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveReport = async () => {
    if (!caseData) {
      toast({
        title: "Error",
        description: "Case data not found",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (!reportText.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Report findings are required',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);

    try {
      // Get and verify CSRF token
      const csrfToken = await getCSRFToken();
      const isValid = await verifyCSRFToken(csrfToken);
      
      if (!isValid) {
        throw new Error('Security validation failed. Please refresh and try again.');
      }
      
      // Sanitize report text
      const sanitizedReportText = sanitizeClinicalText(reportText);
      
      const user = await supabase.auth.getUser();
      
      // Check if report already exists
      const existingReport = caseData.reports?.[0];
      let reportId = existingReport?.id;
      
      if (!existingReport) {
        // Create new report first
        const { data: newReport, error } = await supabase
          .from('reports')
          .insert({
            case_id: caseData.id,
            report_text: sanitizedReportText,
            author_id: user.data.user?.id
          })
          .select()
          .single();

        if (error) throw error;
        reportId = newReport.id;
      }

      // Simply update the report - trigger will handle case status
      const { error: updateError } = await supabase
        .from('reports')
        .update({
          report_text: sanitizedReportText,
          finalized_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (updateError) throw updateError;
      
      // Log report creation
      await logReportCreation(reportId, caseData.id);

      // Success - report finalized, case status updated by trigger
      toast({
        title: 'Report Finalized',
        description: 'Report saved successfully'
      });

      // Queue PDF generation in background (non-blocking)
      supabase.functions
        .invoke('generate-pdf-report', {
          body: {
            reportId: reportId,
            caseData: {
              patient_name: caseData.patient_name,
              patient_dob: caseData.patient_dob,
              patient_internal_id: caseData.patient_internal_id,
              clinical_question: caseData.clinical_question,
              field_of_view: caseData.field_of_view,
              urgency: caseData.urgency,
              upload_date: caseData.upload_date,
              clinic_name: caseData.clinics?.name,
              clinic_contact_email: caseData.clinics?.contact_email
            },
            reportText: reportText,
            templateId: pdfTemplate?.id
          }
        })
        .then(({ data: pdfData, error: pdfError }) => {
          if (pdfError) {
            console.error('PDF generation error:', pdfError);
          } else {
            console.log('PDF generation queued successfully');
          }
        });

      // Navigate back to dashboard
      navigate('/admin/reporter');
    } catch (error) {
      console.error('Error finalizing report:', error);
      toast({
        title: 'Error',
        description: error instanceof Error 
          ? error.message 
          : 'Failed to finalize report. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to calculate invoice amount based on FOV and urgency
  const calculateCasePrice = (fov: string, urgency: string): number => {
    const basePrice = {
      'up_to_5x5': 125,
      'up_to_8x5': 145,
      'up_to_8x8': 165,
      'over_8x8': 185
    }[fov] || 125;

    const urgencySurcharge = urgency === 'urgent' ? 50 : 0;
    return basePrice + urgencySurcharge;
  };

  // Helper function to generate unique invoice number
  const generateInvoiceNumber = async (): Promise<string> => {
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true });
    
    const nextNumber = (count || 0) + 1;
    return `INV-${String(nextNumber).padStart(6, '0')}`;
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !caseData) return;

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file",
          description: "Please upload only image files",
          variant: "destructive",
        });
        continue;
      }

      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${caseData.id}_${Date.now()}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('reports')
          .upload(`case_images/${fileName}`, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('reports')
          .getPublicUrl(`case_images/${fileName}`);

        const newImage = {
          id: Date.now().toString(),
          url: urlData.publicUrl,
          name: file.name
        };

        setUploadedImages(prev => [...prev, newImage]);
        
        toast({
          title: "Image uploaded",
          description: "You can now annotate this image",
        });
      } catch (error) {
        console.error('Error uploading image:', error);
        toast({
          title: "Error",
          description: "Failed to upload image",
          variant: "destructive",
        });
      }
    }
  };

  const handleAnnotatedImageSave = async (annotatedBlob: Blob, originalFileName: string) => {
    if (!caseData) return;

    try {
      const fileName = `annotated_${caseData.id}_${Date.now()}.png`;

      const { data, error } = await supabase.storage
        .from('reports')
        .upload(`case_images/${fileName}`, annotatedBlob);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('reports')
        .getPublicUrl(`case_images/${fileName}`);

      console.log('Annotated image uploaded:', {
        fileName,
        publicUrl: urlData.publicUrl,
        bucketPath: `case_images/${fileName}`
      });

      // Verify the image is accessible
      try {
        const testResponse = await fetch(urlData.publicUrl, { method: 'HEAD' });
        console.log('Image accessibility check:', testResponse.ok);
      } catch (e) {
        console.warn('Image may not be immediately accessible:', e);
      }

      // Save annotation to database
      const user = await supabase.auth.getUser();
      const { error: dbError } = await supabase
        .from('case_annotations')
        .insert({
          case_id: caseData.id,
          created_by: user.data.user?.id || '',
          annotation_type: 'image',
          annotation_data: {
            original_name: originalFileName,
            image_url: urlData.publicUrl,
            annotated_at: new Date().toISOString()
          }
        });

      if (dbError) throw dbError;

      const newAnnotatedImage = {
        id: Date.now().toString(),
        url: urlData.publicUrl,
        name: `annotated_${originalFileName}`
      };

      setUploadedImages(prev => [...prev, newAnnotatedImage]);
      setShowImageAnnotator(false);
      setCurrentImageForAnnotation(null);

      toast({
        title: "Annotated image saved",
        description: "The annotated image has been added to your report",
      });
    } catch (error) {
      console.error('Error saving annotated image:', error);
      toast({
        title: "Error",
        description: "Failed to save annotated image",
        variant: "destructive",
      });
    }
  };

  const removeImage = (imageId: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
    toast({
      title: "Image removed",
      description: "Image has been removed from the report",
    });
  };

  const openImageAnnotator = (imageUrl: string, imageName: string) => {
    setCurrentImageForAnnotation({ url: imageUrl, name: imageName });
    setShowImageAnnotator(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'report_ready': return 'bg-green-100 text-green-800 border-green-200';
      case 'awaiting_payment': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Case not found</h2>
          <Button onClick={() => navigate('/admin/reporter')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/admin/reporter')}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(caseData.status)}>
              {formatStatus(caseData.status)}
            </Badge>
            {caseData.urgency === 'urgent' && (
              <Badge variant="destructive">Urgent</Badge>
            )}
          </div>
        </div>

        {/* Concurrent Users Warning */}
        {showConcurrentWarning && (
          <Alert className="mb-6">
            <Users className="w-4 h-4" />
            <AlertDescription>
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              {concurrentUsers.length} other user(s) are currently editing this case. 
              Your changes may conflict with theirs.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Case Information Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Case Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Patient Name</label>
                  <p className="text-lg font-semibold">{caseData.patient_name}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Patient DOB</label>
                  <p>{caseData.patient_dob ? new Date(caseData.patient_dob).toLocaleDateString() : 'Not provided'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Patient ID</label>
                  <p>{caseData.patient_internal_id || 'Not provided'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Clinic</label>
                  <p>{caseData.clinics.name}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Upload Date</label>
                  <p>{new Date(caseData.upload_date).toLocaleDateString()}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Field of View</label>
                  <p className="capitalize">{caseData.field_of_view.replace('_', ' ')}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Clinical Question</label>
                  <p className="text-sm leading-relaxed">{caseData.clinical_question}</p>
                  {pdfTemplate?.indication_detected && (
                    <div className="mt-2">
                      <Badge variant="secondary" className="text-xs">
                        Template: {pdfTemplate.indication_detected.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* File Access Section */}
                <div className="pt-4 border-t">
                  <label className="text-sm font-medium text-muted-foreground mb-3 block">DICOM File Access</label>
                  
                  <div className="space-y-3">
                    {/* Primary Access - Synced Folder */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2 mb-2">
                        <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold mt-0.5">1</div>
                        <div className="flex-1">
                          <span className="font-semibold text-blue-900 text-sm">Primary: Open from Synced Folder</span>
                        </div>
                      </div>
                      <p className="text-xs text-blue-800 ml-7 mb-2">
                        Files auto-sync to your Mac within seconds:
                      </p>
                      <code className="text-[10px] bg-white px-2 py-1 rounded border block ml-7 mb-2 break-all">
                        ~/Dropbox/DentaRad/Uploads/{caseData.patient_id}_{caseData.id}/
                      </code>
                      <p className="text-xs text-blue-600 ml-7 flex items-center gap-1">
                        <span className="text-base">💡</span>
                        <span>Open directly in Falcon MD - fastest workflow!</span>
                      </p>
                    </div>

                    {/* Secondary Access - Browser Download */}
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-start gap-2 mb-2">
                        <div className="w-5 h-5 bg-gray-600 rounded flex items-center justify-center text-white text-xs font-bold mt-0.5">2</div>
                        <div className="flex-1">
                          <span className="font-semibold text-gray-900 text-sm">Backup: Download via Browser</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-700 ml-7 mb-2">
                        Use when away from main Mac or for sharing
                      </p>
                      <Button
                        onClick={async () => {
                          try {
                            const { data, error } = await supabase.functions.invoke('download-from-dropbox', {
                              body: { 
                                dropboxPath: caseData.dropbox_path || caseData.file_path,
                                fileName: `${caseData.patient_id}_${caseData.id}.zip`
                              }
                            });

                            if (error) throw error;

                            if (data?.downloadUrl) {
                              window.open(data.downloadUrl, '_blank');
                              toast({
                                title: 'Download Link Ready',
                                description: 'Opening download in new tab (link expires in 4 hours)'
                              });
                            }
                          } catch (error) {
                            console.error('Download error:', error);
                            toast({
                              title: 'Download Failed',
                              description: 'Could not generate download link',
                              variant: 'destructive'
                            });
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className="ml-7 w-full max-w-[200px]"
                      >
                        <Download className="w-3 h-3 mr-2" />
                        Download from Dropbox
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Reporting Panel */}
          <div className="lg:col-span-2">
            {/* Template Selector */}
            <div className="mb-4">
              <TemplateSelector
                caseData={caseData}
                onTemplateLoad={(content) => {
                  setReportText(
                    [
                      content.clinicalHistory && `CLINICAL HISTORY:\n${content.clinicalHistory}\n\n`,
                      content.imagingTechnique && `IMAGING TECHNIQUE:\n${content.imagingTechnique}\n\n`,
                      `FINDINGS:\n${content.findings}\n\n`,
                      `IMPRESSION:\n${content.impression}\n\n`,
                      content.recommendations && `RECOMMENDATIONS:\n${content.recommendations}`
                    ].filter(Boolean).join('')
                  );
                }}
                disabled={isSaving || isGenerating}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Diagnostic Report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Voice Recorder */}
                <div className="border rounded-lg p-4 bg-slate-50">
                  <VoiceRecorder onTranscription={(text) => setReportText(prev => prev + ' ' + text)} />
                </div>

                {/* Image Upload Section */}
                <div className="border rounded-lg p-4 bg-slate-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Report Images & Screenshots</h4>
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('image-upload')?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Images
                      </Button>
                    </div>
                  </div>
                  
                  {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                      {uploadedImages.map((image) => (
                        <div key={image.id} className="relative group">
                          <img
                            src={image.url}
                            alt={image.name}
                            className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => openImageAnnotator(image.url, image.name)}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded transition-all flex items-center justify-center">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => openImageAnnotator(image.url, image.name)}
                            >
                              <ImageIcon className="w-4 h-4 mr-1" />
                              Annotate
                            </Button>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                            onClick={() => removeImage(image.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1 rounded-b">
                            {image.name.length > 20 ? `${image.name.substring(0, 17)}...` : image.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Report Text Area */}
                <Textarea
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  placeholder="Start typing your diagnostic report or use voice recording above..."
                  className="min-h-[400px] font-mono text-sm"
                />

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 justify-between">
                  <div className="flex gap-2">
                    <Button
                      onClick={generateReport}
                      disabled={isGenerating || !reportText.trim()}
                      variant="outline"
                    >
                      {isGenerating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Wand2 className="w-4 h-4 mr-2" />
                      )}
                      {isGenerating ? 'Generating...' : 'AI Enhance'}
                    </Button>
                    
                    {/* PDF Preview and Download */}
                    {reportText.trim() && caseData && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => setShowPDFPreview(true)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Preview PDF
                        </Button>

                        {pdfTemplate && (
                          <PDFDownloadButton
                            reportData={{
                              reportId: caseData.reports?.[0]?.id || 'draft',
                              caseData: {
                                patient_name: caseData.patient_name,
                                patient_dob: caseData.patient_dob,
                                patient_internal_id: caseData.patient_internal_id,
                                clinical_question: caseData.clinical_question,
                                field_of_view: caseData.field_of_view,
                                urgency: caseData.urgency,
                                upload_date: caseData.upload_date,
                                clinic_name: caseData.clinics.name,
                                clinic_contact_email: caseData.clinics.contact_email
                              },
                              reportText: reportText,
                              images: uploadedImages
                            }}
                            template={pdfTemplate}
                            fileName={`${caseData.patient_name}_Report_${caseData.id}.pdf`}
                          >
                            <Button variant="outline" className="flex items-center gap-2">
                              <Download className="w-4 h-4" />
                              Download PDF
                            </Button>
                          </PDFDownloadButton>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={saveDraft}
                      disabled={isSaving || !reportText.trim()}
                      variant="outline"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Draft
                    </Button>
                    
                    <Button
                      onClick={saveReport}
                      disabled={isSaving || !reportText.trim()}
                      className="w-full"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Finalizing Report...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Finalize Report
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Image Annotation Dialog */}
      <Dialog open={showImageAnnotator} onOpenChange={setShowImageAnnotator}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Annotate Image</DialogTitle>
            <DialogDescription>
              Add annotations, drawings, and text to your image
            </DialogDescription>
          </DialogHeader>
          
          {currentImageForAnnotation && (
            <ImageAnnotator
              imageUrl={currentImageForAnnotation.url}
              fileName={currentImageForAnnotation.name}
              onSave={handleAnnotatedImageSave}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* PDF Preview Dialog */}
      <Dialog open={showPDFPreview} onOpenChange={setShowPDFPreview}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>PDF Report Preview</DialogTitle>
            <DialogDescription>
              Preview your report before finalizing. 
              <Button 
                variant="link" 
                className="px-1 h-auto"
                onClick={() => navigate('/admin/template-editor')}
              >
                Customize template
              </Button>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 overflow-hidden">
            {reportText.trim() && caseData && templateData && (
              <PDFViewer width="100%" height="100%" className="border rounded">
                <ModernReportPDF
                  reportData={{
                    patientName: caseData.patient_name,
                    patientDob: caseData.patient_dob || undefined,
                    patientId: caseData.patient_internal_id || undefined,
                    clinicName: caseData.clinics.name,
                    reportDate: new Date().toISOString(),
                    clinicalQuestion: caseData.clinical_question,
                    findings: reportText,
                    impression: "",
                    recommendations: [],
                    images: uploadedImages.map(img => ({
                      url: img.url,
                      caption: img.name
                    })),
                    reporterName: "Reporter",
                    caseId: caseData.id
                  }}
                  template={templateData.template.template_data}
                  branding={templateData.branding}
                />
              </PDFViewer>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportingPage;