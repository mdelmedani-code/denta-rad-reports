import { supabase } from '@/integrations/supabase/client';
import { Case } from '@/types/case';

export const caseService = {
  async fetchAll(): Promise<Case[]> {
    const { data, error } = await supabase
      .from('cases')
      .select(`
        *,
        clinics (
          name,
          contact_email
        ),
        reports!reports_case_id_fkey (
          id
        )
      `)
      .order('upload_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async fetchById(id: string): Promise<Case> {
    const { data, error } = await supabase
      .from('cases')
      .select(`
        *,
        clinics:clinic_id (name)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async fetchIncomeStats() {
    const [weeklyResult, monthlyResult] = await Promise.all([
      supabase.rpc('get_weekly_income_stats'),
      supabase.rpc('get_monthly_income_stats'),
    ]);

    if (weeklyResult.error) throw weeklyResult.error;
    if (monthlyResult.error) throw monthlyResult.error;

    return {
      weekly: weeklyResult.data?.[0] || null,
      monthly: monthlyResult.data?.[0] || null,
    };
  },

  async create(caseData: any) {
    const { data, error } = await supabase
      .from('cases')
      .insert(caseData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateStatus(
    id: string,
    status: 'uploaded' | 'in_progress' | 'report_ready' | 'awaiting_payment'
  ) {
    const { error } = await supabase
      .from('cases')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
  },

  async delete(ids: string[]) {
    const { error } = await supabase
      .from('cases')
      .delete()
      .in('id', ids);

    if (error) throw error;
  },
};
