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
        technique: '',
        findings: '',
        impression: '',
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
        technique: content.technique,
        findings: content.findings,
        impression: content.impression,
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
    return data || [];
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
