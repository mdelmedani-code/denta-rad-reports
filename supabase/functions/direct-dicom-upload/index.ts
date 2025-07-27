import { corsHeaders } from '../_shared/cors.ts'

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
    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string;
    
    console.log('Direct DICOM upload:', { fileName, fileSize: file?.size });
    
    if (!file || !fileName) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Missing file or fileName in form data' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Get file as binary data
    const fileBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);
    
    console.log(`Processing file: ${fileName}, size: ${fileBytes.length} bytes`);
    
    // Validate DICOM header
    if (fileBytes.length > 132) {
      const fileHeader = new TextDecoder().decode(fileBytes.slice(128, 132));
      if (fileHeader !== 'DICM') {
        console.warn('File does not appear to be a valid DICOM file. Header:', fileHeader);
      } else {
        console.log('Valid DICOM header detected');
      }
    }
    
    // Upload directly to Orthanc
    console.log('Uploading to Orthanc PACS...');
    
    const orthancResponse = await fetch(`http://116.203.35.168:8042/instances`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic YWRtaW46TGlvbkVhZ2xlMDMwNCE=', // admin:LionEagle0304!
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
      const instanceUrl = `http://116.203.35.168:8042/instances/${orthancData.ID}`;
      const instanceResponse = await fetch(instanceUrl, {
        headers: {
          'Authorization': 'Basic YWRtaW46TGlvbkVhZ2xlMDMwNCE=',
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
    console.error('Direct DICOM upload error:', error);
    
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