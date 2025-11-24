import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Case } from '@/types/case';
import { StatusBadge } from './StatusBadge';
import { UrgencyBadge } from './UrgencyBadge';
import { FieldOfViewBadge } from './FieldOfViewBadge';
import { Badge } from '@/components/ui/badge';
import { PoundSterling } from 'lucide-react';
import { formatCaseTitle } from '@/lib/caseUtils';
import { cn } from '@/lib/utils';

export interface CaseCardProps {
  case: Case;
  actions?: React.ReactNode;
  showClinic?: boolean;
  showCost?: boolean;
  showSelection?: boolean;
  selected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
  className?: string;
  layout?: 'compact' | 'detailed';
}

export function CaseCard({
  case: caseData,
  actions,
  showClinic = false,
  showCost = false,
  showSelection = false,
  selected = false,
  onSelectionChange,
  className,
  layout = 'detailed',
}: CaseCardProps) {
  const uploadDate = caseData.upload_date || caseData.created_at;
  const title = formatCaseTitle(caseData.simple_id, caseData.patient_name);

  return (
    <Card className={cn('border border-border shadow-sm hover:shadow-md transition-shadow', className)}>
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-start gap-3 flex-1">
            {showSelection && (
              <Checkbox
                checked={selected}
                onCheckedChange={onSelectionChange}
                className="mt-1"
              />
            )}
            <div className="flex-1">
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>
                {caseData.folder_name && (
                  <span className="block text-xs font-mono mb-1">
                    Folder: {caseData.folder_name}
                  </span>
                )}
                <div className="flex flex-col gap-1 text-xs">
                  {showClinic && caseData.clinics && (
                    <div>
                      <span className="font-medium">{caseData.clinics.name}</span>
                      {caseData.clinics.contact_email && (
                        <span className="text-muted-foreground"> • {caseData.clinics.contact_email}</span>
                      )}
                    </div>
                  )}
                  {caseData.patient_id && (
                    <span>Patient ID: {caseData.patient_id}</span>
                  )}
                  {caseData.patient_dob && (
                    <span>DOB: {caseData.patient_dob}</span>
                  )}
                  {uploadDate && (
                    <span className="font-semibold text-primary">
                      Uploaded: {new Date(uploadDate).toLocaleDateString('en-GB')}
                    </span>
                  )}
                  {caseData.completed_at && (
                    <span className="font-semibold text-green-600">
                      Completed: {new Date(caseData.completed_at).toLocaleDateString('en-GB')}
                    </span>
                  )}
                </div>
              </CardDescription>
            </div>
          </div>
          <StatusBadge status={caseData.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {layout === 'detailed' && (
          <div>
            <p className="text-sm font-semibold">Clinical Question:</p>
            <p className="text-sm text-muted-foreground">{caseData.clinical_question}</p>
          </div>
        )}
        
        <div className="flex flex-wrap gap-2 items-center">
          <UrgencyBadge urgency={caseData.urgency} className="text-xs" />
          <FieldOfViewBadge fieldOfView={caseData.field_of_view} className="text-xs" />
          {showCost && caseData.estimated_cost !== undefined && (
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <PoundSterling className="h-3 w-3" />
              {caseData.estimated_cost.toFixed(2)}
            </Badge>
          )}
        </div>

        {layout === 'compact' && caseData.clinical_question && (
          <p className="text-sm text-muted-foreground line-clamp-2">{caseData.clinical_question}</p>
        )}
      </CardContent>

      {actions && (
        <CardFooter className="flex flex-col sm:flex-row gap-2 border-t pt-4">
          {actions}
        </CardFooter>
      )}
    </Card>
  );
}
