import { Badge } from '@/components/ui/badge';
import { UrgencyLevel } from '@/lib/constants';

interface UrgencyBadgeProps {
  urgency: UrgencyLevel;
  className?: string;
}

export function UrgencyBadge({ urgency, className }: UrgencyBadgeProps) {
  return (
    <Badge 
      variant={urgency === 'urgent' ? 'destructive' : 'secondary'}
      className={className}
    >
      {urgency === 'urgent' ? 'Urgent' : 'Standard'}
    </Badge>
  );
}
