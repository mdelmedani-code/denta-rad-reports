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
    console.log('[sync-case-folders] Starting...');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { caseId } = await req.json();
    if (!caseId) throw new Error('Case ID is required');

    console.log('[sync-case-folders] Case ID:', caseId);

    // Get case data
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select(`
        id, folder_name, dropbox_scan_path, dropbox_report_path,
        patient_first_name, patient_last_name, patient_id, patient_dob,
        clinical_question, field_of_view, urgency, created_at,
        clinics(name, email, address)
      `)
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) throw new Error(`Case not found: ${caseError?.message}`);

    console.log('[sync-case-folders] Case:', caseData.folder_name);

    const accessToken = await getDropboxAccessToken();

    // Create Uploads folder
    console.log('[sync-case-folders] Creating Uploads folder...');
    await createDropboxFolder(accessToken, caseData.dropbox_scan_path);
    console.log('[sync-case-folders] ✅ Uploads folder created');

    // Create Reports folder
    console.log('[sync-case-folders] Creating Reports folder...');
    await createDropboxFolder(accessToken, caseData.dropbox_report_path);
    console.log('[sync-case-folders] ✅ Reports folder created');

    // Upload referral-info.txt
    console.log('[sync-case-folders] Uploading referral-info.txt...');
    const referralText = generateReferralText(caseData);
    await uploadToDropbox(accessToken, `${caseData.dropbox_scan_path}referral-info.txt`, referralText);
    console.log('[sync-case-folders] ✅ referral-info.txt uploaded');

    // Upload metadata.json
    console.log('[sync-case-folders] Uploading metadata.json...');
    const metadata = generateMetadata(caseData);
    await uploadToDropbox(accessToken, `${caseData.dropbox_scan_path}metadata.json`, metadata);
    console.log('[sync-case-folders] ✅ metadata.json uploaded');

    // Upload README.txt to Reports folder
    console.log('[sync-case-folders] Uploading README.txt...');
    const readme = generateReadme(caseData);
    await uploadToDropbox(accessToken, `${caseData.dropbox_report_path}README.txt`, readme);
    console.log('[sync-case-folders] ✅ README.txt uploaded');

    // Update database
    const { error: updateError } = await supabase
      .from('cases')
      .update({ synced_to_dropbox: true, updated_at: new Date().toISOString() })
      .eq('id', caseId);

    if (updateError) throw new Error('Failed to update database');

    console.log('[sync-case-folders] SUCCESS - Sync complete');

    return new Response(
      JSON.stringify({
        success: true,
        caseId: caseId,
        folderName: caseData.folder_name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sync-case-folders] ERROR:', error);
    return new Response(
      JSON.stringify({
        error: { code: 'SYNC_FAILED', message: error.message || 'Failed to sync folders' }
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

async function createDropboxFolder(accessToken: string, path: string): Promise<void> {
  try {
    const checkResponse = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path })
    });

    const checkData = await checkResponse.json();
    if (checkResponse.ok && checkData['.tag'] === 'folder') return;
  } catch (error) {
    // Folder doesn't exist, continue to create
  }

  const createResponse = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path: path, autorename: false })
  });

  if (!createResponse.ok) {
    const error = await createResponse.json();
    if (error.error?.['.tag'] === 'path' && error.error?.path?.['.tag'] === 'conflict') {
      return; // Already exists
    }
    throw new Error(`Failed to create folder: ${JSON.stringify(error)}`);
  }
}

async function uploadToDropbox(accessToken: string, path: string, content: string): Promise<void> {
  const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': JSON.stringify({
        path: path,
        mode: 'overwrite',
        autorename: false
      })
    },
    body: content
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to upload ${path}: ${JSON.stringify(error)}`);
  }
}

function generateReferralText(caseData: any): string {
  return `
DentaRad Case Referral Information
===================================

PATIENT: ${caseData.patient_first_name} ${caseData.patient_last_name}
PATIENT ID: ${caseData.patient_id}
DOB: ${caseData.patient_dob}
CASE ID: ${caseData.id}
FOLDER: ${caseData.folder_name}

CLINICAL QUESTION:
${caseData.clinical_question}

URGENCY: ${caseData.urgency}
FIELD OF VIEW: ${caseData.field_of_view}

INSTRUCTIONS FOR REPORTER:
1. Review DICOM files in scan.zip
2. Create report in Falcon.me
3. Export as PDF
4. Upload to: /DentaRad/Reports/${caseData.folder_name}/
5. Filename: YYYY-MM-DD_report.pdf
6. Mark complete in DentaRad
`;
}

function generateMetadata(caseData: any): string {
  const metadata = {
    case_id: caseData.id,
    folder_name: caseData.folder_name,
    patient: {
      first_name: caseData.patient_first_name,
      last_name: caseData.patient_last_name,
      patient_id: caseData.patient_id,
      date_of_birth: caseData.patient_dob
    },
    clinical: {
      question: caseData.clinical_question,
      field_of_view: caseData.field_of_view,
      urgency: caseData.urgency
    },
    paths: {
      uploads: caseData.dropbox_scan_path,
      reports: caseData.dropbox_report_path
    },
    timestamps: {
      created: caseData.created_at,
      synced: new Date().toISOString()
    }
  };
  return JSON.stringify(metadata, null, 2);
}

function generateReadme(caseData: any): string {
  return `
DentaRad Reports Folder
=======================

Folder: ${caseData.folder_name}
Patient: ${caseData.patient_first_name} ${caseData.patient_last_name}
Case ID: ${caseData.id}

INSTRUCTIONS:
1. Review DICOM files in Uploads folder
2. Create report in Falcon.me
3. Export PDF
4. Upload to THIS folder: YYYY-MM-DD_report.pdf
5. Mark complete in DentaRad

FILENAME FORMAT:
- First report: YYYY-MM-DD_report.pdf
- Revisions: YYYY-MM-DD_report_v2.pdf

CLINICAL QUESTION:
${caseData.clinical_question}

NOTE: This file is for REPORTER only. Clinicians will NOT see this.
`;
}
