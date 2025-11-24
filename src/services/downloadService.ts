import { supabase } from '@/integrations/supabase/client';
import JSZip from 'jszip';

export const downloadService = {
  async downloadCaseFiles(caseId: string, folderName: string) {
    try {
      // Check for pregenerated zip
      const { data: caseData } = await supabase
        .from('cases')
        .select('pregenerated_zip_path, zip_generation_status')
        .eq('id', caseId)
        .single();

      if (caseData?.pregenerated_zip_path && caseData.zip_generation_status === 'completed') {
        const { data: blob } = await supabase.storage
          .from('case-downloads')
          .download(caseData.pregenerated_zip_path);

        if (blob) {
          return { blob, filename: `${folderName}_complete.zip` };
        }
      }

      // Fallback: generate on-demand
      const zip = new JSZip();
      
      // Download scan files
      const { data: scanFiles } = await supabase.storage
        .from('cbct-scans')
        .list(folderName);

      if (scanFiles) {
        for (const file of scanFiles) {
          const { data: fileBlob } = await supabase.storage
            .from('cbct-scans')
            .download(`${folderName}/${file.name}`);

          if (fileBlob) {
            zip.file(`scan/${file.name}`, fileBlob);
          }
        }
      }

      // Download report if exists
      const { data: reportBlob } = await supabase.storage
        .from('reports')
        .download(`${folderName}/report.pdf`);

      if (reportBlob) {
        zip.file('report.pdf', reportBlob);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      return { blob, filename: `${folderName}_complete.zip` };
    } catch (error) {
      throw new Error(`Failed to download case files: ${error}`);
    }
  },

  triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
