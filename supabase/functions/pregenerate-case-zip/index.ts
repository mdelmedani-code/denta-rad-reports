import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';
import JSZip from "https://deno.land/x/jszip@0.11.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { caseId, filePath } = await req.json();
    
    console.log(`Starting ZIP pre-generation for case: ${caseId}`);

    // Update status to processing
    await supabase
      .from('cases')
      .update({ zip_generation_status: 'processing' })
      .eq('id', caseId);

    // Extract folder path from the file_path
    const folderPath = filePath.split('/')[0];
    
    // List all files in the case folder
    const { data: fileList, error: listError } = await supabase.storage
      .from('cbct-scans')
      .list(folderPath, {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (listError) {
      console.error('Error listing files:', listError);
      throw listError;
    }

    if (!fileList || fileList.length === 0) {
      await supabase
        .from('cases')
        .update({ zip_generation_status: 'failed' })
        .eq('id', caseId);
      
      throw new Error('No files found for case');
    }

    console.log(`Found ${fileList.length} files to zip`);

    // Create ZIP file
    const zip = new JSZip();
    const batchSize = 5;

    // Process files in batches for parallel downloads
    for (let i = 0; i < fileList.length; i += batchSize) {
      const batch = fileList.slice(i, i + batchSize);
      const batchPromises = batch.map(async (file) => {
        const fullFilePath = `${folderPath}/${file.name}`;
        
        try {
          // Generate signed URL
          const { data, error } = await supabase.storage
            .from('cbct-scans')
            .createSignedUrl(fullFilePath, 3600);

          if (error) throw error;

          // Fetch file
          const response = await fetch(data.signedUrl);
          const arrayBuffer = await response.arrayBuffer();
          
          return { name: file.name, data: new Uint8Array(arrayBuffer) };
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          return null;
        }
      });
      
      const results = await Promise.allSettled(batchPromises);
      
      // Add successful downloads to ZIP
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          zip.file(result.value.name, result.value.data);
        }
      });
    }

    console.log('Generating ZIP file...');
    
    // Generate ZIP with fast compression
    const zipArrayBuffer = await zip.generateAsync({ 
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 1 }
    });

    // Get case data for filename
    const { data: caseData } = await supabase
      .from('cases')
      .select('patient_name, id')
      .eq('id', caseId)
      .single();

    const zipFileName = `${caseData?.patient_name || 'case'}_${caseId}_DICOM_files.zip`;
    const zipPath = `pregenerated-zips/${caseId}/${zipFileName}`;

    console.log('Uploading ZIP to storage...');

    // Upload ZIP to storage
    const { error: uploadError } = await supabase.storage
      .from('cbct-scans')
      .upload(zipPath, zipArrayBuffer, {
        contentType: 'application/zip',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading ZIP:', uploadError);
      throw uploadError;
    }

    // Update case with ZIP path and status
    await supabase
      .from('cases')
      .update({ 
        pregenerated_zip_path: zipPath,
        zip_generation_status: 'completed' 
      })
      .eq('id', caseId);

    console.log(`ZIP pre-generation completed for case: ${caseId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      zipPath,
      fileCount: fileList.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in pregenerate-case-zip function:', error);
    
    // Update status to failed if we have a case ID
    const { caseId } = await req.json().catch(() => ({}));
    if (caseId) {
      await supabase
        .from('cases')
        .update({ zip_generation_status: 'failed' })
        .eq('id', caseId);
    }

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});