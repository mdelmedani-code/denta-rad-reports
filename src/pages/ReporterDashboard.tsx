import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, ExternalLink, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import CaseSearchFilters from '@/components/CaseSearchFilters';

interface Case {
  id: string;
  patient_name: string;
  patient_id: string;
  patient_dob: string;
  created_at: string;
  clinical_question: string;
  field_of_view: string;
  urgency: string;
  status: string;
  completed_at?: string;
  dropbox_scan_path?: string;
  simple_id?: number;
  folder_name?: string;
}

export default function ReporterDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingCase, setDownloadingCase] = useState<string | null>(null);
  const [completingCase, setCompletingCase] = useState<string | null>(null);
  const [searchFilters, setSearchFilters] = useState({
    patientName: '',
    patientId: '',
    dateFrom: '',
    dateTo: '',
    urgency: '',
    fieldOfView: '',
  });

  useEffect(() => {
    fetchCases();
  }, []);

  async function fetchCases() {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCases(data || []);
    } catch (error: any) {
      toast.error('Failed to load cases');
      console.error('Error fetching cases:', error);
    } finally {
      setLoading(false);
    }
  }

  async function downloadDICOM(caseId: string, folderName: string) {
    setDownloadingCase(caseId);
    try {
      const { data, error } = await supabase.functions.invoke('get-dropbox-file', {
        body: { caseId, fileType: 'scan' },
      });

      if (error) throw error;

      // Create blob and download
      const blob = new Blob([data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folderName}_scan.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('DICOM scan downloaded successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to download DICOM scan');
      console.error('Download error:', error);
    } finally {
      setDownloadingCase(null);
    }
  }

  function openDropboxFolder(caseData: Case) {
    // Open /Uploads/ folder in Dropbox
    const folderName = caseData.folder_name || `${caseData.patient_id}_${caseData.id}`;
    const folderPath = `/DentaRad/Uploads/${folderName}`;
    const dropboxUrl = `https://www.dropbox.com/home${folderPath}`;
    window.open(dropboxUrl, '_blank');
  }

  function openDropboxReportsFolder(caseData: Case) {
    // Open /Reports/{patient_name}/ folder in Dropbox
    const folderPath = `/DentaRad/Reports/${caseData.patient_name}`;
    const dropboxUrl = `https://www.dropbox.com/home${folderPath}`;
    window.open(dropboxUrl, '_blank');
  }

  function formatCaseTitle(caseData: Case): string {
    if (caseData.simple_id) {
      const id = String(caseData.simple_id).padStart(5, '0');
      const nameParts = caseData.patient_name.split(' ');
      const lastName = nameParts[nameParts.length - 1].toUpperCase();
      const firstName = nameParts[0].toUpperCase();
      return `${id} - ${lastName}, ${firstName}`;
    }
    return caseData.patient_name;
  }

  async function markCompleted(caseId: string, caseData: Case) {
    const expectedPath = caseData.dropbox_scan_path?.replace('/scan.zip', '/report.pdf') || 
                        `/DentaRad/Cases/${caseData.patient_id}_${caseId}/report.pdf`;
    
    const confirmed = confirm(
      `Have you uploaded the report PDF to Dropbox?\n\n` +
      `Expected location:\n${expectedPath}\n\n` +
      `Click OK to mark this case as completed.`
    );

    if (!confirmed) return;

    setCompletingCase(caseId);
    try {
      const { data, error } = await supabase.functions.invoke('mark-case-completed', {
        body: { caseId },
      });

      if (error) throw error;

      toast.success('Case marked as completed!');
      fetchCases(); // Refresh list
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark as completed');
      console.error('Mark completed error:', error);
    } finally {
      setCompletingCase(null);
    }
  }

  // Filter cases based on search criteria
  const filteredCases = useMemo(() => {
    return cases.filter(caseData => {
      // Patient name filter
      if (searchFilters.patientName && 
          !caseData.patient_name.toLowerCase().includes(searchFilters.patientName.toLowerCase())) {
        return false;
      }

      // Patient ID filter
      if (searchFilters.patientId && 
          !caseData.patient_id.toLowerCase().includes(searchFilters.patientId.toLowerCase())) {
        return false;
      }

      // Date range filter
      const caseDate = new Date(caseData.created_at);
      if (searchFilters.dateFrom && caseDate < new Date(searchFilters.dateFrom)) {
        return false;
      }
      if (searchFilters.dateTo && caseDate > new Date(searchFilters.dateTo)) {
        return false;
      }

      // Urgency filter
      if (searchFilters.urgency && caseData.urgency !== searchFilters.urgency) {
        return false;
      }

      // Field of view filter
      if (searchFilters.fieldOfView && caseData.field_of_view !== searchFilters.fieldOfView) {
        return false;
      }

      return true;
    });
  }, [cases, searchFilters]);

  const pendingCases = filteredCases.filter(c => c.status === 'uploaded' || c.status === 'in_progress');
  const completedCases = filteredCases.filter(c => c.status === 'report_ready');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Reporter Dashboard</h1>

      <CaseSearchFilters 
        onFilterChange={setSearchFilters}
        onReset={() => setSearchFilters({
          patientName: '',
          patientId: '',
          dateFrom: '',
          dateTo: '',
          urgency: '',
          fieldOfView: '',
        })}
      />

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Review ({pendingCases.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedCases.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {pendingCases.map(caseData => (
            <Card key={caseData.id}>
              <CardHeader>
                <CardTitle>{formatCaseTitle(caseData)}</CardTitle>
                <CardDescription>
                  {caseData.folder_name && (
                    <span className="block text-xs font-mono mb-1">Folder: {caseData.folder_name}</span>
                  )}
                  Patient ID: {caseData.patient_id} | DOB: {caseData.patient_dob} | Uploaded: {new Date(caseData.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm font-semibold">Clinical Question:</p>
                  <p className="text-sm text-muted-foreground">{caseData.clinical_question}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold">Field of View:</p>
                    <p className="text-muted-foreground">{caseData.field_of_view.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Urgency:</p>
                    <p className="text-muted-foreground capitalize">{caseData.urgency}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button 
                  onClick={() => navigate(`/reporter/case/${caseData.id}`)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Review Case
                </Button>
                <Button 
                  onClick={() => downloadDICOM(caseData.id, caseData.folder_name || `${caseData.patient_id}_${caseData.id}`)}
                  disabled={downloadingCase === caseData.id}
                  variant="outline"
                >
                  {downloadingCase === caseData.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download DICOM
                </Button>
                <Button 
                  onClick={() => openDropboxFolder(caseData)} 
                  variant="outline"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Uploads Folder
                </Button>
                <Button 
                  onClick={() => openDropboxReportsFolder(caseData)} 
                  variant="outline"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Reports Folder
                </Button>
              </CardFooter>
            </Card>
          ))}

          {pendingCases.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No pending cases</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-4">
          {completedCases.map(caseData => (
            <Card key={caseData.id}>
              <CardHeader>
                <CardTitle>{caseData.patient_name}</CardTitle>
                <CardDescription>
                  Completed: {caseData.completed_at ? new Date(caseData.completed_at).toLocaleDateString() : 'Unknown'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{caseData.clinical_question}</p>
              </CardContent>
            </Card>
          ))}

          {completedCases.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No completed cases</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
