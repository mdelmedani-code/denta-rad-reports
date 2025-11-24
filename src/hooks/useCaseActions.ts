import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { toast } from '@/lib/toast';

type CaseStatus = 'uploaded' | 'in_progress' | 'report_ready' | 'awaiting_payment';

export const useCaseActions = () => {
  const [loading, setLoading] = useState(false);

  const updateCaseStatus = async (caseId: string, newStatus: CaseStatus) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('cases')
        .update({ status: newStatus })
        .eq('id', caseId);

      if (error) throw error;

      toast.success('Status updated', 'Case status has been updated successfully');
      return true;
    } catch (error) {
      handleError(error, 'Failed to update case status');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteCases = async (caseIds: string[], password: string) => {
    setLoading(true);
    try {
      // Verify password
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('User not found');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (signInError) throw new Error('Incorrect password');

      // Delete cases
      const { error } = await supabase
        .from('cases')
        .delete()
        .in('id', caseIds);

      if (error) throw error;

      toast.success('Cases deleted', `${caseIds.length} cases have been permanently deleted`);
      return true;
    } catch (error) {
      handleError(error, 'Failed to delete cases');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    updateCaseStatus,
    deleteCases,
    loading,
  };
};
