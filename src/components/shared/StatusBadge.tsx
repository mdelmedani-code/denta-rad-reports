import { formatStatus, getStatusColorClasses } from '@/lib/caseUtils';
import { CaseStatus } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: CaseStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold',
      getStatusColorClasses(status),
      className
    )}>
      {formatStatus(status)}
    </span>
  );
}
