import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackupStatus {
  bucketName: string;
  fileCount: number;
  totalSize: number;
  lastBackup: string | null;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const buckets = ['cbct-scans', 'reports'];
    const backupStatuses: BackupStatus[] = [];
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const bucketName of buckets) {
      try {
        // List files in bucket
        const { data: files, error: listError } = await supabaseClient
          .storage
          .from(bucketName)
          .list('', { limit: 1000 });

        if (listError) {
          console.error(`Error listing ${bucketName}:`, listError);
          backupStatuses.push({
            bucketName,
            fileCount: 0,
            totalSize: 0,
            lastBackup: null,
            status: 'critical',
            message: `Failed to list files: ${listError.message}`,
          });
          continue;
        }

        const fileCount = files?.length || 0;
        const totalSize = files?.reduce((sum, file) => sum + (file.metadata?.size || 0), 0) || 0;

        // Check last backup from monitoring table
        const { data: lastBackupRecord } = await supabaseClient
          .from('backup_monitoring')
          .select('backup_date, status')
          .eq('backup_type', bucketName)
          .order('backup_date', { ascending: false })
          .limit(1)
          .single();

        const lastBackupDate = lastBackupRecord?.backup_date 
          ? new Date(lastBackupRecord.backup_date) 
          : null;

        let status: 'healthy' | 'warning' | 'critical' = 'healthy';
        let message = 'Backup is current';

        if (!lastBackupDate) {
          status = 'warning';
          message = 'No backup records found';
        } else if (lastBackupDate < twentyFourHoursAgo) {
          status = 'critical';
          message = `Last backup was ${Math.floor((Date.now() - lastBackupDate.getTime()) / (1000 * 60 * 60))} hours ago`;
        } else if (lastBackupRecord?.status !== 'success') {
          status = 'warning';
          message = `Last backup status: ${lastBackupRecord.status}`;
        }

        backupStatuses.push({
          bucketName,
          fileCount,
          totalSize,
          lastBackup: lastBackupDate?.toISOString() || null,
          status,
          message,
        });

        // Log monitoring check
        await supabaseClient
          .from('backup_monitoring')
          .insert({
            backup_type: `${bucketName}_check`,
            file_count: fileCount,
            total_size: totalSize,
            status: status === 'healthy' ? 'success' : status,
            error_message: status !== 'healthy' ? message : null,
          });

      } catch (error) {
        console.error(`Error checking ${bucketName}:`, error);
        backupStatuses.push({
          bucketName,
          fileCount: 0,
          totalSize: 0,
          lastBackup: null,
          status: 'critical',
          message: error.message,
        });
      }
    }

    // Check if any critical issues and send alert
    const criticalIssues = backupStatuses.filter(s => s.status === 'critical');
    if (criticalIssues.length > 0) {
      console.error('CRITICAL BACKUP ISSUES:', criticalIssues);
      
      // Send notification to admins
      const { data: admins } = await supabaseClient
        .from('profiles')
        .select('id, email')
        .eq('role', 'admin');

      if (admins) {
        for (const admin of admins) {
          await supabaseClient
            .from('notifications')
            .insert({
              recipient_id: admin.id,
              type: 'backup_alert',
              title: 'Critical Backup Alert',
              message: `Backup issues detected: ${criticalIssues.map(i => i.bucketName).join(', ')}`,
              data: { issues: criticalIssues },
            });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        backups: backupStatuses,
        summary: {
          total: backupStatuses.length,
          healthy: backupStatuses.filter(s => s.status === 'healthy').length,
          warning: backupStatuses.filter(s => s.status === 'warning').length,
          critical: criticalIssues.length,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Backup monitoring error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
