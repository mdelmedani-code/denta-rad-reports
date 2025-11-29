import { Button } from '@/components/ui/button';
import { FileEdit, Download, Upload, Eye, Loader2 } from 'lucide-react';
import { CaseStatus } from '@/lib/constants';

interface CaseActionsProps {
  caseId: string;
  folderName: string;
  status: CaseStatus;
  role: 'clinic' | 'admin' | 'reporter';
  hasReport?: boolean;
  isDownloading?: boolean;
  isUploading?: boolean;
  onAccessReport?: () => void;
  onDownloadReport?: () => void;
  onDownloadScan?: () => void;
  onCreateReport?: () => void;
  onUploadReport?: () => void;
  onViewCase?: () => void;
  additionalActions?: React.ReactNode;
  layout?: 'horizontal' | 'vertical';
}

export function CaseActions({
  status,
  role,
  hasReport = false,
  isDownloading = false,
  isUploading = false,
  onAccessReport,
  onDownloadReport,
  onDownloadScan,
  onCreateReport,
  onUploadReport,
  onViewCase,
  additionalActions,
  layout = 'horizontal',
}: CaseActionsProps) {
  const wrapperClass = layout === 'vertical' ? 'flex flex-col gap-2 w-full' : 'flex flex-wrap gap-2';
  const buttonClass = layout === 'vertical' ? 'w-full' : '';

  // Clinic role actions
  if (role === 'clinic') {
    if (status === 'report_ready') {
      return (
        <div className={wrapperClass}>
          <Button 
            variant="default" 
            size="sm"
            onClick={onAccessReport}
            className={buttonClass}
          >
            <FileEdit className="h-4 w-4 mr-2" />
            Access Report
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onDownloadReport}
            disabled={isDownloading}
            className={buttonClass}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download
          </Button>
          {additionalActions}
        </div>
      );
    }
    
    return (
      <div className={wrapperClass}>
        <span className="text-sm text-muted-foreground py-2">
          Report in progress...
        </span>
        {additionalActions}
      </div>
    );
  }

  // Reporter role actions
  if (role === 'reporter') {
    if (status === 'uploaded' || status === 'in_progress') {
      return (
        <div className={wrapperClass}>
          <Button 
            onClick={onCreateReport}
            variant="default"
            size="sm"
            className={buttonClass}
          >
            <FileEdit className="h-4 w-4 mr-2" />
            {hasReport ? 'Continue Report' : 'Create Report'}
          </Button>
          <Button 
            onClick={onDownloadScan}
            disabled={isDownloading}
            variant="outline"
            size="sm"
            className={buttonClass}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download DICOM
          </Button>
          <Button 
            onClick={onUploadReport}
            disabled={isUploading}
            size="sm"
            variant="outline"
            className={buttonClass}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Upload PDF (Legacy)
          </Button>
          {additionalActions}
        </div>
      );
    }

    if (status === 'report_ready') {
      return (
        <div className={wrapperClass}>
          <Button 
            onClick={onDownloadReport}
            disabled={isDownloading}
            variant="outline"
            size="sm"
            className={buttonClass}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download Report
          </Button>
          {additionalActions}
        </div>
      );
    }
  }

  // Admin role actions
  if (role === 'admin') {
    return (
      <div className={wrapperClass}>
        <Button
          onClick={onViewCase}
          variant="outline"
          size="sm"
          className={buttonClass}
        >
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
        {additionalActions}
      </div>
    );
  }

  return null;
}
