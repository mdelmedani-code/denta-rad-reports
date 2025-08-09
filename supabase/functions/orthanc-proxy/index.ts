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
      
      console.log('Processing file upload:', fileName, 'Base64 size:', base64Data.length)
      
      // Check payload size limits
      const MAX_BASE64_LENGTH = 7 * 1024 * 1024; // ~5MB file becomes ~7MB base64
      if (base64Data.length > MAX_BASE64_LENGTH) {
        return new Response(JSON.stringify({ 
          error: 'File too large for upload. Please reduce file size to under 5MB.' 
        }), {
          status: 413,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Efficient base64 conversion with proper error handling
      let bytes
      try {
        // Clean base64 string and add proper padding if needed
        let cleanBase64 = base64Data.replace(/[^A-Za-z0-9+/]/g, '')
        const padding = cleanBase64.length % 4
        if (padding > 0) {
          cleanBase64 += '='.repeat(4 - padding)
        }
        
        // More efficient base64 decode
        const binaryString = atob(cleanBase64)
        bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0))
        console.log('Successfully converted base64 to binary, size:', bytes.length)
      } catch (conversionError) {
        console.error('Base64 conversion failed:', conversionError)
        return new Response(JSON.stringify({ 
          error: 'Invalid file format or corrupted data',
          details: conversionError.message
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Validate file appears to be DICOM (check for DICOM header)
      if (bytes.length > 132) {
        const fileHeader = new TextDecoder().decode(bytes.slice(128, 132))
        if (fileHeader !== 'DICM') {
          console.warn('File does not appear to be a valid DICOM file. Header:', fileHeader)
          console.log('First 200 bytes:', Array.from(bytes.slice(0, 200)).map(b => b.toString(16).padStart(2, '0')).join(' '))
        } else {
          console.log('Valid DICOM header detected')
        }
      }
      
      // Create FormData for Orthanc upload - try direct binary approach
      const formData = new FormData()
      
      // Try uploading as raw binary data instead of blob
      const orthancBase = (Deno.env.get('ORTHANC_URL') || '').replace(/\/+$/, '');
      const orthancUser = Deno.env.get('ORTHANC_USERNAME') || '';
      const orthancPass = Deno.env.get('ORTHANC_PASSWORD') || '';
      const authHeader = 'Basic ' + btoa(`${orthancUser}:${orthancPass}`);
      const response = await fetch(`${orthancBase}/instances`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/dicom',
        },
        body: bytes
      })
      
      console.log('Orthanc upload response status:', response.status)
      console.log('Orthanc upload response headers:', Object.fromEntries(response.headers.entries()))
      
      
      const responseText = await response.text()
      console.log('Orthanc response body length:', responseText.length)
      console.log('Orthanc response body:', responseText.substring(0, 500)) // First 500 chars
      
      if (!response.ok) {
        // Return specific error based on Orthanc response
        const status = response.status === 413 ? 413 : 
                      response.status >= 500 ? 502 : 400;
        return new Response(JSON.stringify({ 
          error: `PACS server error: ${response.status} ${response.statusText}`,
          details: responseText
        }), {
          status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check if we got a proper response
      if (responseText.trim() === '') {
        console.error('Empty response from Orthanc - file was likely rejected')
        throw new Error('Orthanc rejected the file (empty response). File may not be valid DICOM.')
      }

      // Try to parse as JSON
      let data
      try {
        data = JSON.parse(responseText)
        console.log('Successfully parsed JSON response with ID:', data.ID)
        
        // If we got a proper JSON response with an ID, the upload was successful
        if (data && data.ID && data.ID !== 'unknown') {
          console.log('Upload successful! Instance ID:', data.ID)
          
          // Query the instance to get study details
          try {
            const instanceUrl = `${orthancBase}/instances/${data.ID}`
            const instanceResponse = await fetch(instanceUrl, {
              headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
              }
            })
            
            if (instanceResponse.ok) {
              const instanceData = await instanceResponse.json()
              console.log('Instance details retrieved. Study ID:', instanceData.ParentStudy)
              data.StudyInstanceUID = instanceData.ParentStudy
              data.success = true
            }
          } catch (queryError) {
            console.log('Could not query instance details:', queryError)
          }
        }
      } catch (parseError) {
        console.error('Response is not JSON:', parseError.message)
        console.error('Raw response:', responseText)
        throw new Error(`Invalid response from Orthanc: ${responseText}`)
      }
      
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
      const { method, url, endpoint } = requestBody
      
      // Support both 'url' and 'endpoint' parameter names
      const requestPath = url || endpoint
      
      // Add null checks and better validation
      if (!requestPath || typeof requestPath !== 'string') {
        return new Response(JSON.stringify({ 
          error: 'Missing url or endpoint parameter' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      if (!requestPath.includes('/studies') && !requestPath.includes('/instances') && !requestPath.includes('/system')) {
        return new Response(JSON.stringify({ 
          error: 'Invalid endpoint. Only studies, instances, and system endpoints are allowed.' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const orthancUrl = `${orthancBase}${requestPath}`
      
      const orthancRequest: RequestInit = {
        method: method || 'GET',
        headers: {
          'Authorization': authHeader,
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
    
    // Return appropriate error status based on error type
    let status = 500;
    let errorMessage = 'Internal server error';
    
    if (error.message && error.message.includes('too large') || error.message.includes('413')) {
      status = 413;
      errorMessage = 'File too large';
    } else if (error.message && (error.message.includes('Invalid') || error.message.includes('400'))) {
      status = 400;
      errorMessage = error.message;
    } else if (error.message && (error.message.includes('PACS') || error.message.includes('Orthanc'))) {
      status = 502;
      errorMessage = 'PACS server error';
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error.message
    }), {
      status,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
    })
  }
})