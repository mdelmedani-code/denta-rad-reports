import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface BackupStatus {
  bucketName: string;
  fileCount: number;
  totalSize: number;
  lastBackup: string | null;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
}

interface BackupSummary {
  total: number;
  healthy: number;
  warning: number;
  critical: number;
}

export default function BackupMonitoring() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [backups, setBackups] = useState<BackupStatus[]>([]);
  const [summary, setSummary] = useState<BackupSummary | null>(null);

  useEffect(() => {
    checkBackups();
  }, []);

  async function checkBackups() {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('monitor-backups');

      if (error) throw error;

      setBackups(data.backups || []);
      setSummary(data.summary || null);
      
      if (data.summary?.critical > 0) {
        toast.error(`${data.summary.critical} critical backup issue(s) detected`);
      }
    } catch (error: any) {
      toast.error('Failed to check backups');
      console.error('Backup check error:', error);
    } finally {
      setLoading(false);
      setChecking(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Backup Monitoring</h1>
        <Button onClick={checkBackups} disabled={checking}>
          <RefreshCw className={`mr-2 h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Backups</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Healthy</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.healthy}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Warnings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{summary.warning}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Critical</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.critical}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {summary && summary.critical > 0 && (
        <Alert className="mb-6 border-red-500">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Critical backup issues detected. Please review and resolve immediately.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {backups.map((backup) => (
          <Card key={backup.bucketName}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(backup.status)}
                    {backup.bucketName}
                  </CardTitle>
                  <CardDescription className="mt-2">{backup.message}</CardDescription>
                </div>
                <Badge className={getStatusColor(backup.status)}>
                  {backup.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-semibold">File Count</p>
                  <p className="text-muted-foreground">{backup.fileCount}</p>
                </div>
                <div>
                  <p className="font-semibold">Total Size</p>
                  <p className="text-muted-foreground">{formatBytes(backup.totalSize)}</p>
                </div>
                <div>
                  <p className="font-semibold">Last Backup</p>
                  <p className="text-muted-foreground">
                    {backup.lastBackup 
                      ? new Date(backup.lastBackup).toLocaleString()
                      : 'Never'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
