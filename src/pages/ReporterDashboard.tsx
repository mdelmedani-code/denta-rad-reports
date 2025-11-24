import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Download, Upload, Eye, Loader2, CheckCircle, Clock, FileEdit } from 'lucide-react';
import { toast } from 'sonner';
import CaseSearchFilters from '@/components/CaseSearchFilters';
import { formatCaseTitle } from '@/lib/caseUtils';
import { useCaseDownload } from '@/hooks/useCaseDownload';
import { StatusBadge } from '@/components/shared/StatusBadge';

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
  simple_id?: number;
  folder_name?: string;
}

export default function ReporterDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingReport, setUploadingReport] = useState<string | null>(null);
  const { downloadScan, downloadReport, downloadingId } = useCaseDownload();
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
        .eq('archived', false)
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

  // Removed: Now using useCaseDownload hook

  async function accessReport(caseId: string) {
    try {
      // Get report ID for this case
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select('id')
        .eq('case_id', caseId)
        .eq('is_superseded', false)
        .single();

      if (reportError) throw reportError;

      if (reportData?.id) {
        navigate(`/admin/reports/${reportData.id}`);
      } else {
        throw new Error('Report not found');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to access report');
      console.error('Access report error:', error);
    }
  }

  async function uploadReport(caseId: string, folderName: string) {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Validate file type
      if (file.type !== 'application/pdf') {
        toast.error('Please upload a PDF file');
        return;
      }

      setUploadingReport(caseId);
      
      try {
        toast.info('Uploading report...');

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('reports')
          .upload(`${folderName}/report.pdf`, file, {
            contentType: 'application/pdf',
            upsert: true // Allow overwriting if reporter uploads again
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Failed to upload report: ${uploadError.message}`);
        }

        // Update case status
        const { error: updateError } = await supabase
          .from('cases')
          .update({
            status: 'report_ready',
            updated_at: new Date().toISOString(),
            completed_at: new Date().toISOString()
          })
          .eq('id', caseId);

        if (updateError) {
          throw new Error('Failed to update case status');
        }

        toast.success('Report uploaded successfully!');
        
        // Refresh case list
        await fetchCases();
      } catch (error: any) {
        toast.error(error.message || 'Failed to upload report');
        console.error('Upload error:', error);
      } finally {
        setUploadingReport(null);
      }
    };

    input.click();
  }

  // Removed: Now using formatCaseTitle from lib/caseUtils.ts

  // Removed: Now using StatusBadge component

  // Filter cases
  const filteredCases = useMemo(() => {
    return cases.filter(caseData => {
      if (searchFilters.patientName && 
          !caseData.patient_name.toLowerCase().includes(searchFilters.patientName.toLowerCase())) {
        return false;
      }

      if (searchFilters.patientId && 
          !caseData.patient_id.toLowerCase().includes(searchFilters.patientId.toLowerCase())) {
        return false;
      }

      const caseDate = new Date(caseData.created_at);
      if (searchFilters.dateFrom && caseDate < new Date(searchFilters.dateFrom)) {
        return false;
      }
      if (searchFilters.dateTo && caseDate > new Date(searchFilters.dateTo)) {
        return false;
      }

      if (searchFilters.urgency && caseData.urgency !== searchFilters.urgency) {
        return false;
      }

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
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{formatCaseTitle(caseData.simple_id, caseData.patient_name)}</CardTitle>
                    <CardDescription>
                      {caseData.folder_name && (
                        <span className="block text-xs font-mono mb-1">Folder: {caseData.folder_name}</span>
                      )}
                      <div className="flex flex-col sm:flex-row sm:gap-4 gap-1 text-xs">
                        <span>Patient ID: {caseData.patient_id}</span>
                        <span>DOB: {caseData.patient_dob}</span>
                        <span className="font-semibold text-primary">Uploaded: {new Date(caseData.created_at).toLocaleDateString('en-GB')}</span>
                      </div>
                    </CardDescription>
                  </div>
                  <StatusBadge status={caseData.status as any} />
                </div>
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
                  onClick={() => navigate(`/reporter/report/${caseData.id}`)}
                  variant="default"
                  size="sm"
                >
                  <FileEdit className="h-4 w-4 mr-2" />
                  Create Report
                </Button>
                
                <Button 
                  onClick={() => downloadScan(caseData.id, caseData.folder_name || `${caseData.patient_id}_${caseData.id}`)}
                  disabled={downloadingId === caseData.id}
                  variant="outline"
                  size="sm"
                >
                  {downloadingId === caseData.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Download DICOM
                </Button>

                <Button 
                  onClick={() => uploadReport(caseData.id, caseData.folder_name || `${caseData.patient_id}_${caseData.id}`)}
                  disabled={uploadingReport === caseData.id}
                  size="sm"
                  variant="outline"
                >
                  {uploadingReport === caseData.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload PDF (Legacy)
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
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{formatCaseTitle(caseData.simple_id, caseData.patient_name)}</CardTitle>
                    <CardDescription>
                      {caseData.folder_name && (
                        <span className="block text-xs font-mono mb-1">Folder: {caseData.folder_name}</span>
                      )}
                      <div className="flex flex-col sm:flex-row sm:gap-4 gap-1 text-xs">
                        <span className="font-semibold text-primary">Uploaded: {new Date(caseData.created_at).toLocaleDateString('en-GB')}</span>
                        <span className="font-semibold text-green-600">Completed: {caseData.completed_at ? new Date(caseData.completed_at).toLocaleDateString('en-GB') : 'Unknown'}</span>
                      </div>
                    </CardDescription>
                  </div>
                  <StatusBadge status={caseData.status as any} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
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
                      <p className="font-semibold">Patient ID:</p>
                      <p className="text-muted-foreground">{caseData.patient_id}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button 
                  onClick={() => accessReport(caseData.id)}
                  variant="default"
                  size="sm"
                >
                  <FileEdit className="h-4 w-4 mr-2" />
                  Access Report
                </Button>
                
                <Button 
                  onClick={() => downloadReport(caseData.id, caseData.folder_name || `${caseData.patient_id}_${caseData.id}`)}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>

                <Button 
                  onClick={() => downloadScan(caseData.id, caseData.folder_name || `${caseData.patient_id}_${caseData.id}`)}
                  disabled={downloadingId === caseData.id}
                  variant="outline"
                  size="sm"
                >
                  {downloadingId === caseData.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Download DICOM
                </Button>
              </CardFooter>
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
