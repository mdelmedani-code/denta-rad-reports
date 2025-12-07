import { supabase } from '@/integrations/supabase/client';

export const reportService = {
  async fetchCaseWithReport(caseId: string) {
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select(`
        *,
        clinics:clinic_id (name)
      `)
      .eq('id', caseId)
      .single();

    if (caseError) throw caseError;

    let { data: reportData, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('case_id', caseId)
      .eq('is_superseded', false)
      .maybeSingle();

    if (reportError && reportError.code !== 'PGRST116') throw reportError;

    return {
      caseData: {
        ...caseData,
        clinic: caseData.clinics,
      },
      reportData,
    };
  },

  async createReport(caseId: string, initialData: any) {
    const { data, error } = await supabase
      .from('reports')
      .insert({
        case_id: caseId,
        clinical_history: initialData.clinical_question || '',
        report_content: '',
        version: 1,
        is_superseded: false,
        can_reopen: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async saveReport(reportId: string, content: any) {
    const { error } = await supabase
      .from('reports')
      .update({
        clinical_history: content.clinicalHistory,
        report_content: content.reportContent,
        last_saved_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (error) throw error;
  },

  async fetchReportImages(reportId: string) {
    const { data, error } = await supabase
      .from('report_images')
      .select('*')
      .eq('report_id', reportId)
      .order('position');

    if (error) throw error;
    
    // Generate fresh signed URLs for each image since stored URLs may have expired
    const imagesWithFreshUrls = await Promise.all(
      (data || []).map(async (img) => {
        // Extract the file path from the stored URL
        const url = new URL(img.image_url);
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/sign\/report-images\/(.+)/);
        
        if (pathMatch) {
          const filePath = decodeURIComponent(pathMatch[1].split('?')[0]);
          const { data: signedUrlData } = await supabase.storage
            .from('report-images')
            .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year
          
          if (signedUrlData?.signedUrl) {
            return { ...img, image_url: signedUrlData.signedUrl };
          }
        }
        
        return img;
      })
    );
    
    return imagesWithFreshUrls;
  },

  async createReportVersion(originalReportId: string, newVersionNumber: number) {
    const { data, error } = await supabase.rpc('create_report_version', {
      p_original_report_id: originalReportId,
      p_new_version_number: newVersionNumber,
    });

    if (error) throw error;
    return data;
  },

  async uploadReportPDF(folderName: string, pdfBlob: Blob) {
    const pdfPath = `${folderName}/report.pdf`;
    const { error } = await supabase.storage
      .from('reports')
      .upload(pdfPath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) throw error;
    return pdfPath;
  },

  async finalizeReport(reportId: string, pdfPath: string) {
    const { error } = await supabase
      .from('reports')
      .update({
        finalized_at: new Date().toISOString(),
        pdf_generated: true,
        pdf_storage_path: pdfPath,
      })
      .eq('id', reportId);

    if (error) throw error;
  },

  async updateCaseStatus(
    caseId: string,
    status: 'uploaded' | 'in_progress' | 'report_ready' | 'awaiting_payment'
  ) {
    const { error } = await supabase
      .from('cases')
      .update({ status })
      .eq('id', caseId);

    if (error) throw error;
  },
};
