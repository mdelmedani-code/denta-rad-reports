import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // Remove 'functions/v1/dicomweb-proxy' from the path to get the DICOMweb path
    const dicomwebPath = pathSegments.slice(3).join('/');
    
    console.log('DICOMweb proxy request:', dicomwebPath);
    console.log('Query params:', url.search);
    
    // Build the Orthanc DICOMweb URL from secrets
    const orthancBase = (Deno.env.get('ORTHANC_URL') || '').replace(/\/+$/, '');
    const orthancUrl = `${orthancBase}/dicom-web/${dicomwebPath}${url.search}`;
    console.log('Full Orthanc DICOMweb URL:', orthancUrl);
    
    // Prepare Basic auth from secrets
    const orthancUser = Deno.env.get('ORTHANC_USERNAME') || '';
    const orthancPass = Deno.env.get('ORTHANC_PASSWORD') || '';
    const authHeader = 'Basic ' + btoa(`${orthancUser}:${orthancPass}`);
    
    // Forward the request to Orthanc's DICOMweb endpoint
    const orthancResponse = await fetch(orthancUrl, {
      method: req.method,
      headers: {
        'Authorization': authHeader,
        'Accept': req.headers.get('Accept') || 'application/dicom+json',
        'Content-Type': req.headers.get('Content-Type') || 'application/dicom+json',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
    });

    console.log('Orthanc DICOMweb response status:', orthancResponse.status);
    
    if (!orthancResponse.ok) {
      const errorText = await orthancResponse.text();
      console.error('Orthanc DICOMweb error:', errorText);
      
      return new Response(JSON.stringify({
        error: `Orthanc DICOMweb error: ${orthancResponse.status} ${orthancResponse.statusText}`,
        details: errorText
      }), {
        status: orthancResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get response data
    const contentType = orthancResponse.headers.get('Content-Type') || 'application/dicom+json';
    
    let responseData;
    if (contentType.includes('application/json') || contentType.includes('application/dicom+json')) {
      responseData = await orthancResponse.text();
    } else {
      responseData = await orthancResponse.arrayBuffer();
    }

    // Return the response with CORS headers
    return new Response(responseData, {
      status: orthancResponse.status,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': orthancResponse.headers.get('Cache-Control') || 'no-cache',
      }
    });

  } catch (error) {
    console.error('DICOMweb proxy error:', error);
    
    return new Response(JSON.stringify({
      error: 'DICOMweb proxy error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});