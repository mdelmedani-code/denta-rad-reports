import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface ReportTemplate {
  id: string;
  name: string;
  description: string | null;
  indication_category: string;
  is_default: boolean;
  clinical_history_template: string | null;
  imaging_technique_template: string | null;
  findings_template: string;
  impression_template: string;
  recommendations_template: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

interface CaseData {
  patient_name: string;
  patient_dob: string | null;
  patient_internal_id: string | null;
  clinical_question: string;
  field_of_view: string;
  clinics: {
    name: string;
  };
}

/**
 * Calculate age from date of birth
 */
const calculateAge = (dob: string | null): string => {
  if (!dob) return "[Age]";
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age.toString();
};

/**
 * Format field of view for display
 */
const formatFieldOfView = (fov: string): string => {
  const fovMap: Record<string, string> = {
    'up_to_5x5': 'Small FOV - 5x5cm',
    'up_to_8x5': 'Medium FOV - 8x5cm',
    'up_to_8x8': 'Medium FOV - 8x8cm',
    'over_8x8': 'Large FOV - Over 8x8cm'
  };
  return fovMap[fov] || fov;
};

/**
 * Replace template variables with actual case data
 */
export const replaceTemplateVariables = (
  templateText: string,
  caseData: CaseData
): string => {
  const age = calculateAge(caseData.patient_dob);
  const fovFormatted = formatFieldOfView(caseData.field_of_view);
  
  const replacements: Record<string, string> = {
    '{patient_name}': caseData.patient_name || '[Patient Name]',
    '{patient_dob}': caseData.patient_dob 
      ? format(new Date(caseData.patient_dob), 'dd/MM/yyyy') 
      : '[DOB]',
    '{patient_age}': age,
    '{clinic_name}': caseData.clinics?.name || '[Clinic Name]',
    '{date}': format(new Date(), 'dd/MM/yyyy'),
    '{clinical_question}': caseData.clinical_question || '[Clinical Question]',
    '{fov}': fovFormatted,
    '{patient_id}': caseData.patient_internal_id || '[Patient ID]'
  };
  
  let result = templateText;
  Object.entries(replacements).forEach(([variable, value]) => {
    result = result.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value);
  });
  
  return result;
};

/**
 * Suggest template based on clinical question keywords
 */
export const suggestTemplate = async (
  clinicalQuestion: string
): Promise<ReportTemplate | null> => {
  try {
    // Keyword mapping to categories
    const keywords: Record<string, string> = {
      'tmj': 'TMJ',
      'temporomandibular': 'TMJ',
      'jaw joint': 'TMJ',
      'implant': 'Implant Planning',
      'dental implant': 'Implant Planning',
      'placement': 'Implant Planning',
      'wisdom': 'Third Molar',
      'third molar': 'Third Molar',
      'extraction': 'Third Molar',
      'airway': 'Airway',
      'sleep apnea': 'Airway',
      'osa': 'Airway',
      'pathology': 'Pathology',
      'lesion': 'Pathology',
      'cyst': 'Pathology',
      'tumor': 'Pathology',
      'swelling': 'Pathology'
    };
    
    const lowerQuestion = clinicalQuestion.toLowerCase();
    
    // Find matching category
    for (const [keyword, category] of Object.entries(keywords)) {
      if (lowerQuestion.includes(keyword)) {
        // Fetch default template for this category
        const { data, error } = await supabase
          .from('cbct_report_templates')
          .select('*')
          .eq('indication_category', category)
          .eq('is_default', true)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching template:', error);
          return null;
        }
        
        return data;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error suggesting template:', error);
    return null;
  }
};

/**
 * Track template usage
 */
export const trackTemplateUsage = async (templateId: string) => {
  try {
    await supabase.rpc('increment_template_usage', { template_id: templateId });
    
    // Log in audit trail
    await supabase.rpc('log_audit_event_secure', {
      p_action: 'template_used',
      p_resource_type: 'cbct_report_template',
      p_resource_id: templateId,
      p_details: { 
        timestamp: new Date().toISOString() 
      }
    });
  } catch (error) {
    console.error('Error tracking template usage:', error);
  }
};

/**
 * Fetch all templates
 */
export const fetchTemplates = async (category?: string): Promise<ReportTemplate[]> => {
  try {
    let query = supabase
      .from('cbct_report_templates')
      .select('*')
      .order('indication_category', { ascending: true })
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });
    
    if (category && category !== 'All') {
      query = query.eq('indication_category', category);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching templates:', error);
    return [];
  }
};

/**
 * Get unique categories
 */
export const getTemplateCategories = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('cbct_report_templates')
      .select('indication_category')
      .order('indication_category', { ascending: true });
    
    if (error) throw error;
    
    const categories = Array.from(new Set(data?.map(t => t.indication_category) || []));
    return ['All', ...categories];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return ['All'];
  }
};
