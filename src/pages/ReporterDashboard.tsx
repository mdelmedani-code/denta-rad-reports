import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, ExternalLink, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Case {
  id: string;
  patient_name: string;
  patient_id: string;
  created_at: string;
  clinical_question: string;
  field_of_view: string;
  urgency: string;
  status: string;
  completed_at?: string;
  dropbox_scan_path?: string;
}

export default function ReporterDashboard() {
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingCase, setDownloadingCase] = useState<string | null>(null);
  const [completingCase, setCompletingCase] = useState<string | null>(null);

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

  async function downloadDICOM(caseId: string) {
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
      a.download = `case_${caseId}_scan.zip`;
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
    if (!caseData.dropbox_scan_path) {
      toast.error('Dropbox path not available');
      return;
    }

    // Extract folder path (remove filename)
    const pathParts = caseData.dropbox_scan_path.split('/');
    pathParts.pop(); // Remove filename
    const folderPath = pathParts.join('/');

    // Construct Dropbox URL
    const dropboxUrl = `https://www.dropbox.com/home${folderPath}`;
    window.open(dropboxUrl, '_blank');
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

  const pendingCases = cases.filter(c => c.status === 'uploaded' || c.status === 'in_progress');
  const completedCases = cases.filter(c => c.status === 'report_ready');

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
                <CardTitle>{caseData.patient_name}</CardTitle>
                <CardDescription>
                  Patient ID: {caseData.patient_id} | Uploaded: {new Date(caseData.created_at).toLocaleDateString()}
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
                  onClick={() => downloadDICOM(caseData.id)}
                  disabled={downloadingCase === caseData.id}
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
                  disabled={!caseData.dropbox_scan_path}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in Dropbox
                </Button>
                <Button 
                  onClick={() => markCompleted(caseData.id, caseData)} 
                  variant="default"
                  disabled={completingCase === caseData.id}
                >
                  {completingCase === caseData.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Mark as Completed
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
