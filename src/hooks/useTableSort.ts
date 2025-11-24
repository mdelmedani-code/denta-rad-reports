import { useState, useMemo } from 'react';

type SortDirection = 'asc' | 'desc' | null;

interface UseTableSortProps<T> {
  items: T[];
  initialSortKey?: keyof T;
  initialDirection?: SortDirection;
}

export const useTableSort = <T,>({
  items,
  initialSortKey,
  initialDirection = 'asc',
}: UseTableSortProps<T>) => {
  const [sortKey, setSortKey] = useState<keyof T | null>(initialSortKey || null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialDirection);

  const sortedItems = useMemo(() => {
    if (!sortKey || !sortDirection) return items;

    return [...items].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, sortKey, sortDirection]);

  const toggleSort = (key: keyof T) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  return {
    sortKey,
    sortDirection,
    sortedItems,
    toggleSort,
  };
};
