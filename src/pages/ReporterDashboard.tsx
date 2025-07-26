import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Loader2
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
  clinics: {
    name: string;
    contact_email: string;
  };
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

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select(`
          *,
          clinics (
            name,
            contact_email
          )
        `)
        .in('status', ['uploaded', 'in_progress'])
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

    // Open DICOM viewer in new tab - placeholder URL for now
    const dicomViewerUrl = `https://your-dicom-viewer.com/view?case=${caseData.id}&file=${encodeURIComponent(caseData.file_path)}`;
    window.open(dicomViewerUrl, '_blank', 'noopener,noreferrer');
    
    toast({
      title: "DICOM Viewer Opened",
      description: "Images opened in new tab for case: " + caseData.patient_name,
    });
  };

  const startReporting = async (caseData: Case) => {
    setSelectedCase(caseData);
    
    // Update case status to in_progress
    try {
      const { error } = await supabase
        .from('cases')
        .update({ status: 'in_progress' })
        .eq('id', caseData.id);

      if (error) throw error;
      
      // Refresh cases list
      fetchCases();
      
      // Open DICOM viewer
      openDicomViewer(caseData);
      
    } catch (error) {
      console.error('Error updating case status:', error);
      toast({
        title: "Error",
        description: "Failed to start reporting session",
        variant: "destructive",
      });
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
      const { error } = await supabase
        .from('reports')
        .upsert({
          case_id: selectedCase.id,
          report_text: reportText,
          author_id: (await supabase.auth.getUser()).data.user?.id,
        });

      if (error) throw error;

      // Update case status to report_ready
      const { error: caseError } = await supabase
        .from('cases')
        .update({ status: 'report_ready' })
        .eq('id', selectedCase.id);

      if (caseError) throw caseError;

      toast({
        title: "Report Saved",
        description: "Report has been saved successfully",
      });

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                      onClick={() => startReporting(case_)}
                      className="flex items-center gap-2"
                      disabled={case_.status === 'in_progress'}
                    >
                      <FileText className="w-4 h-4" />
                      {case_.status === 'in_progress' ? 'In Progress' : 'Start Reporting'}
                    </Button>
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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report for {selectedCase?.patient_name}</DialogTitle>
            <DialogDescription>
              Create a diagnostic report for this case. The DICOM images should be open in another tab.
            </DialogDescription>
          </DialogHeader>
          
          {selectedCase && (
            <div className="space-y-6">
              {/* Case Details */}
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Case Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
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
                  <div className="col-span-2">
                    <strong>Clinical Question:</strong> {selectedCase.clinical_question}
                  </div>
                </div>
              </div>

              {/* Voice Dictation Integration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Voice Dictation & AI Report Generation</h4>
                  <Button
                    onClick={generateReport}
                    disabled={!reportText.trim() || isGenerating}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    {isGenerating ? 'Generating...' : 'AI Enhance Report'}
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
                  className="min-h-[300px]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleCancelReport}>
                  Cancel
                </Button>
                <Button 
                  onClick={saveReport}
                  disabled={isSaving || !reportText.trim()}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Report'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReporterDashboard;