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
    let metadata: any = null;

    // Find all DICOM files in the ZIP
    for (const [filename, file] of Object.entries(zip.files)) {
      if (filename.toLowerCase().endsWith('.dcm') && !file.dir) {
        dicomFiles.push(filename);
        
        // Extract metadata from first DICOM file
        if (!metadata) {
          const arrayBuffer = await file.async('arraybuffer');
          metadata = extractDicomMetadata(new Uint8Array(arrayBuffer));
        }
      }
    }

    if (dicomFiles.length === 0) {
      throw new Error('No DICOM files found in ZIP');
    }

    console.log(`Found ${dicomFiles.length} DICOM files in ZIP`);

    // Update the case record with metadata
    const { error: updateError } = await supabase
      .from('cases')
      .update({
        status: 'awaiting_report',
        dicom_metadata: metadata || {},
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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Extract basic DICOM metadata
function extractDicomMetadata(data: Uint8Array): any {
  try {
    // Check for DICOM header
    if (data.length > 132) {
      const dicmBytes = data.slice(128, 132);
      const dicmString = String.fromCharCode(...dicmBytes);
      
      if (dicmString === 'DICM') {
        // Basic metadata extraction
        // In production, use a proper DICOM parser like dicom-parser
        return {
          isDicom: true,
          fileSize: data.length,
          extractedAt: new Date().toISOString(),
          // Add more metadata fields as needed when you integrate dicom-parser
        };
      }
    }
  } catch (error) {
    console.error('Error extracting DICOM metadata:', error);
  }
  
  return {
    isDicom: false,
    fileSize: data.length,
    extractedAt: new Date().toISOString()
  };
}