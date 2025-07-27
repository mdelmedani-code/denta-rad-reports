import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestBody = await req.json()
    
    // Check if this is a file upload with base64 data
    if (requestBody.fileData && requestBody.fileName) {
      // Handle base64 file upload
      const base64Data = requestBody.fileData
      const fileName = requestBody.fileName
      
      // Convert base64 back to binary
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      
      // Create FormData for Orthanc
      const formData = new FormData()
      const blob = new Blob([bytes], { type: requestBody.contentType || 'application/dicom' })
      formData.append('file', blob, fileName)
      
      const orthancUrl = `http://116.203.35.168:8042/instances`
      
      console.log('Uploading file to Orthanc:', orthancUrl, 'File:', fileName)
      
      const response = await fetch(orthancUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic YWRtaW46TGlvbkVhZ2xlMDMwNCE=', // admin:LionEagle0304!
        },
        body: formData
      })
      
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
      const { method, url } = requestBody
      
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