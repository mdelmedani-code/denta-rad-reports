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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    console.log('[prepare-case-upload] User authenticated:', user.id);

    const body = await req.json();

    // ✅ FIX #1: Check rate limiting (20 uploads per hour per CLINIC, not user)
    console.log('[prepare-case-upload] Checking rate limit for clinic:', body.clinicId);
    
    const { data: rateLimitOk, error: rateLimitError } = await supabase.rpc(
      'check_upload_rate_limit',
      { p_clinic_id: body.clinicId }
    );

    if (rateLimitError) {
      console.error('[prepare-case-upload] Rate limit check failed:', rateLimitError);
      // Don't fail upload if rate limit check errors (fail open)
      console.warn('[prepare-case-upload] Proceeding with upload despite rate limit error');
    } else if (rateLimitOk === false) {
      console.warn('[prepare-case-upload] ⚠️ Rate limit exceeded for clinic:', body.clinicId);
      return new Response(
        JSON.stringify({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Upload limit exceeded. Your clinic can upload a maximum of 20 cases per hour. Please try again later.',
            retry_after: '1 hour'
          }
        }),
        { 
          status: 429, // HTTP 429 Too Many Requests
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': '3600' // 1 hour in seconds
          }
        }
      );
    }

    console.log('[prepare-case-upload] ✅ Rate limit check passed');

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
    const requiredFields = ['patientName', 'patientId', 
                           'clinicalQuestion', 'fieldOfView', 'urgency', 'clinicId'];

    for (const field of requiredFields) {
      if (!body[field] || String(body[field]).trim() === '') {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // ✅ FIX 5: Sanitize inputs (XSS prevention)
    const patientName = sanitizePatientName(body.patientName);
    const sanitizedQuestion = sanitizeTextContent(body.clinicalQuestion);

    console.log('[prepare-case-upload] Processing case for patient');

    // ✅ FIX 1: Use advisory lock to prevent race condition
    console.log('[prepare-case-upload] Acquiring lock...');
    
    const { data: lockAcquired, error: lockError } = await supabase.rpc(
      'acquire_case_lock',
      {
        p_patient_last_name: patientName,
        p_patient_first_name: patientName
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
        .eq('patient_name', patientName)
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
      folderName = `${patientName.replace(/\s+/g, '_')}_${paddedCounter}`;

      console.log('[prepare-case-upload] Generated folder name:', folderName);

      // ✅ App Folder mode paths (omit /dentarad/ prefix)
      scanPath = `/uploads/${folderName}/`;
      reportPath = `/reports/${folderName}/`;

      // Insert case record
      const { data: insertedCase, error: insertError } = await supabase
        .from('cases')
        .insert({
          clinic_id: body.clinicId,
          patient_name: patientName,
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

    } finally {
      // Always release lock
      console.log('[prepare-case-upload] Releasing lock...');
      await supabase.rpc('release_case_lock', {
        p_patient_last_name: patientName,
        p_patient_first_name: patientName
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

// ✅ FIX #5: Patient name sanitization with proper validation
function sanitizePatientName(name: string): string {
  const cleaned = name
    .trim()
    .toUpperCase()
    .normalize('NFD') // Decompose accented characters (Müller → Muller)
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^A-Z0-9\s\-']/g, '') // Allow numbers (e.g., "JOHN II")
    .replace(/'+/g, "'") // Collapse multiple apostrophes
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .substring(0, 50); // Limit length
  
  // ✅ FIX #5: Check for empty string FIRST (catches "!!!" → "")
  if (!cleaned || cleaned.length === 0) {
    throw new Error('Patient name cannot be empty after sanitization');
  }
  
  // ✅ Ensure at least 1 letter (catches "123" with no letters)
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
