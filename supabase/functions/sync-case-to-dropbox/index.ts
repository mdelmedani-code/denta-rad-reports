import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Dropbox } from 'https://esm.sh/dropbox@10.34.0';
import dcmjs from 'https://esm.sh/dcmjs@0.29.7';

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

    // 6. Generate DICOM Structured Report
    console.log('Generating DICOM SR...');
    const dicomSR = await createDICOMStructuredReport({
      simpleId: simpleId,
      patientName: caseData.patient_name,
      patientDOB: caseData.patient_dob,
      patientID: caseData.patient_id || simpleId,
      clinicalQuestion: caseData.clinical_question,
      fieldOfView: caseData.field_of_view,
      urgency: caseData.urgency,
      referringDentist: caseData.referring_dentist,
      clinicName: clinicName,
      studyDate: new Date().toISOString().split('T')[0].replace(/-/g, ''),
      studyTime: new Date().toTimeString().split(' ')[0].replace(/:/g, ''),
      folderName: folderName,
    });

    await dbx.filesUpload({
      path: `${uploadBasePath}/REFERRAL-INFO.dcm`,
      contents: dicomSR,
      mode: { '.tag': 'add' },
      autorename: false,
    });
    console.log('DICOM SR uploaded');

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
      mode: { '.tag': 'add' },
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
1. REFERRAL-INFO.txt - Quick reference (opens in any text editor)
2. cover-sheet.pdf - PDF document (for printing/emailing)
3. referral-info.txt - Detailed instructions (this file)

INSTRUCTIONS FOR REPORTER:
1. Download this folder from Dropbox
2. Import to FalconMD (folder contains DICOM SR + images)
3. FalconMD will show clinical info alongside images
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
      dicomSRPath: `${uploadBasePath}/REFERRAL-INFO.dcm`,
      pdfCoverSheetPath: `${uploadBasePath}/cover-sheet.pdf`,
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
    console.log('Creating reports folder:', reportBasePath);

    // 10. Create README.txt in Reports folder
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
• /Uploads/${folderName}/REFERRAL-INFO.dcm (DICOM - opens in FalconMD)
• /Uploads/${folderName}/cover-sheet.pdf (PDF - for printing)
• /Uploads/${folderName}/referral-info.txt (Text - quick reference)

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

    // 11. Update database with paths and folder name
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
        message: 'Case synced to Dropbox with DICOM SR and auto-generated folders',
        folderName: folderName,
        simpleId: caseData.simple_id,
        uploadsPath: uploadBasePath,
        reportsPath: reportBasePath,
        dropbox_scan_path: dropboxPath,
        dicomSRCreated: true,
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
// HELPER: Create DICOM Structured Report
// ============================================================================
async function createDICOMStructuredReport(referralData: any): Promise<Uint8Array> {
  const { DicomMetaDictionary } = dcmjs.data;

  const studyInstanceUID = generateDICOMUID();
  const seriesInstanceUID = generateDICOMUID();
  const sopInstanceUID = generateDICOMUID();

  // Create dataset in denaturalized format (tag numbers, not names)
  const dataset: any = {
    '00080005': { vr: 'CS', Value: ['ISO_IR 100'] }, // SpecificCharacterSet
    '00080016': { vr: 'UI', Value: ['1.2.840.10008.5.1.4.1.1.88.11'] }, // SOPClassUID - Basic Text SR
    '00080018': { vr: 'UI', Value: [sopInstanceUID] }, // SOPInstanceUID
    '00080020': { vr: 'DA', Value: [referralData.studyDate] }, // StudyDate
    '00080030': { vr: 'TM', Value: [referralData.studyTime] }, // StudyTime
    '00080050': { vr: 'SH', Value: [referralData.simpleId] }, // AccessionNumber
    '00080060': { vr: 'CS', Value: ['SR'] }, // Modality
    '00080064': { vr: 'CS', Value: ['DT'] }, // ConversionType
    '00080090': { vr: 'PN', Value: [{ Alphabetic: referralData.referringDentist || 'UNKNOWN' }] }, // ReferringPhysicianName
    '0020000D': { vr: 'UI', Value: [studyInstanceUID] }, // StudyInstanceUID
    '0020000E': { vr: 'UI', Value: [seriesInstanceUID] }, // SeriesInstanceUID
    '00200010': { vr: 'SH', Value: [referralData.simpleId] }, // StudyID
    '00200011': { vr: 'IS', Value: ['999'] }, // SeriesNumber (high number so it appears after CBCT)
    '00200013': { vr: 'IS', Value: ['1'] }, // InstanceNumber
    '00100010': { vr: 'PN', Value: [{ Alphabetic: referralData.patientName }] }, // PatientName
    '00100020': { vr: 'LO', Value: [referralData.patientID] }, // PatientID
    '00100030': { vr: 'DA', Value: [referralData.patientDOB?.replace(/-/g, '') || ''] }, // PatientBirthDate
    '0040A491': { vr: 'CS', Value: ['COMPLETE'] }, // CompletionFlag
    '0040A493': { vr: 'CS', Value: ['UNVERIFIED'] }, // VerificationFlag
    '0040A504': { vr: 'SQ', Value: [{ // ContentTemplateSequence
      '0040DB00': { vr: 'CS', Value: ['DentaRad Referral'] },
    }] },
    '0040A730': { vr: 'SQ', Value: [{ // ContentSequence - the actual report content
      '0040A010': { vr: 'CS', Value: ['CONTAINER'] },
      '0040A040': { vr: 'CS', Value: ['SEPARATE'] },
      '0040A043': { vr: 'SQ', Value: [{
        '00080100': { vr: 'SH', Value: ['18782-3'] },
        '00080102': { vr: 'SH', Value: ['LN'] },
        '00080104': { vr: 'LO', Value: ['Radiology Study observation'] },
      }] },
      '0040A730': { vr: 'SQ', Value: [
        {
          '0040A010': { vr: 'CS', Value: ['TEXT'] },
          '0040A040': { vr: 'CS', Value: ['SEPARATE'] },
          '0040A043': { vr: 'SQ', Value: [{
            '00080100': { vr: 'SH', Value: ['121109'] },
            '00080102': { vr: 'SH', Value: ['DCM'] },
            '00080104': { vr: 'LO', Value: ['Clinical Information'] },
          }] },
          '0040A160': { vr: 'UT', Value: [`
CBCT SCAN REFERRAL - Case ${referralData.simpleId}

Patient: ${referralData.patientName}
Date of Birth: ${referralData.patientDOB || 'N/A'}
Patient ID: ${referralData.patientID}

Clinical Question:
${referralData.clinicalQuestion}

Field of View: ${referralData.fieldOfView}
Urgency: ${referralData.urgency.toUpperCase()}
Referring Dentist: ${referralData.referringDentist || 'N/A'}
Clinic: ${referralData.clinicName}
`] },
        },
      ] },
    }] },
  };

  const meta = {
    '00020001': { vr: 'OB', Value: [new Uint8Array([0, 1]).buffer] }, // FileMetaInformationVersion
    '00020002': { vr: 'UI', Value: ['1.2.840.10008.5.1.4.1.1.88.11'] }, // MediaStorageSOPClassUID
    '00020003': { vr: 'UI', Value: [sopInstanceUID] }, // MediaStorageSOPInstanceUID
    '00020010': { vr: 'UI', Value: ['1.2.840.10008.1.2.1'] }, // TransferSyntaxUID - Explicit VR Little Endian
    '00020012': { vr: 'UI', Value: ['1.2.826.0.1.3680043.10.854'] }, // ImplementationClassUID
    '00020013': { vr: 'SH', Value: ['DentaRad_v1'] }, // ImplementationVersionName
  };

  dataset._meta = meta;

  const buffer = dcmjs.data.datasetToBlob(dataset);
  return new Uint8Array(buffer);
}

function createTextContentItem(conceptCode: string, conceptName: string, textValue: string) {
  return {
    '0040A010': { vr: 'CS', Value: ['TEXT'] },
    '0040A040': { vr: 'CS', Value: ['SEPARATE'] },
    '0040A043': { 
      vr: 'SQ', 
      Value: [{
        '00080100': { vr: 'SH', Value: [conceptCode] },
        '00080102': { vr: 'SH', Value: ['DentaRad'] },
        '00080104': { vr: 'LO', Value: [conceptName] },
      }]
    },
    '0040A160': { vr: 'UT', Value: [textValue] },
  };
}

function generateDICOMUID(): string {
  const root = '1.2.826.0.1.3680043.10.474';
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return `${root}.${timestamp}.${random}`;
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
