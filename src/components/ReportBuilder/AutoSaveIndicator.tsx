import { CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutoSaveIndicatorProps {
  status: 'saved' | 'saving' | 'unsaved';
  lastSaved?: Date;
}

export const AutoSaveIndicator = ({ status, lastSaved }: AutoSaveIndicatorProps) => {
  const getTimeAgo = () => {
    if (!lastSaved) return '';
    const seconds = Math.floor((new Date().getTime() - lastSaved.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return lastSaved.toLocaleDateString();
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      {status === 'saving' && (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Saving...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-green-600">
            Saved {getTimeAgo()}
          </span>
        </>
      )}
      {status === 'unsaved' && (
        <span className="text-amber-600">Unsaved changes</span>
      )}
    </div>
  );
};