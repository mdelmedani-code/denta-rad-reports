import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TemplateSection {
  id: string;
  label: string;
  enabled: boolean;
  order: number;
}

export interface TemplateData {
  layout: string;
  headerHeight: number;
  footerHeight: number;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  sections: TemplateSection[];
  typography: {
    headingSize: number;
    subheadingSize: number;
    bodySize: number;
    captionSize: number;
  };
}

export interface PDFTemplate {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  template_data: TemplateData;
  created_at: string;
  updated_at: string;
}

export interface ClinicBranding {
  id: string;
  clinic_id: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  header_text: string | null;
  footer_text: string | null;
  template_id: string | null;
  created_at: string;
  updated_at: string;
}

export const usePDFTemplate = (clinicId?: string) => {
  return useQuery({
    queryKey: ["pdf-template", clinicId],
    queryFn: async () => {
      // Get clinic branding
      const { data: branding, error: brandingError } = await supabase
        .from("clinic_branding")
        .select("*")
        .eq("clinic_id", clinicId!)
        .maybeSingle();

      if (brandingError) throw brandingError;

      // Get template (either clinic-specific or default)
      let templateId = branding?.template_id;
      
      if (!templateId) {
        const { data: defaultTemplate, error: defaultError } = await supabase
          .from("pdf_templates")
          .select("*")
          .eq("is_default", true)
          .single();

        if (defaultError) throw defaultError;
        templateId = defaultTemplate.id;
      }

      const { data: template, error: templateError } = await supabase
        .from("pdf_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (templateError) throw templateError;

      return {
        template: {
          ...template,
          template_data: template.template_data as unknown as TemplateData,
        } as PDFTemplate,
        branding: branding as ClinicBranding | null,
      };
    },
    enabled: !!clinicId,
  });
};

export const useAllTemplates = () => {
  return useQuery({
    queryKey: ["pdf-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pdf_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data.map(t => ({
        ...t,
        template_data: t.template_data as unknown as TemplateData,
      })) as PDFTemplate[];
    },
  });
};

export const useUpdateClinicBranding = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (branding: Partial<ClinicBranding> & { clinic_id: string }) => {
      const { data: existing } = await supabase
        .from("clinic_branding")
        .select("id")
        .eq("clinic_id", branding.clinic_id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("clinic_branding")
          .update(branding)
          .eq("clinic_id", branding.clinic_id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("clinic_branding")
          .insert(branding)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pdf-template"] });
      toast.success("Branding updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update branding: " + error.message);
    },
  });
};

export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, template_data }: { id: string; template_data: TemplateData }) => {
      const { data, error } = await supabase
        .from("pdf_templates")
        .update({ template_data: template_data as any })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pdf-templates"] });
      queryClient.invalidateQueries({ queryKey: ["pdf-template"] });
      toast.success("Template updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update template: " + error.message);
    },
  });
};