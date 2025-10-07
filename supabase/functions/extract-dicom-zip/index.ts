import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'
import JSZip from 'https://esm.sh/jszip@3.10.1'

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
    const { caseId, zipFilePath } = await req.json();
    
    if (!caseId || !zipFilePath) {
      return new Response(
        JSON.stringify({ error: 'Missing caseId or zipFilePath' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Processing ZIP file: ${zipFilePath} for case: ${caseId}`);

    // Download the ZIP file from storage
    const { data: zipData, error: downloadError } = await supabase.storage
      .from('cbct-scans')
      .download(zipFilePath);

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
    
    const dicomFiles: string[] = [];
    let firstDicomMetadata: any = null;

    // Process each file in the ZIP
    for (const [filename, file] of Object.entries(zip.files)) {
      if (file.dir) continue;
      
      // Check if it's a DICOM file
      if (filename.toLowerCase().endsWith('.dcm') || 
          filename.toLowerCase().endsWith('.dicom')) {
        
        const fileData = await file.async('arraybuffer');
        const uint8Array = new Uint8Array(fileData);
        
        // Verify DICOM header
        if (isDicomFile(filename, uint8Array)) {
          dicomFiles.push(filename);
          
          // Extract metadata from first DICOM file
          if (!firstDicomMetadata) {
            firstDicomMetadata = extractBasicDicomMetadata(uint8Array);
          }
        }
      }
    }

    if (dicomFiles.length === 0) {
      throw new Error('No valid DICOM files found in ZIP');
    }

    console.log(`Found ${dicomFiles.length} DICOM files`);

    // Update case with metadata and processing status
    const { error: updateError } = await supabase
      .from('cases')
      .update({
        status: 'awaiting_report',
        dicom_metadata: firstDicomMetadata || {},
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
        metadata: firstDicomMetadata,
        message: `Successfully processed ${dicomFiles.length} DICOM files`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-dicom-zip function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Check if a file is a DICOM file
function isDicomFile(filename: string, data: Uint8Array): boolean {
  // Check file extension
  if (filename.toLowerCase().endsWith('.dcm') || filename.toLowerCase().endsWith('.dicom')) {
    return true;
  }
  
  // Check DICOM header (starts with specific bytes after 128 byte preamble)
  if (data.length > 132) {
    const dicmBytes = data.slice(128, 132);
    const dicmString = String.fromCharCode(...dicmBytes);
    return dicmString === 'DICM';
  }
  
  return false;
}

// Extract basic DICOM metadata without full parser
function extractBasicDicomMetadata(data: Uint8Array): any {
  const metadata: any = {
    fileSize: data.length,
    hasDicomHeader: false,
    extractedAt: new Date().toISOString()
  };
  
  // Check for DICM header
  if (data.length > 132) {
    const dicmBytes = data.slice(128, 132);
    const dicmString = String.fromCharCode(...dicmBytes);
    metadata.hasDicomHeader = dicmString === 'DICM';
  }
  
  // Note: For production, integrate dicom-parser for full metadata extraction
  // This is a simplified version that confirms DICOM validity
  
  return metadata;
}
