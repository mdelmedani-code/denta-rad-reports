import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Shield, AlertTriangle, Lock, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function SecurityDashboard() {
  const [stats, setStats] = useState({
    failedLogins: 0,
    unauthorizedAccess: 0,
    activeUsers: 0,
    suspiciousActivity: 0
  });

  useEffect(() => {
    loadSecurityStats();
    const interval = setInterval(loadSecurityStats, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  async function loadSecurityStats() {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      // Failed logins in last 24 hours
      const { count: failedLogins } = await supabase
        .from('login_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('successful', false)
        .gte('attempt_time', oneDayAgo);

      // Unauthorized access attempts
      const { count: unauthorizedAccess } = await supabase
        .from('security_audit_log')
        .select('*', { count: 'exact', head: true })
        .eq('action', 'unauthorized_access_attempt')
        .gte('created_at', oneDayAgo);

      // Active users in last hour
      const { count: activeUsers } = await supabase
        .from('security_audit_log')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', oneHourAgo);

      setStats({
        failedLogins: failedLogins || 0,
        unauthorizedAccess: unauthorizedAccess || 0,
        activeUsers: activeUsers || 0,
        suspiciousActivity: (failedLogins || 0) + (unauthorizedAccess || 0)
      });

    } catch (error) {
      console.error('Error loading security stats:', error);
    }
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Security Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Failed Logins */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-8 h-8 text-orange-500" />
                <span className="text-3xl font-bold">
                  {stats.failedLogins}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Failed Logins (24h)</p>
            </CardContent>
          </Card>

          {/* Unauthorized Access */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Lock className="w-8 h-8 text-destructive" />
                <span className="text-3xl font-bold">
                  {stats.unauthorizedAccess}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Unauthorized Access (24h)</p>
            </CardContent>
          </Card>

          {/* Active Users */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-8 h-8 text-green-600" />
                <span className="text-3xl font-bold">
                  {stats.activeUsers}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Active Users (1h)</p>
            </CardContent>
          </Card>

          {/* Suspicious Activity */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Shield className="w-8 h-8 text-purple-600" />
                <span className="text-3xl font-bold">
                  {stats.suspiciousActivity}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Suspicious Events (24h)</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-yellow-900 mb-2">
              🔔 Alert Thresholds
            </h3>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Failed Logins &gt; 20/hour: Potential brute force attack</li>
              <li>• Unauthorized Access &gt; 5/hour: Investigate immediately</li>
              <li>• Suspicious Activity &gt; 50/day: Review security logs</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
