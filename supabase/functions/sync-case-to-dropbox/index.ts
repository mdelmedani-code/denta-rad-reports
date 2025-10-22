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
    console.log('Sync case to Dropbox request received');

    // 1. Authenticate user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // 2. Get request parameters
    const { caseId, dropboxPath } = await req.json();

    if (!caseId || !dropboxPath) {
      throw new Error('Missing caseId or dropboxPath');
    }

    console.log('Syncing case:', caseId, 'to path:', dropboxPath);

    // 3. Get case details
    const { data: caseData, error: caseError } = await supabaseClient
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) {
      throw new Error('Case not found');
    }

    // 4. Initialize Dropbox
    const dbx = new Dropbox({
      clientId: Deno.env.get('DROPBOX_APP_KEY'),
      clientSecret: Deno.env.get('DROPBOX_APP_SECRET'),
      refreshToken: Deno.env.get('DROPBOX_REFRESH_TOKEN'),
    });

    // 5. Create metadata.json
    const metadata = {
      caseId: caseData.id,
      patientId: caseData.patient_id,
      patientName: caseData.patient_name,
      patientDOB: caseData.patient_dob,
      patientInternalId: caseData.patient_internal_id,
      clinicalQuestion: caseData.clinical_question,
      fieldOfView: caseData.field_of_view,
      urgency: caseData.urgency,
      uploadedAt: caseData.created_at,
      clinicId: caseData.clinic_id,
      status: caseData.status,
    };

    const dropboxBasePath = dropboxPath.substring(0, dropboxPath.lastIndexOf('/'));
    const metadataPath = `${dropboxBasePath}/metadata.json`;

    console.log('Creating metadata.json at:', metadataPath);

    // 6. Upload metadata to Dropbox
    await dbx.filesUpload({
      path: metadataPath,
      contents: JSON.stringify(metadata, null, 2),
      mode: { '.tag': 'overwrite' },
    });

    console.log('Metadata uploaded successfully');

    // 7. Update case in database
    const { error: updateError } = await supabaseClient
      .from('cases')
      .update({
        dropbox_scan_path: dropboxPath,
        synced_to_dropbox: true,
        synced_at: new Date().toISOString(),
      })
      .eq('id', caseId);

    if (updateError) {
      throw new Error(`Failed to update case: ${updateError.message}`);
    }

    console.log('Case updated with Dropbox path');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Case synced to Dropbox',
        dropbox_scan_path: dropboxPath,
        metadata_path: metadataPath,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in sync-case-to-dropbox:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
