import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, FileText, Building2 } from 'lucide-react';

interface PatientInfoCardProps {
  caseData: any;
  status: 'draft' | 'verified' | 'shared';
}

export function PatientInfoCard({ caseData, status }: PatientInfoCardProps) {
  const statusConfig = {
    draft: { label: 'Draft', variant: 'secondary' as const, color: 'bg-muted' },
    verified: { label: 'Verified', variant: 'default' as const, color: 'bg-primary' },
    shared: { label: 'Shared', variant: 'default' as const, color: 'bg-accent' },
  };

  const currentStatus = statusConfig[status];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Patient Information</CardTitle>
          <Badge variant={currentStatus.variant} className={currentStatus.color}>
            {currentStatus.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm text-muted-foreground">Patient Name</div>
                <div className="font-semibold text-foreground">
                  {caseData.patient_name}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm text-muted-foreground">Date of Birth</div>
                <div className="font-semibold text-foreground">
                  {new Date(caseData.patient_dob).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm text-muted-foreground">Patient ID</div>
                <div className="font-semibold text-foreground">
                  {caseData.patient_id || 'Not provided'}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm text-muted-foreground">Referring Practice</div>
                <div className="font-semibold text-foreground">
                  {caseData.clinic?.name || 'Not provided'}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm text-muted-foreground">Scan Date</div>
                <div className="font-semibold text-foreground">
                  {new Date(caseData.upload_date).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm text-muted-foreground">Report ID</div>
                <div className="font-semibold text-foreground font-mono text-sm">
                  {caseData.folder_name}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
