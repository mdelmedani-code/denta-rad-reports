import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Dropbox } from 'https://esm.sh/dropbox@10.34.0';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';

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
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header present:', !!authHeader);
    
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

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError) {
      console.error('User auth error:', userError);
      throw new Error(`Authentication failed: ${userError.message}`);
    }

    if (!user) {
      throw new Error('No user found');
    }

    console.log('User authenticated:', user.id);

    // 2. Get request parameters
    const { caseId, dropboxPath } = await req.json();

    if (!caseId || !dropboxPath) {
      throw new Error('Missing caseId or dropboxPath');
    }

    console.log('Syncing case:', caseId, 'to path:', dropboxPath);

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

    console.log('Generated folder name:', folderName);

    // 5. Initialize Dropbox
    const dbx = new Dropbox({
      clientId: Deno.env.get('DROPBOX_APP_KEY'),
      clientSecret: Deno.env.get('DROPBOX_APP_SECRET'),
      refreshToken: Deno.env.get('DROPBOX_REFRESH_TOKEN'),
    });

    // === CREATE UPLOADS FOLDER ===
    const uploadBasePath = `/DentaRad/Uploads/${folderName}`;
    const reportBasePath = `/DentaRad/Reports/${folderName}`;
    console.log('Creating uploads folder:', uploadBasePath);

    // 6. Create simple text-based referral info (DICOM SR removed due to complexity)
    console.log('Creating referral information text file...');
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
      mode: { '.tag': 'overwrite' },
      autorename: false,
    });
    console.log('Referral info text file uploaded');

    // 7. Generate and upload cover sheet PDF
    console.log('Generating PDF cover sheet...');
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
      mode: { '.tag': 'overwrite' },
      autorename: false,
    });
    console.log('PDF cover sheet uploaded');

    // 8. Create detailed referral-info.txt for reporter
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
      mode: { '.tag': 'overwrite' },
      autorename: false,
    });

    console.log('Referral info uploaded');

    // 9. Create metadata.json
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
      mode: { '.tag': 'overwrite' },
      autorename: false,
    });

    console.log('Metadata uploaded');

    // === CREATE REPORTS FOLDER ===
    console.log('Creating reports folder:', reportBasePath);

    // 10. Explicitly create the Reports folder first
    try {
      await dbx.filesCreateFolderV2({
        path: reportBasePath,
        autorename: false
      });
      console.log('Reports folder created successfully:', reportBasePath);
    } catch (error) {
      // Ignore error if folder already exists (409 conflict)
      if (error.status === 409) {
        console.log('Reports folder already exists:', reportBasePath);
      } else {
        console.error('Error creating reports folder:', error);
        throw error;
      }
    }

    // 11. Create README.txt in Reports folder
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

    try {
      await dbx.filesUpload({
        path: `${reportBasePath}/README.txt`,
        contents: readmeText,
        mode: { '.tag': 'overwrite' },
        autorename: false,
      });
      console.log('README uploaded to Reports folder successfully');
    } catch (error) {
      console.error('Error uploading README to Reports folder:', error);
      throw error;
    }

    // 12. Update database with paths and folder name
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

    console.log('Case updated with folder name and paths');

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

// ============================================================================
// HELPER: Generate folder name from patient name and ID
// ============================================================================
function generateFolderName(patientName: string, simpleId: number): string {
  const nameParts = patientName.trim().split(/\s+/);
  
  let firstName = nameParts[0]
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '');
  
  let lastName = nameParts.length > 1
    ? nameParts[nameParts.length - 1]
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z]/g, '')
    : firstName;
  
  if (!firstName) firstName = 'UNKNOWN';
  if (!lastName) lastName = firstName;

  const idFormatted = String(simpleId).padStart(5, '0');

  return `${lastName}_${firstName}_${idFormatted}`;
}

// ============================================================================
// HELPER: Generate cover sheet PDF
// ============================================================================
async function generateCoverSheetPDF(caseData: any) {
  const { PDFDocument, rgb } = await import('https://cdn.skypack.dev/pdf-lib@1.17.1');
  
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const { height } = page.getSize();
  
  const fontSize = 12;
  const titleSize = 18;
  const sectionSize = 14;
  const margin = 50;
  let y = height - margin;

  page.drawText('CBCT SCAN REFERRAL', {
    x: margin,
    y: y,
    size: titleSize,
    color: rgb(0, 0.2, 0.4),
  });
  
  y -= 25;
  
  page.drawText(`Case ID: ${caseData.id}`, {
    x: margin,
    y: y,
    size: 11,
    color: rgb(0.4, 0.4, 0.4),
  });
  
  y -= 15;
  
  page.drawText(`Folder: ${caseData.folder_name}`, {
    x: margin,
    y: y,
    size: 11,
    color: rgb(0.4, 0.4, 0.4),
  });

  y -= 30;

  page.drawLine({
    start: { x: margin, y: y },
    end: { x: 595 - margin, y: y },
    thickness: 2,
    color: rgb(0, 0.2, 0.4),
  });
  y -= 40;

  page.drawText('PATIENT INFORMATION', {
    x: margin,
    y: y,
    size: sectionSize,
    color: rgb(0, 0, 0),
  });
  y -= 25;

  const patientFields = [
    ['Patient Name:', caseData.patient_name],
    ['Date of Birth:', caseData.patient_dob],
    ['Internal ID:', caseData.patient_id || 'N/A'],
  ];

  for (const [label, value] of patientFields) {
    page.drawText(label, {
      x: margin,
      y: y,
      size: fontSize,
      color: rgb(0.4, 0.4, 0.4),
    });
    page.drawText(value.toString(), {
      x: margin + 120,
      y: y,
      size: fontSize,
      color: rgb(0, 0, 0),
    });
    y -= 20;
  }

  y -= 20;

  page.drawText('CLINICAL INFORMATION', {
    x: margin,
    y: y,
    size: sectionSize,
    color: rgb(0, 0, 0),
  });
  y -= 25;

  page.drawText('Clinical Question:', {
    x: margin,
    y: y,
    size: fontSize,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 20;

  const clinicalQ = caseData.clinical_question;
  const maxCharsPerLine = 70;
  const words = clinicalQ.split(' ');
  let line = '';
  
  for (const word of words) {
    const testLine = line + word + ' ';
    if (testLine.length > maxCharsPerLine) {
      page.drawText(line.trim(), {
        x: margin + 20,
        y: y,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
      line = word + ' ';
      y -= 18;
    } else {
      line = testLine;
    }
  }
  
  if (line.trim().length > 0) {
    page.drawText(line.trim(), {
      x: margin + 20,
      y: y,
      size: fontSize,
      color: rgb(0, 0, 0),
    });
    y -= 18;
  }

  y -= 15;

  const scanFields = [
    ['Field of View:', caseData.field_of_view],
    ['Urgency:', caseData.urgency],
  ];

  for (const [label, value] of scanFields) {
    page.drawText(label, {
      x: margin,
      y: y,
      size: fontSize,
      color: rgb(0.4, 0.4, 0.4),
    });
    page.drawText(value.toString(), {
      x: margin + 120,
      y: y,
      size: fontSize,
      color: rgb(0, 0, 0),
    });
    y -= 20;
  }

  y -= 20;

  page.drawText('REFERRING INFORMATION', {
    x: margin,
    y: y,
    size: sectionSize,
    color: rgb(0, 0, 0),
  });
  y -= 25;

  const referralFields = [
    ['Dentist:', caseData.referring_dentist || 'N/A'],
    ['Clinic:', caseData.clinic_name || 'N/A'],
    ['Uploaded:', new Date(caseData.created_at).toLocaleString()],
  ];

  for (const [label, value] of referralFields) {
    page.drawText(label, {
      x: margin,
      y: y,
      size: fontSize,
      color: rgb(0.4, 0.4, 0.4),
    });
    page.drawText(value.toString(), {
      x: margin + 120,
      y: y,
      size: fontSize,
      color: rgb(0, 0, 0),
    });
    y -= 20;
  }

  y -= 30;

  page.drawText('NOTE: This information is also available in DICOM format:', {
    x: margin,
    y: y,
    size: 10,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 15;
  page.drawText(`REFERRAL-INFO.dcm (opens in FalconMD alongside images)`, {
    x: margin,
    y: y,
    size: 10,
    color: rgb(0.3, 0.3, 0.3),
  });

  page.drawLine({
    start: { x: margin, y: 80 },
    end: { x: 595 - margin, y: 80 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
  
  page.drawText('Please review DICOM images with reference to this clinical information.', {
    x: margin,
    y: 60,
    size: 10,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
