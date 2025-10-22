import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Dropbox } from 'https://esm.sh/dropbox@10.34.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Check Dropbox report request received');

    // Authenticate
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { Authorization: req.headers.get('Authorization')! } 
        } 
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('User authenticated:', user.id);

    // Get case
    const { caseId } = await req.json();
    if (!caseId) {
      throw new Error('Missing caseId');
    }

    console.log('Checking report for case:', caseId);

    const { data: caseData, error: caseError } = await supabaseClient
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) {
      throw new Error('Case not found');
    }

    // Construct report path
    const reportPath = caseData.dropbox_scan_path?.replace('/scan.zip', '/report.pdf');
    if (!reportPath) {
      throw new Error('Invalid Dropbox path');
    }

    console.log('Checking report path:', reportPath);

    // Check if file exists (just metadata, no download)
    const dbx = new Dropbox({
      clientId: Deno.env.get('DROPBOX_APP_KEY'),
      clientSecret: Deno.env.get('DROPBOX_APP_SECRET'),
      refreshToken: Deno.env.get('DROPBOX_REFRESH_TOKEN'),
    });

    const metadata = await dbx.filesGetMetadata({ path: reportPath });

    console.log('Report exists:', metadata.result);

    return new Response(JSON.stringify({
      success: true,
      exists: true,
      fileSize: (metadata.result as any).size,
      modified: (metadata.result as any).client_modified,
      path: reportPath,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error checking report:', error);
    return new Response(JSON.stringify({
      success: false,
      exists: false,
      error: error.message,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404,
    });
  }
});
