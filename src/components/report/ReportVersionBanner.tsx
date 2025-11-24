import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface ReportVersionBannerProps {
  message: string;
  canReopen?: boolean;
  onReopen?: () => void;
}

export const ReportVersionBanner = ({
  message,
  canReopen = false,
  onReopen,
}: ReportVersionBannerProps) => {
  return (
    <Alert className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-amber-900 dark:text-amber-100">{message}</span>
        {canReopen && onReopen && (
          <Button variant="outline" size="sm" onClick={onReopen}>
            Create New Version
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};
