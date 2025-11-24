import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, Upload } from 'lucide-react';

interface UploadProgressProps {
  uploading: boolean;
  progress: number;
  onCancel: () => void;
}

export const UploadProgress = ({ uploading, progress, onCancel }: UploadProgressProps) => {
  if (!uploading) return null;

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary animate-pulse" />
              <span className="font-medium">Uploading case files...</span>
            </div>
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground">{Math.round(progress)}% complete</p>
        </div>
      </CardContent>
    </Card>
  );
};
