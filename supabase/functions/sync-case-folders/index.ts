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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Check if request uses service role key (for cron jobs)
    const isServiceRole = authHeader.includes(supabaseServiceKey);

    let supabase;
    let userId: string | null = null;
    let userRole: string | null = null;
    let userClinicId: string | null = null;

    if (isServiceRole) {
      // Service role: bypass user auth (used by cron jobs)
      console.log('[sync-case-folders] Service role authentication');
      supabase = createClient(supabaseUrl, supabaseServiceKey);
      userRole = 'service';
      
    } else {
      // User authentication: normal flow
      console.log('[sync-case-folders] User authentication');
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Unauthorized');

      userId = user.id;
      console.log('[sync-case-folders] User authenticated:', userId);

      // Get user's role and clinic
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('clinic_id, role')
        .eq('id', userId)
        .single();

      if (profileError || !profile) throw new Error('Profile not found');
      
      userRole = profile.role;
      userClinicId = profile.clinic_id;
    }

    const { caseId } = await req.json();
    if (!caseId) throw new Error('Case ID is required');

    console.log('[sync-case-folders] Case ID:', caseId);

    // Get case data
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select(`
        id, folder_name, dropbox_scan_path, dropbox_report_path, clinic_id,
        patient_name, patient_id, patient_dob,
        clinical_question, field_of_view, urgency, created_at,
        clinics(name)
      `)
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) throw new Error(`Case not found: ${caseError?.message}`);

    // Authorization check (only for user requests, not service role)
    if (userRole !== 'service') {
      const isAuthorized = 
        userRole === 'admin' || 
        userRole === 'reporter' || 
        userClinicId === caseData.clinic_id;

      if (!isAuthorized) {
        throw new Error('Unauthorized - cannot sync cases from other clinics');
      }
    }

    console.log('[sync-case-folders] ✅ Authorization verified');
    console.log('[sync-case-folders] Case:', caseData.folder_name);

    // Generate folder name and paths if missing (for old cases)
    if (!caseData.folder_name || !caseData.dropbox_scan_path || !caseData.dropbox_report_path) {
      console.log('[sync-case-folders] ⚠️ Missing folder structure, generating...');
      
      const folderName = generateFolderName(caseData.patient_name, caseData.patient_id);
      const uploadPath = `/DentaRad/Uploads/${folderName}`;
      const reportPath = `/DentaRad/Reports/${caseData.patient_name}`;
      
      // Update database with generated paths
      const { error: pathUpdateError } = await supabase
        .from('cases')
        .update({
          folder_name: folderName,
          dropbox_scan_path: `${uploadPath}/`,
          dropbox_report_path: `${reportPath}/`
        })
        .eq('id', caseId);
      
      if (pathUpdateError) {
        throw new Error(`Failed to update paths: ${pathUpdateError.message}`);
      }
      
      // Update local caseData object
      caseData.folder_name = folderName;
      caseData.dropbox_scan_path = `${uploadPath}/`;
      caseData.dropbox_report_path = `${reportPath}/`;
      
      console.log('[sync-case-folders] ✅ Generated folder:', folderName);
    }

    const accessToken = await getDropboxAccessToken();

    // Create Uploads folder
    console.log('[sync-case-folders] Creating Uploads folder...');
    await createDropboxFolder(accessToken, caseData.dropbox_scan_path);
    console.log('[sync-case-folders] ✅ Uploads folder created');

    // Create Reports folder
    console.log('[sync-case-folders] Creating Reports folder...');
    await createDropboxFolder(accessToken, caseData.dropbox_report_path);
    console.log('[sync-case-folders] ✅ Reports folder created');

    // Verify scan.zip was uploaded by client
    console.log('[sync-case-folders] Verifying scan upload...');
    const scanPath = `${caseData.dropbox_scan_path}scan.zip`;
    const scanExists = await checkDropboxFileExists(accessToken, scanPath);

    if (!scanExists) {
      console.log('[sync-case-folders] ⚠️ scan.zip not found in Dropbox');
      console.log('[sync-case-folders] Checking Supabase Storage for fallback upload...');
      
      // Check if file exists in Supabase Storage
      const { data: storageFiles, error: listError } = await supabase.storage
        .from('cbct-scans')
        .list(caseData.folder_name || '');
      
      if (listError) {
        console.error('[sync-case-folders] Storage check failed:', listError);
        throw new Error(`Failed to check storage: ${listError.message}`);
      }
      
      const scanFile = storageFiles?.find(f => f.name.endsWith('.zip'));
      
      if (!scanFile) {
        // No scan in Dropbox OR Storage - upload failed completely
        const errorMsg = 'Scan file not found in Dropbox or Storage. Client upload may have failed. Please retry upload.';
        console.error('[sync-case-folders]', errorMsg);
        throw new Error(errorMsg);
      }
      
      console.log('[sync-case-folders] ✅ Found scan in Storage:', scanFile.name);
      console.log('[sync-case-folders] Downloading from Storage for fallback upload...');
      
      // Download from Supabase Storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('cbct-scans')
        .download(`${caseData.folder_name}/${scanFile.name}`);
      
      if (downloadError || !fileData) {
        throw new Error(`Failed to download from storage: ${downloadError?.message}`);
      }
      
      console.log('[sync-case-folders] Downloaded from Storage, size:', 
        (fileData.size / 1024 / 1024).toFixed(2), 'MB');
      
      // Upload to Dropbox using chunked upload for reliability
      console.log('[sync-case-folders] Uploading to Dropbox (with chunking support)...');
      await uploadLargeFileToDropbox(accessToken, scanPath, fileData);
      
      console.log('[sync-case-folders] ✅ Scan uploaded to Dropbox via fallback');
    } else {
      console.log('[sync-case-folders] ✅ Scan already in Dropbox');
    }

    // Upload metadata files (non-blocking)
    const uploadResults = {
      referralInfo: false,
      metadata: false,
      readme: false
    };

    // Upload referral-info.txt (non-critical)
    try {
      console.log('[sync-case-folders] Uploading referral-info.txt...');
      const referralText = generateReferralText(caseData);
      await uploadToDropbox(accessToken, `${caseData.dropbox_scan_path}referral-info.txt`, referralText);
      uploadResults.referralInfo = true;
      console.log('[sync-case-folders] ✅ referral-info.txt uploaded');
    } catch (error) {
      console.error('[sync-case-folders] ⚠️ Failed referral-info.txt:', error.message);
    }

    // Upload metadata.json (non-critical)
    try {
      console.log('[sync-case-folders] Uploading metadata.json...');
      const metadata = generateMetadata(caseData);
      await uploadToDropbox(accessToken, `${caseData.dropbox_scan_path}metadata.json`, metadata);
      uploadResults.metadata = true;
      console.log('[sync-case-folders] ✅ metadata.json uploaded');
    } catch (error) {
      console.error('[sync-case-folders] ⚠️ Failed metadata.json:', error.message);
    }

    // Upload README.txt (non-critical)
    try {
      console.log('[sync-case-folders] Uploading README.txt...');
      const readme = generateReadme(caseData);
      await uploadToDropbox(accessToken, `${caseData.dropbox_report_path}README.txt`, readme);
      uploadResults.readme = true;
      console.log('[sync-case-folders] ✅ README.txt uploaded');
    } catch (error) {
      console.error('[sync-case-folders] ⚠️ Failed README.txt:', error.message);
    }

    // Build warnings message
    const failedFiles = [];
    if (!uploadResults.referralInfo) failedFiles.push('referral-info.txt');
    if (!uploadResults.metadata) failedFiles.push('metadata.json');
    if (!uploadResults.readme) failedFiles.push('README.txt');

    const syncWarnings = failedFiles.length > 0 
      ? `Failed to upload: ${failedFiles.join(', ')}`
      : null;

    // Update database - mark as synced and scan uploaded
    const { error: updateError } = await supabase
      .from('cases')
      .update({ 
        synced_to_dropbox: true,
        scan_uploaded_to_dropbox: true,
        scan_upload_verified_at: new Date().toISOString(),
        sync_warnings: syncWarnings,
        updated_at: new Date().toISOString() 
      })
      .eq('id', caseId);

    if (updateError) throw new Error('Failed to update database');

    console.log('[sync-case-folders] SUCCESS - Sync complete');
    if (syncWarnings) {
      console.log('[sync-case-folders] ⚠️ Warnings:', syncWarnings);
    }

    return new Response(
      JSON.stringify({
        success: true,
        caseId: caseId,
        folderName: caseData.folder_name,
        uploadResults: uploadResults,
        warnings: syncWarnings
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sync-case-folders] ERROR:', error);
    
    let statusCode = 500;
    if (error.message.includes('Unauthorized')) statusCode = 403;
    if (error.message.includes('not found')) statusCode = 404;
    
    return new Response(
      JSON.stringify({
        error: { code: 'SYNC_FAILED', message: error.message || 'Failed to sync folders' }
      }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateFolderName(patientName: string, patientId: string): string {
  const cleanName = patientName
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^A-Z\s]/g, '') // Keep only letters and spaces
    .trim();
  
  const parts = cleanName.split(/\s+/);
  const lastName = parts[0] || 'PATIENT';
  const firstName = parts.slice(1).join('_') || 'NAME';
  
  // Extract numeric ID from patient_id (e.g., "CASE-0000123" -> "00123")
  const numericId = patientId.replace(/\D/g, '').padStart(5, '0').slice(-5);
  
  return `${lastName}_${firstName}_${numericId}`;
}

async function getDropboxAccessToken(): Promise<string> {
  const appKey = Deno.env.get('DROPBOX_APP_KEY')!;
  const appSecret = Deno.env.get('DROPBOX_APP_SECRET')!;
  const refreshToken = Deno.env.get('DROPBOX_REFRESH_TOKEN')!;

  console.log('[getDropboxAccessToken] Refreshing token with app key:', appKey?.substring(0, 8) + '...');

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
    const errorText = await response.text();
    console.error('[getDropboxAccessToken] Failed to refresh token:', response.status, errorText);
    throw new Error(`Failed to refresh Dropbox token: ${errorText}`);
  }
  
  const data = await response.json();
  console.log('[getDropboxAccessToken] ✅ Token refreshed successfully');
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

    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      if (checkData['.tag'] === 'folder') return;
    } else {
      // Log the actual error for debugging
      const errorText = await checkResponse.text();
      console.log('[createDropboxFolder] Check metadata failed:', checkResponse.status, errorText);
    }
  } catch (error) {
    console.error('[createDropboxFolder] Exception during check:', error);
    // Continue to try creating the folder
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
    const errorText = await createResponse.text();
    console.error('[createDropboxFolder] Create folder failed:', createResponse.status, errorText);
    
    // Try to parse as JSON
    try {
      const error = JSON.parse(errorText);
      if (error.error?.['.tag'] === 'path' && error.error?.path?.['.tag'] === 'conflict') {
        return; // Already exists
      }
      throw new Error(`Failed to create folder at ${path}: ${JSON.stringify(error)}`);
    } catch (e) {
      // Not JSON, throw the raw error
      throw new Error(`Failed to create folder at ${path}: ${errorText}`);
    }
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

PATIENT: ${caseData.patient_name}
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
      name: caseData.patient_name,
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
Patient: ${caseData.patient_name}
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

async function checkDropboxFileExists(
  accessToken: string, 
  path: string
): Promise<boolean> {
  try {
    const response = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path })
    });

    if (response.ok) {
      const data = await response.json();
      return data['.tag'] === 'file';
    }
    
    return false;
  } catch (error) {
    console.error('[checkDropboxFileExists] Error:', error);
    return false;
  }
}

async function uploadLargeFileToDropbox(
  accessToken: string,
  path: string,
  fileData: Blob
): Promise<void> {
  const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB chunks
  const fileSize = fileData.size;
  
  console.log(`[uploadLargeFileToDropbox] File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
  
  // For files < 150MB, use regular upload
  if (fileSize < 150 * 1024 * 1024) {
    console.log('[uploadLargeFileToDropbox] Using regular upload API');
    const arrayBuffer = await fileData.arrayBuffer();
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
      body: arrayBuffer
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Upload failed: ${error}`);
    }
    
    console.log('[uploadLargeFileToDropbox] ✅ Upload complete');
    return;
  }
  
  // For files >= 150MB, use upload session (chunked)
  console.log('[uploadLargeFileToDropbox] Using chunked upload session');
  
  // 1. Start upload session
  const startResponse = await fetch('https://content.dropboxapi.com/2/files/upload_session/start', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': JSON.stringify({ close: false })
    },
    body: new ArrayBuffer(0)
  });
  
  if (!startResponse.ok) {
    throw new Error('Failed to start upload session');
  }
  
  const { session_id } = await startResponse.json();
  console.log('[uploadLargeFileToDropbox] Session started:', session_id);
  
  // 2. Upload chunks
  const arrayBuffer = await fileData.arrayBuffer();
  let offset = 0;
  let chunkNum = 0;
  
  while (offset < fileSize) {
    const chunkSize = Math.min(CHUNK_SIZE, fileSize - offset);
    const chunk = arrayBuffer.slice(offset, offset + chunkSize);
    chunkNum++;
    
    console.log(`[uploadLargeFileToDropbox] Uploading chunk ${chunkNum} (${(chunkSize / 1024 / 1024).toFixed(2)} MB)...`);
    
    const appendResponse = await fetch('https://content.dropboxapi.com/2/files/upload_session/append_v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          cursor: {
            session_id: session_id,
            offset: offset
          },
          close: false
        })
      },
      body: chunk
    });
    
    if (!appendResponse.ok) {
      const error = await appendResponse.text();
      throw new Error(`Chunk upload failed: ${error}`);
    }
    
    offset += chunkSize;
    
    const progress = ((offset / fileSize) * 100).toFixed(1);
    console.log(`[uploadLargeFileToDropbox] Progress: ${progress}%`);
  }
  
  // 3. Finish upload session
  console.log('[uploadLargeFileToDropbox] Finalizing upload...');
  
  const finishResponse = await fetch('https://content.dropboxapi.com/2/files/upload_session/finish', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': JSON.stringify({
        cursor: {
          session_id: session_id,
          offset: offset
        },
        commit: {
          path: path,
          mode: 'overwrite',
          autorename: false
        }
      })
    },
    body: new ArrayBuffer(0)
  });
  
  if (!finishResponse.ok) {
    const error = await finishResponse.text();
    throw new Error(`Failed to finish upload: ${error}`);
  }
  
  console.log('[uploadLargeFileToDropbox] ✅ Chunked upload complete');
}
