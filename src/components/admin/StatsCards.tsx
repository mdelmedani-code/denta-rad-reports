import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, Upload, Clock, FileText } from 'lucide-react';

interface StatsCardsProps {
  total: number;
  uploaded: number;
  inProgress: number;
  ready: number;
  urgent: number;
}

export const StatsCards = ({ total, uploaded, inProgress, ready, urgent }: StatsCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm text-muted-foreground">Total Cases</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center">
            <Upload className="w-8 h-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm text-muted-foreground">Uploaded</p>
              <p className="text-2xl font-bold">{uploaded}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold">{inProgress}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center">
            <FileText className="w-8 h-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm text-muted-foreground">Reports Ready</p>
              <p className="text-2xl font-bold">{ready}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm text-muted-foreground">Urgent</p>
              <p className="text-2xl font-bold">{urgent}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
