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
    console.log('[get-report-download-link] Starting...');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    console.log('[get-report-download-link] User authenticated:', user.id);

    const { caseId } = await req.json();
    if (!caseId) throw new Error('Case ID is required');

    console.log('[get-report-download-link] Case ID:', caseId);

    // Get case data
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, folder_name, dropbox_report_path, status, clinic_id')
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) throw new Error('Case not found');

    console.log('[get-report-download-link] Case:', caseData.folder_name);

    // Verify clinic has access
    const { data: profile } = await supabase
      .from('profiles')
      .select('clinic_id, role')
      .eq('id', user.id)
      .single();

    if (!profile) throw new Error('Profile not found');

    const isAuthorized = 
      profile.role === 'admin' || 
      profile.role === 'reporter' || 
      profile.clinic_id === caseData.clinic_id;

    if (!isAuthorized) throw new Error('Forbidden - cannot access other clinic's reports');

    console.log('[get-report-download-link] ✅ Clinic authorized');

    if (caseData.status !== 'report_ready') throw new Error('Report not yet available');

    // Get Dropbox access token
    const accessToken = await getDropboxAccessToken();

    // List files in Reports folder
    console.log('[get-report-download-link] Listing files in:', caseData.dropbox_report_path);
    
    const listResponse = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: caseData.dropbox_report_path.replace(/\/$/, '')
      })
    });

    if (!listResponse.ok) {
      const error = await listResponse.json();
      throw new Error(`Failed to list Dropbox folder: ${JSON.stringify(error)}`);
    }

    const listData = await listResponse.json();

    // Find latest report PDF
    const reportPattern = /^\d{4}-\d{2}-\d{2}_report.*\.pdf$/;
    const reportFiles = listData.entries.filter((entry: any) => 
      entry['.tag'] === 'file' && reportPattern.test(entry.name)
    );

    console.log('[get-report-download-link] Found', reportFiles.length, 'report files');

    if (reportFiles.length === 0) throw new Error('No report file found in Dropbox folder');

    reportFiles.sort((a: any, b: any) => b.name.localeCompare(a.name));
    const latestReport = reportFiles[0];
    const reportPath = latestReport.path_display;

    console.log('[get-report-download-link] Latest report:', latestReport.name);

    // Generate temporary link
    console.log('[get-report-download-link] Generating temporary download link...');
    
    const linkResponse = await fetch('https://api.dropboxapi.com/2/files/get_temporary_link', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: reportPath })
    });

    if (!linkResponse.ok) {
      const error = await linkResponse.json();
      throw new Error(`Failed to generate download link: ${JSON.stringify(error)}`);
    }

    const linkData = await linkResponse.json();

    console.log('[get-report-download-link] ✅ Download link generated (expires in 4 hours)');
    console.log('[get-report-download-link] SUCCESS');

    const expiresAt = new Date(Date.now() + (4 * 60 * 60 * 1000)).toISOString();

    return new Response(
      JSON.stringify({
        success: true,
        downloadUrl: linkData.link,
        filename: latestReport.name,
        fileSize: latestReport.size,
        expiresAt: expiresAt
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[get-report-download-link] ERROR:', error);
    
    let statusCode = 500;
    let errorCode = 'DOWNLOAD_LINK_FAILED';
    
    if (error.message.includes('Unauthorized')) {
      statusCode = 401;
      errorCode = 'UNAUTHORIZED';
    } else if (error.message.includes('Forbidden')) {
      statusCode = 403;
      errorCode = 'FORBIDDEN';
    } else if (error.message.includes('not found')) {
      statusCode = 404;
      errorCode = 'REPORT_NOT_FOUND';
    } else if (error.message.includes('not yet available')) {
      statusCode = 400;
      errorCode = 'REPORT_NOT_READY';
    }

    return new Response(
      JSON.stringify({ error: { code: errorCode, message: error.message } }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
