import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, BarChart3, TrendingUp, PoundSterling } from 'lucide-react';

interface IncomeStats {
  projected_income: number;
  income_so_far: number;
  total_cases: number;
  reported_cases: number;
}

interface IncomeTrackerProps {
  weeklyStats: IncomeStats | null;
  monthlyStats: IncomeStats | null;
}

export const IncomeTracker = ({ weeklyStats, monthlyStats }: IncomeTrackerProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
            This Week
          </CardTitle>
          <CardDescription>Income tracking for current week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm text-muted-foreground">Projected Income</p>
                  <p className="text-2xl font-bold">
                    £{weeklyStats?.projected_income?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {weeklyStats?.total_cases || 0} total cases
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center">
                <PoundSterling className="w-8 h-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm text-muted-foreground">Income So Far</p>
                  <p className="text-2xl font-bold">
                    £{weeklyStats?.income_so_far?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {weeklyStats?.reported_cases || 0} completed cases
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
            This Month
          </CardTitle>
          <CardDescription>Income tracking for current month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm text-muted-foreground">Projected Income</p>
                  <p className="text-2xl font-bold">
                    £{monthlyStats?.projected_income?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {monthlyStats?.total_cases || 0} total cases
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center">
                <PoundSterling className="w-8 h-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm text-muted-foreground">Income So Far</p>
                  <p className="text-2xl font-bold">
                    £{monthlyStats?.income_so_far?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {monthlyStats?.reported_cases || 0} completed cases
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
