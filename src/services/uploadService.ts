import { supabase } from '@/integrations/supabase/client';
import { validateDICOMZip } from '@/services/fileValidationService';
import { sanitizeText, sanitizePatientRef } from '@/utils/sanitization';

export const uploadService = {
  async validateFile(file: File) {
    return await validateDICOMZip(file);
  },

  async generateFolderName(patientName: string, patientId: string): Promise<string> {
    const cleanName = patientName
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .trim();

    const { data: existingCases } = await supabase
      .from('cases')
      .select('folder_name')
      .ilike('folder_name', `${cleanName}_%`)
      .order('created_at', { ascending: false });

    let maxCounter = 0;
    if (existingCases && existingCases.length > 0) {
      for (const c of existingCases) {
        const match = c.folder_name?.match(/_(\d{5})$/);
        if (match) {
          const counter = parseInt(match[1], 10);
          if (counter > maxCounter) maxCounter = counter;
        }
      }
    }

    const newCounter = maxCounter + 1;
    const paddedCounter = String(newCounter).padStart(5, '0');

    return `${cleanName}_${paddedCounter}`;
  },

  sanitizeFormData(formData: any) {
    return {
      patientName: sanitizeText(formData.patientName),
      patientInternalId: formData.patientInternalId
        ? sanitizePatientRef(formData.patientInternalId)
        : '',
      clinicalQuestion: sanitizeText(formData.clinicalQuestion),
      specialInstructions: formData.specialInstructions
        ? sanitizeText(formData.specialInstructions)
        : null,
    };
  },

  async fetchPrice(fieldOfView: string): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from('pricing_rules')
        .select('price, currency')
        .eq('field_of_view', fieldOfView)
        .is('effective_to', null)
        .order('effective_from', { ascending: false })
        .limit(1)
        .single();

      if (error) return null;
      return data ? Number(data.price) : null;
    } catch {
      return null;
    }
  },
};
