import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileText, 
  Search, 
  Eye, 
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
  FileType
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { DicomViewer } from "@/components/DicomViewer";

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
  clinics: {
    name: string;
    contact_email: string;
  };
  reports?: {
    id: string;
    pdf_url: string | null;
    report_text: string | null;
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

  useEffect(() => {
    fetchCases();
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

  const fetchCases = async () => {
    try {
      const { data, error } = await supabase
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
        .in('status', ['uploaded', 'in_progress', 'report_ready'])
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

  const openDicomViewer = (caseData: Case) => {
    if (!caseData.file_path) {
      toast({
        title: "No Images",
        description: "This case doesn't have any images uploaded yet.",
        variant: "destructive",
      });
      return;
    }

    // Navigate to the DICOM viewer page
    navigate(`/admin/dicom-viewer/${caseData.id}`);
    
    toast({
      title: "DICOM Viewer Opened",
      description: "Opening images for case: " + caseData.patient_name,
    });
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

  const startReporting = async (caseData: Case) => {
    setSelectedCase(caseData);
    
    // Load existing report if available
    const { data: existingReport } = await supabase
      .from('reports')
      .select('report_text')
      .eq('case_id', caseData.id)
      .single();
    
    setReportText(existingReport?.report_text || '');
    
    // Update case status to in_progress only if not already completed
    if (caseData.status !== 'report_ready') {
      try {
        const { error } = await supabase
          .from('cases')
          .update({ status: 'in_progress' })
          .eq('id', caseData.id);

        if (error) throw error;
        
        // Refresh cases list
        fetchCases();
        
      } catch (error) {
        console.error('Error updating case status:', error);
        toast({
          title: "Error",
          description: "Failed to start reporting session",
          variant: "destructive",
        });
        return;
      }
    }
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
        },
      });

      if (error) throw error;

      toast({
        title: "PDF generated successfully",
        description: "The PDF report has been generated and is ready for download.",
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
            <CardDescription>Click "Start Reporting" to begin working on a case</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredCases.map((case_) => (
                <div key={case_.id} className="flex items-center justify-between p-4 border rounded-lg">
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
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => openDicomViewer(case_)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <ImageIcon className="w-4 h-4" />
                      View Images
                    </Button>
                    <Button
                      onClick={() => window.open(`/viewer/${case_.id}`, '_blank')}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Open in New Tab
                    </Button>
                     {case_.status !== 'report_ready' ? (
                      <Button
                        onClick={() => startReporting(case_)}
                        className="flex items-center gap-2"
                        variant={case_.status === 'in_progress' ? 'outline' : 'default'}
                      >
                        <FileText className="w-4 h-4" />
                        {case_.status === 'in_progress' ? 'Continue Reporting' : 'Start Reporting'}
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => startReporting(case_)}
                          variant="secondary"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          View & Amend Report
                        </Button>
                        {case_.reports?.[0]?.pdf_url && (
                          <>
                            <Button
                              onClick={() => window.open(case_.reports[0].pdf_url, '_blank')}
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              <Download className="w-4 h-4" />
                              Download PDF
                            </Button>
                            <Button
                              onClick={() => createSecureShareLink(case_.reports[0].id)}
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              <Share2 className="w-4 h-4" />
                              Share Report
                            </Button>
                          </>
                        )}
                      </>
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
              Review the DICOM images and create a diagnostic report for this case.
            </DialogDescription>
          </DialogHeader>
          
          {selectedCase && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - DICOM Viewer */}
              <div className="space-y-4">
                {/* DICOM Viewer Options */}
                <div className="flex gap-2 mb-4">
                  <Button
                    onClick={() => window.open(`/viewer/${selectedCase.id}`, '_blank')}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Open in New Tab
                  </Button>
                </div>
                
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
                
                {/* DICOM Viewer */}
                <DicomViewer 
                  caseId={selectedCase.id}
                  filePath={selectedCase.file_path}
                  className="h-full"
                />
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

                {/* PDF Preview Section */}
                {selectedCase?.reports?.[0]?.pdf_url && (
                  <div className="space-y-4">
                    <h4 className="font-semibold">Generated PDF Report</h4>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => window.open(selectedCase.reports[0].pdf_url, '_blank')}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <FileType className="w-4 h-4" />
                        View PDF
                      </Button>
                      <Button
                        onClick={() => createSecureShareLink(selectedCase.reports[0].id)}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Share2 className="w-4 h-4" />
                        Share
                      </Button>
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
    </div>
  );
};

export default ReporterDashboard;