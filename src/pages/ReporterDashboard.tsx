import { PDFDownloadButton } from "@/components/PDFReportGenerator";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import JSZip from 'jszip';
import { 
  FileText, 
  Search, 
  Save,
  LogOut,
  ImageIcon,
  Users,
  Clock,
  Wand2,
  Loader2,
  AlertTriangle,
  Download,
  Share2,
  FileType,
  Shield
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { VoiceRecorder } from "@/components/VoiceRecorder";



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
  pregenerated_zip_path?: string | null;
  zip_generation_status?: string | null;
  clinics: {
    name: string;
    contact_email: string;
  };
  reports?: {
    id: string;
    pdf_url: string | null;
    report_text: string | null;
    signed_off_by: string | null;
    signed_off_at: string | null;
    signatory_name: string | null;
    signatory_title: string | null;
    signatory_credentials: string | null;
    signature_statement: string | null;
  }[];
}

const ReporterDashboard = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [reportText, setReportText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [concurrentUsers, setConcurrentUsers] = useState<string[]>([]);
  const [showConcurrentWarning, setShowConcurrentWarning] = useState(false);
  const [pdfTemplate, setPdfTemplate] = useState<any>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadComplete, setShowDownloadComplete] = useState(false);
  const [downloadedFileCount, setDownloadedFileCount] = useState(0);
  const [isSigningOff, setIsSigningOff] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    fetchCases();
    fetchPDFTemplate();
    fetchUserProfile();
  }, []);

  // Real-time presence tracking for concurrent editing
  useEffect(() => {
    if (!selectedCase) return;

    let currentUserId: string | null = null;

    const initializeChannel = async () => {
      const user = await supabase.auth.getUser();
      currentUserId = user.data.user?.id || null;

      const channel = supabase.channel(`case_${selectedCase.id}`)
        .on('presence', { event: 'sync' }, () => {
          const newState = channel.presenceState();
          const users = Object.keys(newState).filter(key => key !== currentUserId);
          setConcurrentUsers(users);
          setShowConcurrentWarning(users.length > 0);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('User joined case:', key);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('User left case:', key);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && currentUserId) {
            await channel.track({
              user_id: currentUserId,
              case_id: selectedCase.id,
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
  }, [selectedCase]);

  const fetchPDFTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from('pdf_templates')
        .select('*')
        .eq('is_active', true)
        .single();
      
      if (error) {
        console.error('Error fetching PDF template:', error);
        // Use fallback template
        setPdfTemplate({
          company_name: 'DentaRad AI Diagnostics',
          header_text: 'CBCT Diagnostic Report',
          footer_text: 'This report was generated by DentaRad AI diagnostic services.',
          primary_color: '#0066cc',
          secondary_color: '#f8f9fa'
        });
      } else {
        setPdfTemplate(data);
      }
    } catch (error) {
      console.error('Error fetching PDF template:', error);
      // Use fallback template
      setPdfTemplate({
        company_name: 'DentaRad AI Diagnostics',
        header_text: 'CBCT Diagnostic Report',
        footer_text: 'This report was generated by DentaRad AI diagnostic services.',
        primary_color: '#0066cc',
        secondary_color: '#f8f9fa'
      });
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch role from user_roles
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleError) throw roleError;

        // Fetch profile details from profiles (without role)
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('professional_title, credentials, signature_statement')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        setUserRole(roleData?.role || null);
        setUserProfile(profileData);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchCases = async () => {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select(`
          *,
          clinics:clinic_id (
            name,
            contact_email
          ),
          reports (
            id,
            report_text,
            pdf_url,
            signed_off_by,
            signed_off_at,
            signatory_name,
            signatory_title,
            signatory_credentials,
            signature_statement
          )
        `)
        .order('upload_date', { ascending: false });

      if (error) throw error;

      setCases(data || []);
    } catch (error) {
      console.error('Error fetching cases:', error);
      toast({
        title: "Error",
        description: "Failed to load cases",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };


  const createSecureShareLink = async (reportId: string) => {
    try {
      const { data, error } = await supabase.rpc('create_report_share', {
        p_report_id: reportId
      });

      if (error) throw error;

      const shareUrl = `${window.location.origin}/shared-report/${data}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      
      toast({
        title: "Share link created",
        description: "Secure share link has been copied to clipboard. Link expires in 7 days.",
      });
    } catch (error) {
      console.error('Error creating share link:', error);
      toast({
        title: "Error creating share link",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    }
  };

  const downloadImages = async (caseData: Case & { pregenerated_zip_path?: string; zip_generation_status?: string }) => {
    if (!caseData.file_path) {
      toast({
        title: "No files available",
        description: "This case doesn't have any uploaded files.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if pre-generated ZIP exists and is completed
      if (caseData.pregenerated_zip_path && caseData.zip_generation_status === 'completed') {
        console.log('Using pre-generated ZIP for instant download');
        
        // Generate signed URL for pre-generated ZIP
        const { data: zipData, error: zipError } = await supabase.storage
          .from('cbct-scans')
          .createSignedUrl(caseData.pregenerated_zip_path, 3600);

        if (zipError) throw zipError;

        // Instant download
        const link = document.createElement('a');
        link.href = zipData.signedUrl;
        link.download = `${caseData.patient_name}_${caseData.id}_DICOM_files.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "Download Started",
          description: "Pre-generated ZIP file download started instantly!",
        });
        return;
      }

      // If no pre-generated ZIP or it's still processing, show status and fall back to on-demand generation
      if (caseData.zip_generation_status === 'processing') {
        toast({
          title: "ZIP Being Generated",
          description: "A ZIP file is being prepared in the background. Using on-demand generation for now.",
        });
      } else if (caseData.zip_generation_status === 'pending') {
        // Trigger background ZIP generation for future downloads
        triggerZipPregeneration(caseData);
        toast({
          title: "Background Processing Started",
          description: "ZIP file will be pre-generated for faster future downloads.",
        });
      }

      // Fall back to on-demand ZIP creation
      console.log('Creating ZIP on-demand');
      
      // Extract folder path from the file_path
      const folderPath = caseData.file_path.split('/')[0];
      
      // List all files in the case folder
      const { data: fileList, error: listError } = await supabase.storage
        .from('cbct-scans')
        .list(folderPath, {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (listError) throw listError;

      if (!fileList || fileList.length === 0) {
        toast({
          title: "No files found",
          description: "No DICOM files found for this case.",
          variant: "destructive",
        });
        return;
      }

      setIsDownloading(true);
      setDownloadProgress(0);
      setDownloadedFileCount(0);

      // Create a ZIP file
      const zip = new JSZip();
      const totalFiles = fileList.length;
      
      // Download files in parallel (batches of 5 for optimal performance)
      const batchSize = 5;
      let completedFiles = 0;

      const downloadFile = async (file: any, index: number) => {
        const filePath = `${folderPath}/${file.name}`;
        
        try {
          // Generate signed URL for each file
          const { data, error } = await supabase.storage
            .from('cbct-scans')
            .createSignedUrl(filePath, 3600);

          if (error) throw error;

          // Fetch the file blob
          const response = await fetch(data.signedUrl);
          const blob = await response.blob();
          
          return { name: file.name, blob, index };
        } catch (fileError) {
          console.error(`Error downloading file ${file.name}:`, fileError);
          return null;
        }
      };

      // Process files in batches for parallel downloads
      for (let i = 0; i < fileList.length; i += batchSize) {
        const batch = fileList.slice(i, i + batchSize);
        const batchPromises = batch.map((file, batchIndex) => 
          downloadFile(file, i + batchIndex)
        );
        
        const results = await Promise.allSettled(batchPromises);
        
        // Add successful downloads to ZIP
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            zip.file(result.value.name, result.value.blob);
          }
          completedFiles++;
          
          // Update progress
          const progress = Math.round((completedFiles / totalFiles) * 100);
          setDownloadProgress(progress);
          setDownloadedFileCount(completedFiles);
        });
      }
      
      // Generate ZIP file with optimized compression settings
      const zipBlob = await zip.generateAsync({ 
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 1  // Fast compression (1-9, where 1 is fastest)
        }
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `${caseData.patient_name}_${caseData.id}_DICOM_files.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      setIsDownloading(false);
      setShowDownloadComplete(true);
      
      toast({
        title: "Download Complete",
        description: `${fileList.length} DICOM files downloaded as ZIP file.`,
      });
    } catch (error) {
      console.error('Error downloading images:', error);
      setIsDownloading(false);
      toast({
        title: "Error downloading images",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    }
  };

  const triggerZipPregeneration = async (caseData: Case) => {
    try {
      await supabase.functions.invoke('pregenerate-case-zip', {
        body: { 
          caseId: caseData.id, 
          filePath: caseData.file_path 
        }
      });
    } catch (error) {
      console.error('Error triggering ZIP pre-generation:', error);
    }
  };


  const startReporting = (caseData: Case) => {
    navigate(`/admin/reporter/case/${caseData.id}`);
  };

  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording - placeholder for now
      setIsRecording(false);
      toast({
        title: "Recording Stopped",
        description: "Voice recording has been stopped. Radioscribe integration coming soon.",
      });
    } else {
      // Start recording - placeholder for now
      setIsRecording(true);
      toast({
        title: "Recording Started",
        description: "Voice recording started. Radioscribe integration coming soon.",
      });
    }
  };

  const generateReport = async () => {
    if (!selectedCase || !reportText.trim()) {
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
            patient_name: selectedCase.patient_name,
            field_of_view: selectedCase.field_of_view,
            urgency: selectedCase.urgency,
            clinical_question: selectedCase.clinical_question
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

  const generatePDF = async (reportId: string) => {
    if (!selectedCase) return;

    setIsGeneratingPDF(true);
    try {
      // Check if report is signed off and get signature data
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select('signed_off_by, signed_off_at, signatory_name, signatory_title, signatory_credentials, signature_statement')
        .eq('id', reportId)
        .single();

      let signatureData = null;
      if (reportData?.signed_off_by) {
        signatureData = {
          signatory_name: reportData.signatory_name,
          signatory_title: reportData.signatory_title,
          signatory_credentials: reportData.signatory_credentials,
          signature_statement: reportData.signature_statement,
          signed_off_at: reportData.signed_off_at
        };
      }

      const { data, error } = await supabase.functions.invoke('generate-pdf-report', {
        body: {
          reportId,
          caseData: {
            patient_name: selectedCase.patient_name,
            patient_dob: selectedCase.patient_dob,
            patient_internal_id: selectedCase.patient_internal_id,
            clinical_question: selectedCase.clinical_question,
            field_of_view: selectedCase.field_of_view,
            urgency: selectedCase.urgency,
            upload_date: selectedCase.upload_date,
            clinic_name: selectedCase.clinics.name,
            clinic_contact_email: selectedCase.clinics.contact_email,
          },
          reportText,
          signatureData
        },
      });

      if (error) throw error;

      toast({
        title: "PDF generated successfully",
        description: signatureData ? "The digitally signed PDF report has been generated." : "The PDF report has been generated and is ready for download.",
      });

      // Refresh the data to get the updated PDF URL
      fetchCases();
      
      return data.pdfUrl;
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error generating PDF",
        description: "Please try again or contact support if the problem persists.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const saveDraft = async () => {
    if (!selectedCase || !reportText.trim()) return;

    setIsSaving(true);
    try {
      // Create or update the report as draft
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .upsert({
          case_id: selectedCase.id,
          report_text: reportText,
          author_id: (await supabase.auth.getUser()).data.user?.id,
        }, { onConflict: 'case_id' })
        .select();

      if (reportError) throw reportError;

      // Update case status to in_progress if not already
      if (selectedCase.status !== 'in_progress') {
        const { error: caseError } = await supabase
          .from('cases')
          .update({ status: 'in_progress' })
          .eq('id', selectedCase.id);

        if (caseError) throw caseError;
      }

      toast({
        title: "Draft saved successfully",
        description: "Your work has been saved as a draft. You can continue editing later.",
      });

      // Refresh the data and close dialog
      fetchCases();
      setSelectedCase(null);
      setReportText('');
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
    if (!selectedCase || !reportText.trim()) {
      toast({
        title: "Error",
        description: "Please enter a report before saving",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Create or update report
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .upsert({
          case_id: selectedCase.id,
          report_text: reportText,
          author_id: (await supabase.auth.getUser()).data.user?.id,
        }, { onConflict: 'case_id' })
        .select();

      if (reportError) throw reportError;

      // Update case status to report_ready
      const { error: caseError } = await supabase
        .from('cases')
        .update({ status: 'report_ready' })
        .eq('id', selectedCase.id);

      if (caseError) throw caseError;

      // Generate PDF after saving the report
      if (reportData && reportData[0]) {
        await generatePDF(reportData[0].id);
      }

      toast({
        title: selectedCase.status === 'report_ready' ? "Report updated successfully" : "Report finalized successfully",
        description: selectedCase.status === 'report_ready' 
          ? "The diagnostic report has been updated and PDF regenerated." 
          : "The diagnostic report has been finalized, PDF generated, and the case marked as complete.",
      });

      // Refresh the data and close dialog
      setSelectedCase(null);
      setReportText("");
      fetchCases();
      
    } catch (error) {
      console.error('Error saving report:', error);
      toast({
        title: "Error",
        description: "Failed to save report",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDialogOpenChange = async (open: boolean) => {
    if (!open) {
      // Dialog is being closed
      await resetCaseStatusIfNeeded();
      setSelectedCase(null);
      setReportText("");
    }
  };

  const resetCaseStatusIfNeeded = async () => {
    if (selectedCase && selectedCase.status === 'in_progress') {
      // Reset case status back to uploaded if user exits without saving
      try {
        const { error } = await supabase
          .from('cases')
          .update({ status: 'uploaded' })
          .eq('id', selectedCase.id);

        if (error) throw error;
        fetchCases(); // Refresh the cases list
        
        toast({
          title: "Case Reset",
          description: "Case status has been reset to uploaded",
        });
      } catch (error) {
        console.error('Error resetting case status:', error);
        toast({
          title: "Warning",
          description: "Failed to reset case status. Case may remain in progress.",
          variant: "destructive",
        });
      }
    }
  };

  const signOffReport = async () => {
    if (!selectedCase?.reports?.[0]?.id || !userProfile) return;

    setIsSigningOff(true);
    try {
      const { data, error } = await supabase.rpc('sign_off_report', {
        p_report_id: selectedCase.reports[0].id,
        p_signatory_name: 'Dr Mohamed Elmedani',
        p_signatory_title: userProfile.professional_title || 'Consultant Radiologist',
        p_signatory_credentials: userProfile.credentials || 'GMC 7514964',
        p_signature_statement: userProfile.signature_statement
      });

      if (error) throw error;

      toast({
        title: "Report Signed Off",
        description: "The report has been digitally signed and marked as complete.",
      });

      // Regenerate PDF with signature
      await generatePDF(selectedCase.reports[0].id);
      
      // Refresh the data
      fetchCases();
      setSelectedCase(null);
      setReportText("");
      
    } catch (error) {
      console.error('Error signing off report:', error);
      toast({
        title: "Error",
        description: "Failed to sign off report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSigningOff(false);
    }
  };

  const handleCancelReport = async () => {
    await resetCaseStatusIfNeeded();
    setSelectedCase(null);
    setReportText("");
  };

  const filteredCases = cases.filter(case_ => 
    case_.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    case_.clinics.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    case_.clinical_question.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'report_ready': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    return urgency === 'urgent' 
      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading cases...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Reporter Dashboard</h1>
              <p className="text-muted-foreground">Review cases and create diagnostic reports</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search cases by patient name, clinic, or clinical question..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Cases</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cases.filter(c => c.status === 'uploaded').length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cases.filter(c => c.status === 'in_progress').length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <FileText className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cases.filter(c => c.status === 'report_ready').length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cases.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Cases List */}
        <Card>
          <CardHeader>
            <CardTitle>Cases Awaiting Reports</CardTitle>
            <CardDescription>Use the Start Reporting button to create a report.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
               {filteredCases.map((case_) => (
                 <div 
                   key={case_.id} 
                   className="flex items-center justify-between p-4 border rounded-lg transition-colors"
                 >
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="font-semibold">{case_.patient_name}</h3>
                        <Badge className={getStatusColor(case_.status)}>
                          {case_.status.replace('_', ' ')}
                        </Badge>
                        <Badge className={getUrgencyColor(case_.urgency)}>
                          {case_.urgency}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p><strong>Clinic:</strong> {case_.clinics.name}</p>
                        <p><strong>Clinical Question:</strong> {case_.clinical_question}</p>
                        <p><strong>Upload Date:</strong> {new Date(case_.upload_date).toLocaleDateString()}</p>
                        <p><strong>Field of View:</strong> {case_.field_of_view.replace('_', ' ')}</p>
                        {case_.file_path && (
                          <p><strong>Files:</strong> Available for download</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Download Images Option */}
                      {case_.file_path && (
                        <div className="flex gap-2 mr-4">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadImages(case_);
                            }}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            {case_.zip_generation_status === 'completed' ? 'Download ZIP (Instant)' : 
                             case_.zip_generation_status === 'processing' ? 'Download ZIP (Generating...)' :
                             'Download Images'}
                          </Button>
                          
                          {/* ZIP Pre-generation Status/Button */}
                          {case_.zip_generation_status === 'pending' && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerZipPregeneration(case_);
                                toast({
                                  title: "ZIP Generation Started",
                                  description: "Pre-generating ZIP file in background for faster future downloads.",
                                });
                              }}
                              variant="ghost"
                              size="sm"
                              className="flex items-center gap-2 text-blue-600"
                            >
                              <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                              Pre-generate ZIP
                            </Button>
                          )}
                          
                          {case_.zip_generation_status === 'processing' && (
                            <div className="flex items-center gap-2 text-blue-600 text-sm">
                              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                              ZIP Generating...
                            </div>
                          )}
                          
                          {case_.zip_generation_status === 'completed' && (
                            <div className="flex items-center gap-2 text-green-600 text-sm">
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              ZIP Ready
                            </div>
                          )}
                          
                          {case_.zip_generation_status === 'failed' && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerZipPregeneration(case_);
                              }}
                              variant="ghost"
                              size="sm"
                              className="flex items-center gap-2 text-red-600"
                            >
                              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                              Retry ZIP
                            </Button>
                          )}
                        </div>
                      )}
                      
                      {/* Reporting Actions */}
                      {case_.status !== 'report_ready' ? (
                       <Button
                         onClick={(e) => {
                           e.stopPropagation();
                           startReporting(case_);
                         }}
                         className="flex items-center gap-2"
                         variant={case_.status === 'in_progress' ? 'outline' : 'default'}
                       >
                         <FileText className="w-4 h-4" />
                         {case_.status === 'in_progress' ? 'Continue Reporting' : 'Start Reporting'}
                       </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              startReporting(case_);
                            }}
                            variant="secondary"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <FileText className="w-4 h-4" />
                            View & Amend Report
                          </Button>
                          {case_.reports?.[0]?.report_text && pdfTemplate && (
                            <>
                              <PDFDownloadButton
                                reportData={{
                                  reportId: case_.reports[0].id,
                                  caseData: {
                                    patient_name: case_.patient_name,
                                    patient_dob: case_.patient_dob,
                                    patient_internal_id: case_.patient_internal_id,
                                    clinical_question: case_.clinical_question,
                                    field_of_view: case_.field_of_view,
                                    urgency: case_.urgency,
                                    upload_date: case_.upload_date,
                                    clinic_name: case_.clinics.name,
                                    clinic_contact_email: case_.clinics.contact_email
                                  },
                                  reportText: case_.reports[0].report_text
                                }}
                                template={pdfTemplate}
                                fileName={`${case_.patient_name}_Report_${case_.id}.pdf`}
                              >
                                <Button
                                  onClick={(e) => e.stopPropagation()}
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center gap-2"
                                >
                                  <Download className="w-4 h-4" />
                                  Download PDF
                                </Button>
                              </PDFDownloadButton>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  createSecureShareLink(case_.reports[0].id);
                                }}
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2"
                              >
                                <Share2 className="w-4 h-4" />
                                Share Report
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                     </div>
                  </div>
               ))}
               
               {filteredCases.length === 0 && (
                 <div className="text-center py-8 text-muted-foreground">
                   No cases found matching your search.
                 </div>
               )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reporting Modal */}
      <Dialog open={selectedCase !== null} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report for {selectedCase?.patient_name}</DialogTitle>
            <DialogDescription>
              Review the medical images and create a diagnostic report for this case.
            </DialogDescription>
          </DialogHeader>
          
          {selectedCase && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Image Viewer */}
               <div className="space-y-4">
                 
                 {/* Concurrent Editing Warning */}
                 {showConcurrentWarning && (
                   <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                     <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                     <AlertDescription className="text-amber-800 dark:text-amber-200">
                       <strong>Warning:</strong> Another user is currently viewing this case. 
                       If you save your report, it may overwrite their work if they haven't finalized it yet.
                     </AlertDescription>
                   </Alert>
                  )}
                  
                     <div className="h-[600px] border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                       <div className="text-center text-muted-foreground max-w-md">
                         <p className="text-lg font-medium mb-2">Image viewer temporarily unavailable</p>
                         <p className="text-sm">You can continue reporting without the embedded viewer.</p>
                       </div>
                     </div>
                </div>

              {/* Right Column - Reporting Interface */}
              <div className="space-y-4">
                {/* Case Details */}
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Case Information</h4>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div>
                      <strong>Patient:</strong> {selectedCase.patient_name}
                    </div>
                    <div>
                      <strong>Clinic:</strong> {selectedCase.clinics.name}
                    </div>
                    <div>
                      <strong>DOB:</strong> {selectedCase.patient_dob ? new Date(selectedCase.patient_dob).toLocaleDateString() : 'N/A'}
                    </div>
                    <div>
                      <strong>Internal ID:</strong> {selectedCase.patient_internal_id || 'N/A'}
                    </div>
                    <div>
                      <strong>Clinical Question:</strong> {selectedCase.clinical_question}
                    </div>
                  </div>
                </div>

                {/* Voice Dictation Integration */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Voice Dictation & AI</h4>
                    <Button
                      onClick={generateReport}
                      disabled={!reportText.trim() || isGenerating}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                      {isGenerating ? 'Generating...' : 'AI Enhance'}
                    </Button>
                  </div>
                  <VoiceRecorder
                    onTranscription={(text) => setReportText(prev => prev ? `${prev} ${text}` : text)}
                    disabled={isSaving}
                  />
                </div>

                {/* Report Text Area */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Diagnostic Report</label>
                  <Textarea
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    placeholder="Enter your diagnostic report here..."
                    className="min-h-[400px]"
                  />
                </div>

                {/* PDF Preview and Generation Section */}
                {reportText.trim() && selectedCase && pdfTemplate && (
                  <div className="space-y-4">
                    <h4 className="font-semibold">PDF Report</h4>
                    <div className="flex gap-3">
                      <PDFDownloadButton
                        reportData={{
                          reportId: selectedCase.reports?.[0]?.id || 'draft',
                          caseData: {
                            patient_name: selectedCase.patient_name,
                            patient_dob: selectedCase.patient_dob,
                            patient_internal_id: selectedCase.patient_internal_id,
                            clinical_question: selectedCase.clinical_question,
                            field_of_view: selectedCase.field_of_view,
                            urgency: selectedCase.urgency,
                            upload_date: selectedCase.upload_date,
                            clinic_name: selectedCase.clinics.name,
                            clinic_contact_email: selectedCase.clinics.contact_email
                          },
                          reportText: reportText
                        }}
                        template={pdfTemplate}
                        fileName={`${selectedCase.patient_name}_Report_${selectedCase.id}.pdf`}
                      >
                        <Button
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download PDF Report
                        </Button>
                      </PDFDownloadButton>
                      {selectedCase.reports?.[0]?.id && (
                        <Button
                          onClick={() => createSecureShareLink(selectedCase.reports[0].id)}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <Share2 className="w-4 h-4" />
                          Share Report
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleCancelReport} size="sm">
                    Cancel
                  </Button>
                  <Button 
                    onClick={saveDraft}
                    disabled={isSaving || isGeneratingPDF || !reportText.trim()}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save Draft'}
                  </Button>
                  
                  {userRole === 'admin' && selectedCase?.reports?.[0] && !selectedCase.reports[0].signed_off_by && selectedCase.status === 'report_ready' && (
                    <Button 
                      onClick={signOffReport}
                      disabled={isSigningOff || isGeneratingPDF}
                      variant="secondary"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Shield className="w-4 h-4" />
                      {isSigningOff ? 'Signing Off...' : 'Sign Off Report'}
                    </Button>
                  )}
                  
                  <Button 
                    onClick={saveReport}
                    disabled={isSaving || isGeneratingPDF || !reportText.trim()}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving || isGeneratingPDF ? 'Processing...' : selectedCase?.status === 'report_ready' ? 'Update Report' : 'Finalize Report'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Download Progress Dialog */}
      <Dialog open={isDownloading} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Downloading DICOM Files</DialogTitle>
            <DialogDescription>
              Please wait while we prepare your files...
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{downloadedFileCount} files processed</span>
              </div>
              <Progress value={downloadProgress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                {downloadProgress}% complete
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Download Complete Dialog */}
      <Dialog open={showDownloadComplete} onOpenChange={setShowDownloadComplete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Download Complete! 🎉</DialogTitle>
            <DialogDescription>
              Your DICOM files have been successfully downloaded as a ZIP archive.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {downloadedFileCount} DICOM files downloaded successfully
              </p>
            </div>
            <Button onClick={() => setShowDownloadComplete(false)} className="w-full">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReporterDashboard;