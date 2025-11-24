import { Badge } from '@/components/ui/badge';
import { FieldOfView } from '@/lib/constants';
import { formatFieldOfView } from '@/lib/caseUtils';

interface FieldOfViewBadgeProps {
  fieldOfView: FieldOfView;
  className?: string;
  showLabel?: boolean;
}

export function FieldOfViewBadge({ fieldOfView, className, showLabel = true }: FieldOfViewBadgeProps) {
  return (
    <Badge variant="outline" className={className}>
      {showLabel && 'FOV: '}{formatFieldOfView(fieldOfView)}
    </Badge>
  );
}
