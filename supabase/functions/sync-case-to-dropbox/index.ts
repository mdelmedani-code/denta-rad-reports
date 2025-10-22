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
    console.log('Creating uploads folder:', uploadBasePath);

    // 6. Generate and upload cover sheet PDF
    const coverSheetPDF = await generateCoverSheetPDF({
      id: String(caseData.simple_id).padStart(5, '0'),
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

    console.log('Cover sheet uploaded');

    // 7. Create referral-info.txt
    const referralText = `CBCT SCAN REFERRAL
==================

Case ID: ${String(caseData.simple_id).padStart(5, '0')}
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

INSTRUCTIONS FOR REPORTER:

1. Review DICOM from this folder
2. Open cover-sheet.pdf for clinical context
3. Create report in FalconMD
4. Export report PDF from FalconMD (to Desktop/Downloads)
5. Save report to: /DentaRad/Reports/${folderName}/report.pdf

IMPORTANT: Filename MUST be exactly "report.pdf" (lowercase)

═══════════════════════════════════════════════════════════════════
`;

    await dbx.filesUpload({
      path: `${uploadBasePath}/referral-info.txt`,
      contents: referralText,
      mode: { '.tag': 'add' },
      autorename: false,
    });

    console.log('Referral info uploaded');

    // 8. Create metadata.json
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
      reportPath: `/DentaRad/Reports/${folderName}/report.pdf`
    };

    await dbx.filesUpload({
      path: `${uploadBasePath}/metadata.json`,
      contents: JSON.stringify(metadata, null, 2),
      mode: { '.tag': 'add' },
      autorename: false,
    });

    console.log('Metadata uploaded');

    // === CREATE EMPTY REPORTS FOLDER ===
    const reportBasePath = `/DentaRad/Reports/${folderName}`;
    console.log('Creating reports folder:', reportBasePath);

    // 9. Create README.txt in Reports folder
    const readmeText = `CASE: ${caseData.patient_name} (ID: ${String(caseData.simple_id).padStart(5, '0')})
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

    console.log('README uploaded to Reports folder');

    // 10. Update database with paths and folder name
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
        message: 'Case synced to Dropbox with auto-generated folders',
        folderName: folderName,
        simpleId: caseData.simple_id,
        uploadsPath: uploadBasePath,
        reportsPath: reportBasePath,
        dropbox_scan_path: dropboxPath,
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

// Helper: Generate folder name from patient name and ID
function generateFolderName(patientName: string, simpleId: number): string {
  // Split name into parts
  const nameParts = patientName.trim().split(/\s+/);
  
  // Get first name (first part)
  let firstName = nameParts[0]
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^A-Z]/g, ''); // Remove non-letters
  
  // Get last name (last part, or use first name if only one name)
  let lastName = nameParts.length > 1
    ? nameParts[nameParts.length - 1]
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z]/g, '')
    : firstName;
  
  // Fallback if empty
  if (!firstName) firstName = 'UNKNOWN';
  if (!lastName) lastName = firstName;

  // Format ID with leading zeros (5 digits)
  const idFormatted = String(simpleId).padStart(5, '0');

  return `${lastName}_${firstName}_${idFormatted}`;
}

// Helper: Generate cover sheet PDF
async function generateCoverSheetPDF(caseData: any) {
  const { PDFDocument, rgb } = await import('https://cdn.skypack.dev/pdf-lib@1.17.1');
  
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { height } = page.getSize();
  
  const fontSize = 12;
  const titleSize = 18;
  const sectionSize = 14;
  const margin = 50;
  let y = height - margin;

  // Title
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

  // Horizontal line
  page.drawLine({
    start: { x: margin, y: y },
    end: { x: 595 - margin, y: y },
    thickness: 2,
    color: rgb(0, 0.2, 0.4),
  });
  y -= 40;

  // Patient Information Section
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

  // Clinical Information Section
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

  // Handle multi-line clinical question
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

  // Referring Information Section
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

  // Footer
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