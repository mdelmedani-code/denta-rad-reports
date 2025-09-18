import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowLeft,
  Save,
  FileText,
  Wand2,
  Loader2,
  Users,
  AlertTriangle,
  Download
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  reports?: {
    id: string;
    pdf_url: string | null;
    report_text: string | null;
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

  useEffect(() => {
    if (caseId) {
      fetchCaseData();
    }
  }, [caseId]);

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

  const fetchCaseData = async () => {
    try {
      // For now, use sample data - replace with actual database fetch later
      const sampleCases: Case[] = [
        {
          id: "sample-case-1",
          patient_name: "John Smith",
          upload_date: new Date().toISOString(),
          clinical_question: "Evaluate impacted third molars and assess bone density for implant placement in lower left quadrant",
          status: "uploaded",
          urgency: "standard",
          field_of_view: "up_to_8x8",
          clinic_id: "sample-clinic-1",
          file_path: "sample/case-001/scan.dcm",
          patient_dob: "1985-03-15",
          patient_internal_id: "PT-2024-001",
          clinics: {
            name: "Downtown Dental Clinic",
            contact_email: "info@downtowndental.com"
          },
          reports: []
        },
        {
          id: "sample-case-2",
          patient_name: "Sarah Johnson",
          upload_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          clinical_question: "Pre-surgical assessment for maxillary sinus lift procedure",
          status: "in_progress",
          urgency: "urgent",
          field_of_view: "up_to_5x5",
          clinic_id: "sample-clinic-2",
          file_path: "sample/case-002/scan.dcm",
          patient_dob: "1978-11-22",
          patient_internal_id: "PT-2024-002",
          clinics: {
            name: "Smile Center Orthodontics",
            contact_email: "contact@smilecenter.co.uk"
          },
          reports: [{
            id: "report-1",
            pdf_url: null,
            report_text: "Initial assessment shows adequate bone height..."
          }]
        }
      ];

      const foundCase = sampleCases.find(c => c.id === caseId);
      if (!foundCase) {
        toast({
          title: "Case not found",
          description: "The requested case could not be found.",
          variant: "destructive",
        });
        navigate('/admin/reporter');
        return;
      }

      setCaseData(foundCase);
      
      // Load existing report if available
      const existingReport = foundCase.reports?.[0];
      setReportText(existingReport?.report_text || '');

      // Update case status to in_progress if not already completed
      if (foundCase.status !== 'report_ready') {
        // This would be a database update in real implementation
        console.log('Updating case status to in_progress');
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
      // In real implementation, this would save to database
      console.log('Saving draft for case:', caseData.id);
      
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
    if (!caseData || !reportText.trim()) {
      toast({
        title: "Error",
        description: "Please enter a report before saving",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // In real implementation, this would save to database and update case status
      console.log('Finalizing report for case:', caseData.id);
      
      toast({
        title: "Report finalized successfully",
        description: "The diagnostic report has been finalized and the case marked as complete.",
      });
      
      // Navigate back to dashboard
      navigate('/admin/reporter');
    } catch (error) {
      console.error('Error saving report:', error);
      toast({
        title: "Error saving report",
        description: "Please try again or contact support if the problem persists.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
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
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Reporting Panel */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Diagnostic Report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Voice Recorder */}
                <div className="border rounded-lg p-4 bg-slate-50">
                  <VoiceRecorder onTranscription={(text) => setReportText(prev => prev + ' ' + text)} />
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
                      AI Enhance
                    </Button>
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
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4 mr-2" />
                      )}
                      Finalize Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportingPage;