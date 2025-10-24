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
    console.log('[prepare-case-upload] Starting...');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    console.log('[prepare-case-upload] User authenticated:', user.id);

    const body = await req.json();

    // Validate required fields
    const requiredFields = ['patientFirstName', 'patientLastName', 'patientId', 
                           'clinicalQuestion', 'fieldOfView', 'urgency', 'clinicId'];
    
    for (const field of requiredFields) {
      if (!body[field] || String(body[field]).trim() === '') {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // ✅ FIX 4: Sanitize patient names
    const firstName = sanitizePatientName(body.patientFirstName);
    const lastName = sanitizePatientName(body.patientLastName);

    console.log('[prepare-case-upload] Processing case for patient');

    // ✅ FIX 1: Retry logic for race condition
    const maxAttempts = 5;
    let attempts = 0;
    let newCase = null;
    let folderName = '';
    let scanPath = '';
    let reportPath = '';

    while (attempts < maxAttempts) {
      try {
        // Get highest counter for this patient
        const { data: existingCases, error: queryError } = await supabase
          .from('cases')
          .select('folder_name')
          .eq('patient_last_name', lastName)
          .eq('patient_first_name', firstName)
          .order('created_at', { ascending: false });

        if (queryError) throw new Error('Failed to query existing cases');

        let maxCounter = 0;
        if (existingCases && existingCases.length > 0) {
          for (const c of existingCases) {
            const match = c.folder_name?.match(/_(\d{5})$/);
            if (match) {
              const counter = parseInt(match[1], 10);
              if (counter > maxCounter) maxCounter = counter;
            }
          }
        }

        const newCounter = maxCounter + 1;
        const paddedCounter = String(newCounter).padStart(5, '0');
        folderName = `${lastName}_${firstName}_${paddedCounter}`;

        console.log('[prepare-case-upload] Attempting folder name:', folderName);

        scanPath = `/DentaRad/Uploads/${folderName}/`;
        reportPath = `/DentaRad/Reports/${folderName}/`;

        // Try to insert with this folder name
        const { data: insertedCase, error: insertError } = await supabase
          .from('cases')
          .insert({
            clinic_id: body.clinicId,
            patient_first_name: firstName,
            patient_last_name: lastName,
            patient_id: body.patientId.trim(),
            patient_dob: body.patientDob,
            clinical_question: body.clinicalQuestion,
            field_of_view: body.fieldOfView,
            urgency: body.urgency,
            folder_name: folderName,
            dropbox_scan_path: scanPath,
            dropbox_report_path: reportPath,
            status: 'uploaded',
            synced_to_dropbox: false,
            upload_completed: false
          })
          .select('id')
          .single();

        // Check for unique constraint violation
        if (insertError?.code === '23505') {
          console.log('[prepare-case-upload] Folder name conflict, retrying...', attempts + 1);
          attempts++;
          continue; // Retry with incremented counter
        }

        if (insertError) throw insertError;

        newCase = insertedCase;
        break; // Success!

      } catch (error) {
        if (error.code === '23505' && attempts < maxAttempts - 1) {
          attempts++;
          continue;
        }
        throw error;
      }
    }

    if (!newCase) {
      throw new Error('Failed to generate unique folder name after multiple attempts');
    }

    console.log('[prepare-case-upload] Case created:', newCase.id);

    // ✅ FIX 3: Get presigned upload URL instead of token
    const dropboxToken = await getDropboxAccessToken();
    const uploadPath = `${scanPath}scan.zip`;

    // Get single-use upload URL from Dropbox
    const uploadLinkResponse = await fetch('https://content.dropboxapi.com/2/files/get_temporary_upload_link', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dropboxToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        commit_info: {
          path: uploadPath,
          mode: 'add',
          autorename: false
        },
        duration: 14400
      })
    });

    if (!uploadLinkResponse.ok) {
      const error = await uploadLinkResponse.json();
      throw new Error(`Failed to get upload URL: ${JSON.stringify(error)}`);
    }

    const { link: uploadUrl } = await uploadLinkResponse.json();

    console.log('[prepare-case-upload] Upload URL generated');
    console.log('[prepare-case-upload] SUCCESS');

    return new Response(
      JSON.stringify({
        success: true,
        caseId: newCase.id,
        folderName: folderName,
        uploadUrl: uploadUrl, // ✅ Single-use URL instead of token
        scanFolderPath: scanPath,
        reportFolderPath: reportPath
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[prepare-case-upload] ERROR:', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'PREPARE_UPLOAD_FAILED',
          message: error.message || 'Failed to prepare upload'
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ✅ FIX 4: Sanitization function
function sanitizePatientName(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .normalize('NFD') // Decompose accented characters (Müller → Muller)
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^A-Z\s\-']/g, '') // Allow: letters, spaces, hyphens, apostrophes
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .substring(0, 50); // Limit length
}

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

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh Dropbox token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}
