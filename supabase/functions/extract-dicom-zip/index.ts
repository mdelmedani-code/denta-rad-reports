import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'
import JSZip from 'https://esm.sh/jszip@3.10.1'
import * as dicomParser from 'https://esm.sh/dicom-parser@1.8.13'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { caseId, zipPath } = await req.json();
    
    if (!caseId || !zipPath) {
      return new Response(
        JSON.stringify({ error: 'Missing caseId or zipPath' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Processing ZIP file: ${zipPath} for case: ${caseId}`);

    // Download the ZIP file from storage
    const { data: zipData, error: downloadError } = await supabase.storage
      .from('cbct-scans')
      .download(zipPath);

    if (downloadError) {
      console.error('Error downloading ZIP file:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Failed to download ZIP file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract ZIP using JSZip
    const zipBuffer = await zipData.arrayBuffer();
    const zip = await JSZip.loadAsync(zipBuffer);
    
    const dicomFiles: { filename: string; data: ArrayBuffer }[] = [];

    // Process each file in the ZIP
    for (const [filename, file] of Object.entries(zip.files)) {
      if (file.dir) continue;
      
      // Check if it's a DICOM file
      const lowerName = filename.toLowerCase();
      if (!lowerName.endsWith('.dcm') && !lowerName.endsWith('.dicom')) {
        continue;
      }
      
      const fileData = await file.async('arraybuffer');
      
      // Verify DICOM header
      if (isDicomFile(fileData)) {
        dicomFiles.push({ filename, data: fileData });
      } else {
        console.warn(`Skipping ${filename} - not valid DICOM`);
      }
    }

    if (dicomFiles.length === 0) {
      throw new Error('No valid DICOM files found in ZIP');
    }

    console.log(`Found ${dicomFiles.length} DICOM files`);

    // Extract metadata from first DICOM file using dicom-parser
    const metadata = extractDicomMetadata(dicomFiles[0].data);
    console.log('Extracted metadata:', metadata);

    // Update case with metadata and processing status
    const { error: updateError } = await supabase
      .from('cases')
      .update({
        status: 'awaiting_report',
        dicom_metadata: metadata,
        series_count: dicomFiles.length,
        processed_at: new Date().toISOString()
      })
      .eq('id', caseId);

    if (updateError) {
      console.error('Error updating case:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        seriesCount: dicomFiles.length,
        metadata: metadata,
        message: `Successfully processed ${dicomFiles.length} DICOM files`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-dicom-zip function:', error);
    
    // Try to update case to error status
    try {
      const { caseId } = await req.json();
      if (caseId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase.from('cases').update({ status: 'error' }).eq('id', caseId);
      }
    } catch {}
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Check if a file is a DICOM file by checking the DICM header
function isDicomFile(buffer: ArrayBuffer): boolean {
  const view = new Uint8Array(buffer);
  if (buffer.byteLength < 132) return false;
  
  // Check for DICM magic bytes at offset 128
  return view[128] === 0x44 && view[129] === 0x49 && 
         view[130] === 0x43 && view[131] === 0x4D;
}

// Extract DICOM metadata using dicom-parser
function extractDicomMetadata(buffer: ArrayBuffer) {
  try {
    const byteArray = new Uint8Array(buffer);
    const dataSet = dicomParser.parseDicom(byteArray);
    
    return {
      patientName: dataSet.string('x00100010') || 'Unknown',
      patientID: dataSet.string('x00100020') || 'Unknown',
      patientBirthDate: dataSet.string('x00100030') || null,
      patientAge: dataSet.string('x00101010') || null,
      patientSex: dataSet.string('x00100040') || null,
      studyDate: dataSet.string('x00080020') || null,
      studyTime: dataSet.string('x00080030') || null,
      studyDescription: dataSet.string('x00081030') || null,
      seriesDescription: dataSet.string('x0008103E') || null,
      modality: dataSet.string('x00080060') || 'CT',
      manufacturer: dataSet.string('x00080070') || null,
      manufacturerModel: dataSet.string('x00081090') || null,
      institutionName: dataSet.string('x00080080') || null,
      studyInstanceUID: dataSet.string('x0020000D') || null,
      seriesInstanceUID: dataSet.string('x0020000E') || null,
      sliceThickness: dataSet.string('x00180050') || null,
      pixelSpacing: dataSet.string('x00280030') || null,
      rows: dataSet.uint16('x00280010') || null,
      columns: dataSet.uint16('x00280011') || null,
      extractedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('DICOM parsing error:', error);
    return {
      patientName: 'Parse Error',
      modality: 'CT',
      error: error instanceof Error ? error.message : 'Unknown parsing error',
      extractedAt: new Date().toISOString()
    };
  }
}
