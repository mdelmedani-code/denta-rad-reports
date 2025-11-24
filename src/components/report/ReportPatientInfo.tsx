import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface ReportPatientInfoProps {
  caseData: {
    patient_name: string;
    patient_dob: string;
    patient_id: string;
    upload_date: string;
    clinic: { name: string };
    field_of_view: string;
    folder_name: string;
  };
}

export const ReportPatientInfo = ({ caseData }: ReportPatientInfoProps) => {
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Patient</div>
            <div className="font-medium">{caseData.patient_name}</div>
          </div>
          <div>
            <div className="text-muted-foreground">DOB</div>
            <div className="font-medium">
              {new Date(caseData.patient_dob).toLocaleDateString()}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Patient ID</div>
            <div className="font-medium">{caseData.patient_id}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Scan Date</div>
            <div className="font-medium">
              {new Date(caseData.upload_date).toLocaleDateString()}
            </div>
          </div>
        </div>
        <Separator className="my-4" />
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Referring Practice</div>
            <div className="font-medium">{caseData.clinic.name}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Field of View</div>
            <div className="font-medium">
              <Badge>{caseData.field_of_view.replace(/_/g, ' ')}</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
