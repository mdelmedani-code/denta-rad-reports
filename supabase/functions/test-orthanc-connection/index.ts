import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const orthancBase = (Deno.env.get('ORTHANC_URL') || '').replace(/\/+$/, '');
    const orthancUrl = `${orthancBase}/system`
    
    console.log('Testing connection to Orthanc:', orthancUrl)
    
    const authHeader = 'Basic ' + btoa(`${Deno.env.get('ORTHANC_USERNAME') || ''}:${Deno.env.get('ORTHANC_PASSWORD') || ''}`);
    const response = await fetch(orthancUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    })
    
    console.log('Orthanc system response status:', response.status)
    console.log('Orthanc system response headers:', Object.fromEntries(response.headers.entries()))
    
    const responseText = await response.text()
    console.log('Orthanc system response body:', responseText)
    
    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      data = { 
        success: false, 
        message: responseText,
        status: response.status,
        parseError: parseError.message
      }
    }
    
    return new Response(
      JSON.stringify({
        success: response.ok,
        status: response.status,
        data: data,
        url: orthancUrl
      }),
      {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
      },
    )
  } catch (error) {
    console.error('Orthanc connection test error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        url: `${orthancBase}/system`
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
      },
    )
  }
})