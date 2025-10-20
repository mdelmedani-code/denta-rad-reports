import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Dropbox } from 'https://esm.sh/dropbox@10.34.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { dropboxPath, fileName } = await req.json();

    if (!dropboxPath) {
      throw new Error('Dropbox path is required');
    }

    // Initialize Dropbox with refresh token
    const dbx = new Dropbox({
      refreshToken: Deno.env.get('DROPBOX_REFRESH_TOKEN'),
      clientId: Deno.env.get('DROPBOX_APP_KEY'),
      clientSecret: Deno.env.get('DROPBOX_APP_SECRET'),
    });

    // Construct full file path
    const filePath = fileName ? `${dropboxPath}/${fileName}` : dropboxPath;

    console.log(`Generating temporary link for: ${filePath}`);

    // Get temporary download link (valid for 4 hours)
    const response = await dbx.filesGetTemporaryLink({ path: filePath });

    console.log('Temporary link generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        downloadUrl: response.result.link,
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Download error:', error);
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
