import { Badge } from '@/components/ui/badge';
import { formatStatus, getStatusVariant } from '@/lib/caseUtils';
import { CaseStatus } from '@/lib/constants';

interface StatusBadgeProps {
  status: CaseStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge variant={getStatusVariant(status)} className={className}>
      {formatStatus(status)}
    </Badge>
  );
}
