import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const orthancBase = (Deno.env.get('ORTHANC_URL') || '').replace(/\/+$/, '');
    const authHeader = 'Basic ' + btoa(`${Deno.env.get('ORTHANC_USERNAME') || ''}:${Deno.env.get('ORTHANC_PASSWORD') || ''}`);
    const orthancUrl = `${orthancBase}/studies`
    
    console.log('Getting studies from Orthanc:', orthancUrl)
    
    const response = await fetch(orthancUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    })
    
    console.log('Orthanc studies response status:', response.status)
    console.log('Orthanc studies response headers:', Object.fromEntries(response.headers.entries()))
    
    const responseText = await response.text()
    console.log('Orthanc studies response:', responseText)
    
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
    
    // If we got an array of study IDs, get details for each
    if (Array.isArray(data) && data.length > 0) {
      const detailedStudies = []
      
      for (const studyId of data.slice(0, 10)) { // Limit to first 10 studies
        try {
          const detailResponse = await fetch(`${orthancBase}/studies/${studyId}`, {
            headers: {
              'Authorization': authHeader,
              'Accept': 'application/json'
            }
          })
          
          if (detailResponse.ok) {
            const detail = await detailResponse.json()
            detailedStudies.push({
              id: studyId,
              patientName: detail.MainDicomTags?.PatientName || 'Unknown',
              studyDate: detail.MainDicomTags?.StudyDate || 'Unknown',
              studyDescription: detail.MainDicomTags?.StudyDescription || '',
              instances: detail.Instances?.length || 0
            })
          }
        } catch (err) {
          console.log('Error getting study details for', studyId, err)
        }
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          totalStudies: data.length,
          studies: detailedStudies
        }),
        {
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
        },
      )
    }
    
    return new Response(
      JSON.stringify({
        success: response.ok,
        status: response.status,
        data: data,
        totalStudies: Array.isArray(data) ? data.length : 0
      }),
      {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
      },
    )
  } catch (error) {
    console.error('Error getting studies:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message
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