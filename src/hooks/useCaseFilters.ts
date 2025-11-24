import { useState, useEffect, useMemo } from 'react';
import { Case } from '@/types/case';

interface UseCaseFiltersProps {
  cases: Case[];
}

export const useCaseFilters = ({ cases }: UseCaseFiltersProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');

  const filteredCases = useMemo(() => {
    let filtered = cases;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (case_) =>
          case_.patient_name.toLowerCase().includes(search) ||
          case_.clinical_question.toLowerCase().includes(search) ||
          case_.clinics?.name?.toLowerCase().includes(search)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((case_) => case_.status === statusFilter);
    }

    if (urgencyFilter !== 'all') {
      filtered = filtered.filter((case_) => case_.urgency === urgencyFilter);
    }

    return filtered;
  }, [cases, searchTerm, statusFilter, urgencyFilter]);

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    urgencyFilter,
    setUrgencyFilter,
    filteredCases,
  };
};
