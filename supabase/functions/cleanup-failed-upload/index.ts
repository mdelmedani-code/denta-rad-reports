import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[cleanup-failed-upload] Starting cleanup...');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { caseId, dropboxPaths, storagePath } = await req.json();

    console.log('[cleanup-failed-upload] Cleaning case:', caseId);

    // ✅ FIX #3: Log cleanup action for GDPR audit trail (direct table insert)
    try {
      const { error: auditError } = await supabase
        .from('security_audit_log')
        .insert({
          user_id: user.id,
          action: 'delete_case',
          table_name: 'cases',
          details: {
            resource_id: caseId,
            reason: 'upload_failed_rollback',
            dropbox_paths_provided: dropboxPaths ? true : false,
            storage_path_provided: storagePath ? true : false,
            cleanup_timestamp: new Date().toISOString()
          },
          ip_address: req.headers.get('x-forwarded-for') || null,
          user_agent: req.headers.get('user-agent') || null
        });
      
      if (auditError) {
        console.error('[cleanup-failed-upload] ⚠️ Failed to create audit log:', auditError);
        // Don't fail cleanup if audit logging fails
      } else {
        console.log('[cleanup-failed-upload] ✅ Audit log created');
      }
    } catch (auditError) {
      console.error('[cleanup-failed-upload] Failed to log audit:', auditError);
      // Continue with cleanup even if audit fails
    }

    const results = {
      dropboxCleaned: false,
      storageCleaned: false,
      databaseCleaned: false
    };

    // 1. Clean Dropbox folders (if they were created)
    if (dropboxPaths?.scanPath || dropboxPaths?.reportPath) {
      try {
        const accessToken = await getDropboxAccessToken();

        // Delete scan folder
        if (dropboxPaths.scanPath) {
          console.log('[cleanup-failed-upload] Deleting Dropbox scan folder...');
          try {
            await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ path: dropboxPaths.scanPath.replace(/\/$/, '') })
            });
            console.log('[cleanup-failed-upload] ✅ Scan folder deleted');
          } catch (error) {
            console.log('[cleanup-failed-upload] ⚠️ Scan folder not found or already deleted');
          }
        }

        // Delete report folder
        if (dropboxPaths.reportPath) {
          console.log('[cleanup-failed-upload] Deleting Dropbox report folder...');
          try {
            await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ path: dropboxPaths.reportPath.replace(/\/$/, '') })
            });
            console.log('[cleanup-failed-upload] ✅ Report folder deleted');
          } catch (error) {
            console.log('[cleanup-failed-upload] ⚠️ Report folder not found or already deleted');
          }
        }

        results.dropboxCleaned = true;
      } catch (error) {
        console.error('[cleanup-failed-upload] Dropbox cleanup error:', error.message);
        // Continue anyway - best effort cleanup
      }
    }

    // 2. Clean Supabase Storage
    if (storagePath) {
      try {
        console.log('[cleanup-failed-upload] Deleting storage file...');
        const { error: storageError } = await supabase.storage
          .from('cbct-scans')
          .remove([storagePath]);
        
        if (!storageError) {
          results.storageCleaned = true;
          console.log('[cleanup-failed-upload] ✅ Storage file deleted');
        } else {
          console.log('[cleanup-failed-upload] ⚠️ Storage file not found or already deleted');
        }
      } catch (error) {
        console.error('[cleanup-failed-upload] Storage cleanup error:', error.message);
      }
    }

    // 3. Delete database record
    if (caseId) {
      try {
        console.log('[cleanup-failed-upload] Deleting database record...');
        const { error: deleteError } = await supabase
          .from('cases')
          .delete()
          .eq('id', caseId);
        
        if (!deleteError) {
          results.databaseCleaned = true;
          console.log('[cleanup-failed-upload] ✅ Database record deleted');
        }
      } catch (error) {
        console.error('[cleanup-failed-upload] Database cleanup error:', error.message);
      }
    }

    console.log('[cleanup-failed-upload] Cleanup complete:', results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        message: 'Resources cleaned up successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[cleanup-failed-upload] ERROR:', error);
    return new Response(
      JSON.stringify({ 
        error: { 
          code: 'CLEANUP_FAILED', 
          message: error.message 
        } 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getDropboxAccessToken(): Promise<string> {
  const appKey = Deno.env.get('DROPBOX_APP_KEY')!;
  const appSecret = Deno.env.get('DROPBOX_APP_SECRET')!;
  const refreshToken = Deno.env.get('DROPBOX_REFRESH_TOKEN')!;

  const response = await fetch('https://api.dropbox.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: appKey,
      client_secret: appSecret,
    }),
  });

  if (!response.ok) throw new Error('Failed to refresh Dropbox token');
  const data = await response.json();
  return data.access_token;
}
