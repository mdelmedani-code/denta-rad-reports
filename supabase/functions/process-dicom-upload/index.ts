import { corsHeaders } from '../_shared/cors.ts'

interface ProcessRequest {
  storagePath: string;
  fileName: string;
  bucketName: string;
}

interface OrthancResponse {
  ID: string;
  ParentStudy: string;
  ParentSeries: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { storagePath, fileName, bucketName }: ProcessRequest = await req.json();
    
    console.log('Processing DICOM upload:', { storagePath, fileName, bucketName });
    
    if (!storagePath || !fileName || !bucketName) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Missing required parameters: storagePath, fileName, or bucketName' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Create Supabase client for server-side operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get file from Supabase Storage
    const storageUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${storagePath}`;
    
    console.log('Fetching file from storage:', storageUrl);
    
    const storageResponse = await fetch(storageUrl, {
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
      }
    });
    
    if (!storageResponse.ok) {
      throw new Error(`Failed to fetch file from storage: ${storageResponse.status} ${storageResponse.statusText}`);
    }
    
    // Get file as binary data
    const fileBuffer = await storageResponse.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);
    
    console.log(`Retrieved file from storage, size: ${fileBytes.length} bytes`);
    
    // Validate DICOM header
    if (fileBytes.length > 132) {
      const fileHeader = new TextDecoder().decode(fileBytes.slice(128, 132));
      if (fileHeader !== 'DICM') {
        console.warn('File does not appear to be a valid DICOM file. Header:', fileHeader);
      } else {
        console.log('Valid DICOM header detected');
      }
    }
    
    // Upload to Orthanc using binary data
    console.log('Uploading to Orthanc PACS...');
    
    const orthancBase = (Deno.env.get('ORTHANC_URL') || '').replace(/\/+$/, '');
    const orthancUser = Deno.env.get('ORTHANC_USERNAME') || '';
    const orthancPass = Deno.env.get('ORTHANC_PASSWORD') || '';
    const authHeader = 'Basic ' + btoa(`${orthancUser}:${orthancPass}`);
    
    const orthancResponse = await fetch(`${orthancBase}/instances`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/dicom',
        'Content-Length': fileBytes.length.toString(),
      },
      body: fileBytes
    });
    
    console.log(`Orthanc response status: ${orthancResponse.status}`);
    
    if (!orthancResponse.ok) {
      const errorText = await orthancResponse.text();
      console.error('Orthanc upload failed:', errorText);
      
      return new Response(JSON.stringify({
        success: false,
        error: `PACS upload failed: ${orthancResponse.status} ${orthancResponse.statusText}`,
        details: errorText
      }), {
        status: orthancResponse.status >= 500 ? 502 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Parse Orthanc response
    const responseText = await orthancResponse.text();
    console.log('Orthanc response:', responseText.substring(0, 500));
    
    if (responseText.trim() === '') {
      throw new Error('Orthanc returned empty response - file may have been rejected');
    }
    
    let orthancData: OrthancResponse;
    try {
      orthancData = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Invalid JSON response from Orthanc: ${responseText}`);
    }
    
    if (!orthancData.ID) {
      throw new Error('Orthanc response missing instance ID');
    }
    
    console.log('Upload successful! Instance ID:', orthancData.ID);
    
    // Get detailed instance information
    let studyInstanceUID = orthancData.ParentStudy;
    let seriesInstanceUID = orthancData.ParentSeries;
    
    try {
      const instanceUrl = `${orthancBase}/instances/${orthancData.ID}`;
      const instanceResponse = await fetch(instanceUrl, {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json'
        }
      });
      
      if (instanceResponse.ok) {
        const instanceData = await instanceResponse.json();
        console.log('Retrieved instance details:', instanceData);
        studyInstanceUID = instanceData.ParentStudy || studyInstanceUID;
        seriesInstanceUID = instanceData.ParentSeries || seriesInstanceUID;
      }
    } catch (queryError) {
      console.warn('Could not retrieve detailed instance information:', queryError);
    }
    
    // Clean up uploaded file from storage (optional)
    try {
      const deleteUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${storagePath}`;
      await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
        }
      });
      console.log('Cleaned up temporary file from storage');
    } catch (cleanupError) {
      console.warn('Could not clean up temporary file:', cleanupError);
    }
    
    // Return success response
    return new Response(JSON.stringify({
      success: true,
      orthancId: orthancData.ID,
      studyInstanceUID,
      seriesInstanceUID,
      sopInstanceUID: orthancData.ID,
      message: 'File successfully uploaded to PACS'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Process DICOM upload error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error',
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});