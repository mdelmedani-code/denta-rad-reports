import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { studyInstanceUID } = await req.json()
    
    if (!studyInstanceUID) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'studyInstanceUID is required' 
        }),
        {
          status: 400,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
        },
      )
    }

    console.log('Getting study from Orthanc:', studyInstanceUID)
    
    // First, find the study by StudyInstanceUID
    const studiesResponse = await fetch(`http://116.203.35.168:8042/studies`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic YWRtaW46TGlvbkVhZ2xlMDMwNCE=', // admin:LionEagle0304!
        'Accept': 'application/json'
      }
    })
    
    if (!studiesResponse.ok) {
      throw new Error(`Failed to get studies: ${studiesResponse.status}`)
    }
    
    const studyIds = await studiesResponse.json()
    console.log('Found studies:', studyIds.length)
    
    // Find the study with matching StudyInstanceUID
    let targetStudyId = null
    for (const studyId of studyIds) {
      try {
        const studyDetailResponse = await fetch(`http://116.203.35.168:8042/studies/${studyId}`, {
          headers: {
            'Authorization': 'Basic YWRtaW46TGlvbkVhZ2xlMDMwNCE=',
            'Accept': 'application/json'
          }
        })
        
        if (studyDetailResponse.ok) {
          const studyDetail = await studyDetailResponse.json()
          if (studyDetail.MainDicomTags?.StudyInstanceUID === studyInstanceUID) {
            targetStudyId = studyId
            break
          }
        }
      } catch (err) {
        console.log('Error checking study', studyId, err)
      }
    }
    
    if (!targetStudyId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Study not found in PACS' 
        }),
        {
          status: 404,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
        },
      )
    }
    
    console.log('Found target study ID:', targetStudyId)
    
    // Get detailed study information with instances
    const studyResponse = await fetch(`http://116.203.35.168:8042/studies/${targetStudyId}`, {
      headers: {
        'Authorization': 'Basic YWRtaW46TGlvbkVhZ2xlMDMwNCE=',
        'Accept': 'application/json'
      }
    })
    
    if (!studyResponse.ok) {
      throw new Error(`Failed to get study details: ${studyResponse.status}`)
    }
    
    const studyData = await studyResponse.json()
    console.log('Study data retrieved successfully')
    
    // Get series information
    const seriesDetails = []
    if (studyData.Series) {
      for (const seriesId of studyData.Series) {
        try {
          const seriesResponse = await fetch(`http://116.203.35.168:8042/series/${seriesId}`, {
            headers: {
              'Authorization': 'Basic YWRtaW46TGlvbkVhZ2xlMDMwNCE=',
              'Accept': 'application/json'
            }
          })
          
          if (seriesResponse.ok) {
            const seriesData = await seriesResponse.json()
            
            // Get instance details for preview
            const instances = []
            if (seriesData.Instances && seriesData.Instances.length > 0) {
              // Get first few instances for preview
              const previewInstances = seriesData.Instances.slice(0, 3)
              for (const instanceId of previewInstances) {
                instances.push({
                  id: instanceId,
                  previewUrl: `http://116.203.35.168:8042/instances/${instanceId}/preview`,
                  downloadUrl: `http://116.203.35.168:8042/instances/${instanceId}/file`
                })
              }
            }
            
            seriesDetails.push({
              id: seriesId,
              seriesInstanceUID: seriesData.MainDicomTags?.SeriesInstanceUID,
              seriesDescription: seriesData.MainDicomTags?.SeriesDescription || 'No description',
              modality: seriesData.MainDicomTags?.Modality || 'Unknown',
              instanceCount: seriesData.Instances?.length || 0,
              instances: instances
            })
          }
        } catch (err) {
          console.log('Error getting series details for', seriesId, err)
        }
      }
    }
    
    const result = {
      success: true,
      study: {
        id: targetStudyId,
        studyInstanceUID: studyData.MainDicomTags?.StudyInstanceUID,
        patientName: studyData.MainDicomTags?.PatientName || 'Unknown',
        patientID: studyData.MainDicomTags?.PatientID || 'Unknown',
        studyDate: studyData.MainDicomTags?.StudyDate || 'Unknown',
        studyTime: studyData.MainDicomTags?.StudyTime || 'Unknown',
        studyDescription: studyData.MainDicomTags?.StudyDescription || 'No description',
        accessionNumber: studyData.MainDicomTags?.AccessionNumber || '',
        seriesCount: studyData.Series?.length || 0,
        instanceCount: studyData.Instances?.length || 0,
        series: seriesDetails
      }
    }
    
    return new Response(
      JSON.stringify(result),
      {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
      },
    )
    
  } catch (error) {
    console.error('Error getting study from PACS:', error)
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