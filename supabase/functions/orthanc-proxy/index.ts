import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check if this is a file upload
    const contentType = req.headers.get('content-type')
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle file upload directly
      const formData = await req.formData()
      
      const orthancUrl = `http://116.203.35.168:8042/instances`
      
      const orthancRequest: RequestInit = {
        method: 'POST',
        headers: {
          'Authorization': 'Basic YWRtaW46TGlvbkVhZ2xlMDMwNCE=', // admin:LionEagle0304!
        },
        body: formData
      }

      console.log('Uploading file to Orthanc:', orthancUrl)
      
      const response = await fetch(orthancUrl, orthancRequest)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Orthanc upload failed: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      
      return new Response(
        JSON.stringify(data),
        {
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
        },
      )
    } else {
      // Handle JSON requests (for studies, etc.)
      const { method, url } = await req.json()
      
      if (!url.includes('/studies') && !url.includes('/instances')) {
        throw new Error('Invalid endpoint')
      }

      const orthancUrl = `http://116.203.35.168:8042${url}`
      
      const orthancRequest: RequestInit = {
        method: method || 'GET',
        headers: {
          'Authorization': 'Basic YWRtaW46TGlvbkVhZ2xlMDMwNCE=',
          'Accept': 'application/json'
        }
      }

      const response = await fetch(orthancUrl, orthancRequest)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Orthanc request failed: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      
      return new Response(
        JSON.stringify(data),
        {
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
        },
      )
    }
  } catch (error) {
    console.error('Orthanc proxy error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
      },
    )
  }
})