# Dropbox Sync Workflow Audit

## Issue Summary
When uploading a case, the system should:
1. ✅ Upload the DICOM scan ZIP to Dropbox
2. ❌ Create referral information files (PDF and text)
3. ❌ Create an empty Reports folder for the reporter to upload the report

## Current Workflow

### 1. Case Upload Flow (`src/pages/UploadCase.tsx`)

```typescript
// Line 323-334: After case is created in database
handleBackgroundProcessing(newCase, finalZipFile, zipFilename, storagePath)
  .then(() => {
    sonnerToast.success('Dropbox sync complete!');
  })
  .catch((error) => {
    console.error('Background processing failed:', error);
    sonnerToast.error('Failed to sync to Dropbox: ' + error.message);
  });

// Line 370-417: Background processing function
async function handleBackgroundProcessing(newCase, finalZipFile, zipFilename, storagePath) {
  // 1. Get Dropbox upload config (folder name, path, access token)
  const { data: uploadConfigData, error: configError } = await supabase.functions.invoke('get-dropbox-upload-url', {
    body: { 
      caseId: newCase.id,
      patientName: newCase.patient_name,
      simpleId: newCase.simple_id 
    }
  });

  // 2. Upload ZIP file to Dropbox at: /DentaRad/Uploads/{LASTNAME_FIRSTNAME_00001}/scan.zip
  await DropboxUploadService.uploadFile(
    finalZipFile instanceof File ? finalZipFile : new File([finalZipFile], zipFilename),
    uploadConfigData.uploadConfig,
    (progress) => console.log(`[Dropbox Sync] Upload progress: ${progress.percentage}%`)
  );
  
  const dropboxPath = uploadConfigData.uploadConfig.dropboxPath;
  
  // 3. Update case record with Dropbox path
  await supabase
    .from('cases')
    .update({
      dropbox_path: dropboxPath,
      file_path: storagePath
    })
    .eq('id', newCase.id);
  
  // 4. Call sync-case-to-dropbox to create referral files and folder structure
  // THIS IS WHERE THE ISSUE OCCURS - Getting "Unauthorized" error
  const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-case-to-dropbox', {
    body: { caseId: newCase.id, dropboxPath }
  });
  
  if (syncError) {
    console.error('[Dropbox Sync] sync-case-to-dropbox error:', syncError);
    throw new Error('Failed to sync case to Dropbox: ' + syncError.message);
  }
  
  // 5. Extract DICOM metadata
  await supabase.functions.invoke('extract-dicom-zip', {
    body: { caseId: newCase.id, zipPath: storagePath }
  });
}
```

### 2. Sync Edge Function (`supabase/functions/sync-case-to-dropbox/index.ts`)

**Purpose:** Create referral information files and Reports folder structure

**Expected Dropbox Structure After Sync:**
```
/DentaRad/
  └── Uploads/
      └── LASTNAME_FIRSTNAME_00001/
          ├── scan.zip                    (uploaded by UploadCase.tsx)
          ├── REFERRAL-INFO.txt          (created by sync function)
          ├── cover-sheet.pdf            (created by sync function)
          ├── referral-info.txt          (created by sync function)
          └── metadata.json              (created by sync function)
  └── Reports/
      └── LASTNAME_FIRSTNAME_00001/
          └── README.txt                 (created by sync function)
          (reporter uploads report.pdf here later)
```

**Current Implementation:**

```typescript
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError) {
      throw new Error(`Authentication failed: ${userError.message}`);
    }

    if (!user) {
      throw new Error('No user found');
    }

    // 2. Get request parameters
    const { caseId, dropboxPath } = await req.json();

    if (!caseId || !dropboxPath) {
      throw new Error('Missing caseId or dropboxPath');
    }

    // 3. Get case details with clinic info
    const { data: caseData, error: caseError } = await supabaseClient
      .from('cases')
      .select('*, clinics(name)')
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) {
      throw new Error('Case not found');
    }

    // 4. Generate folder name from patient name + simple_id
    const folderName = generateFolderName(caseData.patient_name, caseData.simple_id);
    const simpleId = String(caseData.simple_id).padStart(5, '0');
    const clinicName = caseData.clinics?.name || 'Unknown Clinic';

    // 5. Initialize Dropbox client
    const dbx = new Dropbox({
      clientId: Deno.env.get('DROPBOX_APP_KEY'),
      clientSecret: Deno.env.get('DROPBOX_APP_SECRET'),
      refreshToken: Deno.env.get('DROPBOX_REFRESH_TOKEN'),
    });

    // 6. Create folder structure
    const uploadBasePath = `/DentaRad/Uploads/${folderName}`;
    const reportBasePath = `/DentaRad/Reports/${folderName}`;

    // 7. Upload REFERRAL-INFO.txt
    const simpleReferralText = `CBCT SCAN REFERRAL INFORMATION
═══════════════════════════════════════════════════════════════════

PATIENT INFORMATION:
  Name: ${caseData.patient_name}
  ID: ${caseData.patient_id || `CASE-${String(simpleId).padStart(7, '0')}`}
  Date of Birth: ${caseData.patient_dob || 'Not provided'}

CLINICAL DETAILS:
  Clinical Question: ${caseData.clinical_question}
  Field of View: ${caseData.field_of_view}
  Urgency: ${caseData.urgency}
  Referring Dentist: ${caseData.referring_dentist || 'N/A'}
  Clinic: ${clinicName}

CASE DETAILS:
  Case ID: ${caseId}
  Simple ID: ${simpleId}
  Folder Name: ${folderName}
  Upload Date: ${new Date(caseData.created_at).toLocaleString()}
  Generated: ${new Date().toISOString()}

═══════════════════════════════════════════════════════════════════
`;

    await dbx.filesUpload({
      path: `${uploadBasePath}/REFERRAL-INFO.txt`,
      contents: new TextEncoder().encode(simpleReferralText),
      mode: { '.tag': 'add' },
      autorename: false,
    });

    // 8. Generate and upload cover-sheet.pdf
    const coverSheetPDF = await generateCoverSheetPDF({
      id: simpleId,
      patient_name: caseData.patient_name,
      patient_dob: caseData.patient_dob,
      patient_id: caseData.patient_id,
      clinical_question: caseData.clinical_question,
      field_of_view: caseData.field_of_view,
      urgency: caseData.urgency,
      referring_dentist: caseData.referring_dentist,
      clinic_name: clinicName,
      created_at: caseData.created_at,
      folder_name: folderName
    });

    await dbx.filesUpload({
      path: `${uploadBasePath}/cover-sheet.pdf`,
      contents: coverSheetPDF,
      mode: { '.tag': 'add' },
      autorename: false,
    });

    // 9. Upload detailed referral-info.txt
    const detailedReferralText = `CBCT SCAN REFERRAL
==================

Case ID: ${simpleId}
Patient Name: ${caseData.patient_name}
Date of Birth: ${caseData.patient_dob}
Internal ID: ${caseData.patient_id || 'N/A'}
Folder: ${folderName}

CLINICAL QUESTION:
${caseData.clinical_question}

Field of View: ${caseData.field_of_view}
Urgency: ${caseData.urgency}

Referring Dentist: ${caseData.referring_dentist || 'N/A'}
Clinic: ${clinicName}

Uploaded: ${new Date(caseData.created_at).toLocaleString()}

═══════════════════════════════════════════════════════════════════

REFERRAL INFO AVAILABLE IN:
1. REFERRAL-INFO.txt - Patient and clinical information
2. cover-sheet.pdf - PDF document (for printing/emailing)
3. referral-info.txt - Detailed instructions (this file)

INSTRUCTIONS FOR REPORTER:
1. Download this folder from Dropbox
2. Import DICOM images to FalconMD
3. Review clinical information from REFERRAL-INFO.txt or cover-sheet.pdf
4. Create diagnostic report in FalconMD
5. Export report PDF from FalconMD
6. Save report to: /DentaRad/Reports/${folderName}/report.pdf

IMPORTANT: Report filename MUST be exactly "report.pdf" (lowercase)

═══════════════════════════════════════════════════════════════════
`;

    await dbx.filesUpload({
      path: `${uploadBasePath}/referral-info.txt`,
      contents: detailedReferralText,
      mode: { '.tag': 'add' },
      autorename: false,
    });

    // 10. Upload metadata.json
    const metadata = {
      caseId: caseId,
      simpleId: caseData.simple_id,
      folderName: folderName,
      patientName: caseData.patient_name,
      patientDOB: caseData.patient_dob,
      patientInternalId: caseData.patient_id,
      clinicalQuestion: caseData.clinical_question,
      fieldOfView: caseData.field_of_view,
      urgency: caseData.urgency,
      referringDentist: caseData.referring_dentist,
      uploadedAt: caseData.created_at,
      clinicId: caseData.clinic_id,
      clinicName: clinicName,
      uploadPath: `${uploadBasePath}/scan.zip`,
      referralInfoPath: `${uploadBasePath}/REFERRAL-INFO.txt`,
      pdfCoverSheetPath: `${uploadBasePath}/cover-sheet.pdf`,
      reportPath: `/DentaRad/Reports/${folderName}/report.pdf`
    };

    await dbx.filesUpload({
      path: `${uploadBasePath}/metadata.json`,
      contents: JSON.stringify(metadata, null, 2),
      mode: { '.tag': 'add' },
      autorename: false,
    });

    // 11. Create Reports folder with README.txt
    const readmeText = `CASE: ${caseData.patient_name} (ID: ${simpleId})
FOLDER: ${folderName}
═══════════════════════════════════════════════════════════════════

INSTRUCTIONS FOR SAVING YOUR REPORT:

1. Complete your diagnostic report in FalconMD
2. Export report PDF from FalconMD (saves to Desktop/Downloads)
3. Drag the PDF file into THIS FOLDER
4. Rename the file to exactly: report.pdf (lowercase)
5. Go to webapp and mark case as complete

═══════════════════════════════════════════════════════════════════

CLINICAL INFORMATION:
Patient: ${caseData.patient_name}
DOB: ${caseData.patient_dob}
Clinical Question: ${caseData.clinical_question}
Field of View: ${caseData.field_of_view}
Urgency: ${caseData.urgency}
Referring Dentist: ${caseData.referring_dentist || 'N/A'}

Uploaded: ${new Date(caseData.created_at).toLocaleString()}

REFERRAL INFO AVAILABLE IN:
• /Uploads/${folderName}/REFERRAL-INFO.txt (Text file - quick reference)
• /Uploads/${folderName}/cover-sheet.pdf (PDF - for printing)
• /Uploads/${folderName}/referral-info.txt (Detailed instructions)

═══════════════════════════════════════════════════════════════════

⚠️  CRITICAL: The report filename MUST be exactly "report.pdf"

Expected final path:
/DentaRad/Reports/${folderName}/report.pdf

The webapp will look for this EXACT path. Any other filename will not work!

═══════════════════════════════════════════════════════════════════
`;

    await dbx.filesUpload({
      path: `${reportBasePath}/README.txt`,
      contents: readmeText,
      mode: { '.tag': 'add' },
      autorename: false,
    });

    // 12. Update database with paths
    const { error: updateError } = await supabaseClient
      .from('cases')
      .update({
        folder_name: folderName,
        dropbox_scan_path: dropboxPath,
        dropbox_report_path: `${reportBasePath}/report.pdf`,
        synced_to_dropbox: true,
        synced_at: new Date().toISOString(),
      })
      .eq('id', caseId);

    if (updateError) {
      throw new Error(`Failed to update case: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Case synced to Dropbox with referral info and auto-generated folders',
        folderName: folderName,
        simpleId: caseData.simple_id,
        uploadsPath: uploadBasePath,
        reportsPath: reportBasePath,
        dropbox_scan_path: dropboxPath,
        referralInfoCreated: true,
        pdfCreated: true,
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
```

## Current Problem

**Error:** "Unauthorized" when calling `sync-case-to-dropbox` edge function

**Error Location:** Line 408 in `src/pages/UploadCase.tsx`

**Edge Function Logs:**
```
2025-10-23T21:54:46Z ERROR Error in sync-case-to-dropbox: Error: Unauthorized
    at Server.<anonymous> (file:///tmp/user_fn_swusayoygknritombbwg_39335ca0-6746-400f-85ec-4d222fa4c370_14/source/supabase/functions/sync-case-to-dropbox/index.ts:26:13)
```

## Potential Issues to Investigate

1. **Authorization Header Not Being Passed:**
   - Check if `supabase.functions.invoke()` automatically includes the auth header
   - May need to explicitly pass the session token

2. **Edge Function Authentication:**
   - The function expects an Authorization header with a valid JWT
   - The JWT is validated by calling `supabaseClient.auth.getUser()`
   - If the header is missing or invalid, it throws "Unauthorized"

3. **Timing Issue:**
   - The function is called immediately after the case is created
   - The user's session may not be properly established yet

4. **CORS/Environment Issue:**
   - Check if SUPABASE_URL and SUPABASE_ANON_KEY are correctly set in the edge function environment

## Troubleshooting Steps

1. **Add Debug Logging in UploadCase.tsx:**
   ```typescript
   // Before calling sync-case-to-dropbox
   const session = await supabase.auth.getSession();
   console.log('Current session:', session.data.session ? 'valid' : 'invalid');
   console.log('User ID:', session.data.session?.user?.id);
   ```

2. **Explicitly Pass Authorization Header:**
   ```typescript
   const { data: { session } } = await supabase.auth.getSession();
   
   const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-case-to-dropbox', {
     body: { caseId: newCase.id, dropboxPath },
     headers: {
       Authorization: `Bearer ${session?.access_token}`
     }
   });
   ```

3. **Check Edge Function Config:**
   - Verify that `supabase/config.toml` doesn't have `verify_jwt = false` for this function
   - If it does, the function should work without auth, which contradicts the error

4. **Test Dropbox Credentials:**
   - Verify DROPBOX_APP_KEY, DROPBOX_APP_SECRET, and DROPBOX_REFRESH_TOKEN are set
   - Test if the Dropbox client initialization succeeds

## Expected Behavior

When a case is uploaded:
1. ✅ Scan ZIP uploaded to `/DentaRad/Uploads/{LASTNAME_FIRSTNAME_00001}/scan.zip`
2. ❌ `REFERRAL-INFO.txt` created in Uploads folder
3. ❌ `cover-sheet.pdf` created in Uploads folder  
4. ❌ `referral-info.txt` created in Uploads folder
5. ❌ `metadata.json` created in Uploads folder
6. ❌ `/DentaRad/Reports/{LASTNAME_FIRSTNAME_00001}/` folder created
7. ❌ `README.txt` created in Reports folder
8. ✅ Case record updated with Dropbox paths

Items 2-7 are failing because the edge function throws "Unauthorized" before reaching the Dropbox API calls.
