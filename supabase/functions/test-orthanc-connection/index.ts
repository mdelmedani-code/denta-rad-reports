import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const orthancUrl = `http://116.203.35.168:8042/system`
    
    console.log('Testing connection to Orthanc:', orthancUrl)
    
    const response = await fetch(orthancUrl, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic YWRtaW46TGlvbkVhZ2xlMDMwNCE=', // admin:LionEagle0304!
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
        url: `http://116.203.35.168:8042/system`
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