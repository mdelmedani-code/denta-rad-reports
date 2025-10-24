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

    // ✅ ENHANCEMENT 1: Check rate limiting (20 uploads per hour)
    const { data: rateLimitOk, error: rateLimitError } = await supabase.rpc(
      'check_upload_rate_limit',
      { _user_id: user.id }
    );

    if (rateLimitError) {
      console.error('[prepare-case-upload] Rate limit check error:', rateLimitError);
      throw new Error('Failed to check rate limit');
    }

    if (!rateLimitOk) {
      console.warn('[prepare-case-upload] Rate limit exceeded for user:', user.id);
      return new Response(
        JSON.stringify({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Upload limit exceeded. Maximum 20 uploads per hour.'
          }
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[prepare-case-upload] ✅ Rate limit check passed');

    const body = await req.json();

    // ✅ FIX 6: Validate file size on backend
    if (!body.fileSize || typeof body.fileSize !== 'number') {
      throw new Error('File size is required');
    }

    const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
    const MIN_SIZE = 1024; // 1KB

    if (body.fileSize > MAX_SIZE) {
      throw new Error('File size exceeds maximum (2GB)');
    }

    if (body.fileSize < MIN_SIZE) {
      throw new Error('File size too small (minimum 1KB)');
    }

    console.log('[prepare-case-upload] File size validated:', 
      (body.fileSize / 1024 / 1024).toFixed(2), 'MB');

    // Validate required fields
    const requiredFields = ['patientFirstName', 'patientLastName', 'patientId', 
                           'clinicalQuestion', 'fieldOfView', 'urgency', 'clinicId'];

    for (const field of requiredFields) {
      if (!body[field] || String(body[field]).trim() === '') {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // ✅ FIX 5: Sanitize inputs (XSS prevention)
    const firstName = sanitizePatientName(body.patientFirstName);
    const lastName = sanitizePatientName(body.patientLastName);
    const sanitizedQuestion = sanitizeTextContent(body.clinicalQuestion);

    console.log('[prepare-case-upload] Processing case for patient');

    // ✅ FIX 1: Use advisory lock to prevent race condition
    console.log('[prepare-case-upload] Acquiring lock...');
    
    const { data: lockAcquired, error: lockError } = await supabase.rpc(
      'acquire_case_lock',
      {
        p_patient_last_name: lastName,
        p_patient_first_name: firstName
      }
    );

    if (lockError || !lockAcquired) {
      throw new Error('Could not acquire lock - please try again in a moment');
    }

    console.log('[prepare-case-upload] ✅ Lock acquired');

    let newCase = null;
    let folderName = '';
    let scanPath = '';
    let reportPath = '';

    try {
      // Get highest counter for this patient (safe now with lock)
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

      console.log('[prepare-case-upload] Generated folder name:', folderName);

      scanPath = `/DentaRad/Uploads/${folderName}/`;
      reportPath = `/DentaRad/Reports/${folderName}/`;

      // Insert case record
      const { data: insertedCase, error: insertError } = await supabase
        .from('cases')
        .insert({
          clinic_id: body.clinicId,
          patient_first_name: firstName,
          patient_last_name: lastName,
          patient_id: body.patientId.trim(),
          patient_dob: body.patientDob,
          clinical_question: sanitizedQuestion, // ✅ Sanitized
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

      if (insertError) throw insertError;

      newCase = insertedCase;
      console.log('[prepare-case-upload] ✅ Case created:', newCase.id);

      // ✅ ENHANCEMENT 1: Record upload for rate limiting
      try {
        await supabase
          .from('upload_rate_limits')
          .insert({
            user_id: user.id,
            file_size: body.fileSize,
            file_type: 'dicom_zip'
          });
        console.log('[prepare-case-upload] ✅ Upload recorded for rate limiting');
      } catch (rateLimitRecordError) {
        console.error('[prepare-case-upload] Failed to record upload:', rateLimitRecordError);
        // Continue anyway - not critical
      }

    } finally {
      // Always release lock
      console.log('[prepare-case-upload] Releasing lock...');
      await supabase.rpc('release_case_lock', {
        p_patient_last_name: lastName,
        p_patient_first_name: firstName
      });
      console.log('[prepare-case-upload] ✅ Lock released');
    }

    // ✅ FIX 3: Use working token approach (presigned URLs don't exist in Dropbox API)
    const dropboxToken = await getDropboxAccessToken();
    const uploadPath = `${scanPath}scan.zip`;

    console.log('[prepare-case-upload] Dropbox token acquired');
    console.log('[prepare-case-upload] SUCCESS');

    return new Response(
      JSON.stringify({
        success: true,
        caseId: newCase.id,
        folderName: folderName,
        dropboxToken: dropboxToken, // ✅ Working approach (4-hour token acceptable for UK)
        uploadPath: uploadPath,
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

// ✅ FIX 5 + ENHANCEMENT 3: Sanitization functions (now allows numbers)
function sanitizePatientName(name: string): string {
  const cleaned = name
    .trim()
    .toUpperCase()
    .normalize('NFD') // Decompose accented characters (Müller → Muller)
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^A-Z0-9\s\-']/g, '') // ✅ ENHANCEMENT 3: Allow numbers (e.g., "JOHN II")
    .replace(/'+/g, "'") // Collapse multiple apostrophes
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .substring(0, 50); // Limit length
  
  // Ensure at least 1 letter
  if (!/[A-Z]/.test(cleaned)) {
    throw new Error('Patient name must contain at least one letter');
  }
  
  return cleaned;
}

function sanitizeTextContent(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
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
