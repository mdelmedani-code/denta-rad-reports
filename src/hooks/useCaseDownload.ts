import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { logDicomDownload, logPdfDownload } from '@/lib/auditLog';

interface DownloadOptions {
  caseId: string;
  folderName: string;
  type: 'scan' | 'report';
}

interface PendingDownload {
  caseId: string;
  folderName: string;
  type: 'scan' | 'report';
  patientName?: string;
}

export function useCaseDownload() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [pendingDownload, setPendingDownload] = useState<PendingDownload | null>(null);
  const [showDataHandlingDialog, setShowDataHandlingDialog] = useState(false);

  const requestDownload = (
    caseId: string, 
    folderName: string, 
    type: 'scan' | 'report',
    patientName?: string
  ) => {
    setPendingDownload({ caseId, folderName, type, patientName });
    setShowDataHandlingDialog(true);
  };

  const confirmDownload = async () => {
    if (!pendingDownload) return;
    
    const { caseId, folderName, type } = pendingDownload;
    
    if (type === 'scan') {
      await executeDownloadScan(caseId, folderName);
    } else {
      await executeDownloadReport(caseId, folderName);
    }
    
    setPendingDownload(null);
  };

  const executeDownloadScan = async (caseId: string, folderName: string) => {
    setDownloadingId(caseId);
    try {
      toast.info('Downloading scan...');

      let data = null;
      let error = null;

      // Try scan.zip first
      ({ data, error } = await supabase.storage
        .from('cbct-scans')
        .download(`${folderName}/scan.zip`));

      // If that fails, try direct folder path
      if (error) {
        ({ data, error } = await supabase.storage
          .from('cbct-scans')
          .download(`${folderName}.zip`));
      }

      if (error) {
        throw new Error(`Failed to download scan: ${error.message}`);
      }

      // Trigger browser download
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folderName}_dicom.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Log successful download with data handling acknowledgment
      await logDicomDownload(caseId, `${folderName}_dicom.zip`);

      toast.success('Scan downloaded. Remember to delete local files after viewing.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to download scan');
      console.error('Download error:', error);
      
    } finally {
      setDownloadingId(null);
    }
  };

  const executeDownloadReport = async (caseId: string, folderName: string) => {
    setDownloadingId(caseId);
    try {
      toast.info('Downloading report...');

      // Get report to check for PDF path
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select('pdf_storage_path')
        .eq('case_id', caseId)
        .eq('is_superseded', false)
        .single();

      if (reportError) throw reportError;

      const pdfPath = reportData?.pdf_storage_path || `${folderName}/report.pdf`;

      // Download from Supabase Storage
      const { data, error } = await supabase.storage
        .from('reports')
        .download(pdfPath);

      if (error) {
        throw new Error(`Failed to download report: ${error.message}`);
      }

      // Trigger browser download
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folderName}_report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Log successful download with data handling acknowledgment
      await logPdfDownload(caseId);

      toast.success('Report downloaded successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to download report');
      console.error('Download error:', error);
    } finally {
      setDownloadingId(null);
    }
  };

  const cancelDownload = () => {
    setPendingDownload(null);
    setShowDataHandlingDialog(false);
  };

  return {
    requestDownload,
    confirmDownload,
    cancelDownload,
    downloadingId,
    isDownloading: downloadingId !== null,
    showDataHandlingDialog,
    setShowDataHandlingDialog,
    pendingDownload,
  };
}
