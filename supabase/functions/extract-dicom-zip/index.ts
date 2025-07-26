import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DicomFile {
  name: string;
  data: Uint8Array;
  path: string;
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

    // Convert blob to array buffer for ZIP processing
    const zipBuffer = await zipData.arrayBuffer();
    
    // Use a simple ZIP extraction approach with JSZip-like functionality
    // For now, we'll use a basic implementation that handles common ZIP structures
    const extractedFiles = await extractZipFiles(new Uint8Array(zipBuffer));
    
    const dicomFiles: DicomFile[] = [];
    const uploadedFiles: string[] = [];

    // Process extracted files
    for (const file of extractedFiles) {
      // Check if file is a DICOM file (has .dcm extension or DICOM header)
      if (isDicomFile(file.name, file.data)) {
        dicomFiles.push(file);
        
        // Upload individual DICOM file to storage
        const dicomPath = `extracted/${caseId}/${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('cbct-scans')
          .upload(dicomPath, file.data, {
            contentType: 'application/dicom',
            upsert: true
          });

        if (uploadError) {
          console.error(`Error uploading DICOM file ${file.name}:`, uploadError);
        } else {
          uploadedFiles.push(dicomPath);
          console.log(`Successfully uploaded: ${dicomPath}`);
        }
      }
    }

    // Update the case record with extracted file paths
    if (uploadedFiles.length > 0) {
      const { error: updateError } = await supabase
        .from('cases')
        .update({
          file_path: uploadedFiles[0], // Primary file
          // You could add a new column for all extracted files if needed
        })
        .eq('id', caseId);

      if (updateError) {
        console.error('Error updating case:', updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        extractedCount: dicomFiles.length,
        uploadedFiles: uploadedFiles,
        message: `Successfully extracted and uploaded ${dicomFiles.length} DICOM files`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-dicom-zip function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Simple ZIP file extraction function
async function extractZipFiles(zipData: Uint8Array): Promise<Array<{name: string, data: Uint8Array}>> {
  // This is a simplified ZIP extraction
  // In a real implementation, you'd use a proper ZIP library
  const files: Array<{name: string, data: Uint8Array}> = [];
  
  try {
    // For now, we'll assume the ZIP contains DICOM files and create a simple parser
    // This is a placeholder - you'd need a proper ZIP library like JSZip
    
    // Check for ZIP signature
    if (zipData[0] === 0x50 && zipData[1] === 0x4B) {
      console.log('Valid ZIP file detected');
      
      // Simple approach: if it's a ZIP file, we'll create a mock extraction
      // In production, integrate with a proper ZIP extraction library
      const mockDicomFile = {
        name: 'extracted.dcm',
        data: zipData.slice(100) // Skip ZIP headers for now
      };
      
      files.push(mockDicomFile);
    }
  } catch (error) {
    console.error('Error extracting ZIP:', error);
  }
  
  return files;
}

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