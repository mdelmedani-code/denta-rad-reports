import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, DollarSign, Activity } from 'lucide-react';

interface ClinicalDetailsCardProps {
  caseData: any;
}

export function ClinicalDetailsCard({ caseData }: ClinicalDetailsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Clinical Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Indication */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm font-medium text-muted-foreground">
              Clinical Question / Indication
            </div>
          </div>
          <div className="pl-6 text-foreground bg-muted/50 p-4 rounded-lg">
            {caseData.clinical_question || 'Not provided'}
          </div>
        </div>

        {/* Examination Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium text-muted-foreground">
                Examination Type
              </div>
            </div>
            <Badge variant="outline" className="text-sm">
              {caseData.field_of_view?.replace(/_/g, ' ').toUpperCase() || 'CBCT Scan'}
            </Badge>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium text-muted-foreground">
                Payment Status
              </div>
            </div>
            <Badge 
              variant={caseData.billed ? 'default' : 'secondary'}
              className={caseData.billed ? 'bg-primary' : 'bg-muted'}
            >
              {caseData.billed ? 'Billed' : 'Pending'}
            </Badge>
          </div>
        </div>

        {/* Urgency */}
        {caseData.urgency && (
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">
              Priority Level
            </div>
            <Badge 
              variant={caseData.urgency === 'urgent' ? 'destructive' : 'secondary'}
            >
              {caseData.urgency.charAt(0).toUpperCase() + caseData.urgency.slice(1)}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
