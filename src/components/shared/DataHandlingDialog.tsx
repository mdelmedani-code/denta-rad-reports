import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Shield, Trash2, Lock } from 'lucide-react';

interface DataHandlingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  downloadType: 'scan' | 'report';
  patientName?: string;
}

export function DataHandlingDialog({
  open,
  onOpenChange,
  onConfirm,
  downloadType,
  patientName,
}: DataHandlingDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  const handleConfirm = () => {
    if (acknowledged) {
      onConfirm();
      setAcknowledged(false);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setAcknowledged(false);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Data Handling Acknowledgment
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-left">
              <p>
                You are downloading {downloadType === 'scan' ? 'DICOM scan data' : 'a report'} 
                {patientName && <> for <strong>{patientName}</strong></>}.
              </p>
              
              <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Lock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <span>Use only on an encrypted, authorized device</span>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <span>Do not share or transfer to unauthorized parties</span>
                </div>
                <div className="flex items-start gap-2">
                  <Trash2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <span>Delete local files after viewing/processing</span>
                </div>
              </div>

              <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                  id="acknowledge"
                  checked={acknowledged}
                  onCheckedChange={(checked) => setAcknowledged(checked === true)}
                />
                <Label 
                  htmlFor="acknowledge" 
                  className="text-sm font-medium leading-tight cursor-pointer"
                >
                  I acknowledge my responsibility to handle this patient data securely and delete local copies after use
                </Label>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            disabled={!acknowledged}
          >
            Download
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
