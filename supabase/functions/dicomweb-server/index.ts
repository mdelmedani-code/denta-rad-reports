import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface DICOMStudy {
  "0020000D": { vr: string; Value: string[] }
  "00080020": { vr: string; Value: string[] }
  "00080030": { vr: string; Value: string[] }
  "00080050": { vr: string; Value: string[] }
  "00081030": { vr: string; Value: string[] }
  "00100010": { vr: string; Value: any[] }
  "00100020": { vr: string; Value: string[] }
  "00100030": { vr: string; Value: string[] }
  "00201206": { vr: string; Value: number[] }
  "00201208": { vr: string; Value: number[] }
}

interface DICOMSeries {
  "0020000E": { vr: string; Value: string[] }
  "00200011": { vr: string; Value: number[] }
  "0008103E": { vr: string; Value: string[] }
  "00080060": { vr: string; Value: string[] }
  "00201209": { vr: string; Value: number[] }
}

interface DICOMInstance {
  "00080018": { vr: string; Value: string[] }
  "00200013": { vr: string; Value: number[] }
  "00080016": { vr: string; Value: string[] }
  "00020010": { vr: string; Value: string[] }
  [key: string]: any
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    let path = url.pathname.replace('/dicomweb-server', '')
    
    // Handle both URL params and path-embedded caseId
    let caseId = url.searchParams.get('caseId')
    
    // If no caseId in params, try to extract from path
    if (!caseId && path.includes('caseId=')) {
      const match = path.match(/[?&]caseId=([^&]+)/)
      if (match) {
        caseId = match[1]
        // Clean the path of caseId parameter
        path = path.replace(/[?&]caseId=[^&]+/, '').replace(/\?&/, '?').replace(/\?$/, '')
      }
    }
    
    console.log(`DICOMweb request: ${req.method} ${path}`)
    console.log(`Case ID: ${caseId}`)
    console.log(`Full URL: ${req.url}`)

    // Return early for invalid paths
    if (!path || path === '/') {
      return new Response(JSON.stringify({
        message: 'DentaRad DICOMweb Server',
        version: '2.0',
        endpoints: {
          qido: [
            'GET /studies?caseId={caseId}',
            'GET /studies/{studyUID}/series?caseId={caseId}',
            'GET /studies/{studyUID}/series/{seriesUID}/instances?caseId={caseId}'
          ],
          wado: [
            'GET /studies/{studyUID}/series/{seriesUID}/instances/{instanceUID}?caseId={caseId}',
            'GET /studies/{studyUID}/series/{seriesUID}/instances/{instanceUID}/metadata?caseId={caseId}',
            'GET /studies/{studyUID}/series/{seriesUID}/instances/{instanceUID}/frames/{frameNumber}?caseId={caseId}'
          ]
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // QIDO-RS endpoints (Query)
    if (path === '/studies' && req.method === 'GET') {
      return await handleStudiesQuery(supabase, caseId)
    }
    
    if (path.match(/^\/studies\/[^\/]+\/series$/) && req.method === 'GET') {
      const studyUID = path.split('/')[2]
      return await handleSeriesQuery(supabase, studyUID, caseId)
    }
    
    if (path.match(/^\/studies\/[^\/]+\/series\/[^\/]+\/instances$/) && req.method === 'GET') {
      const studyUID = path.split('/')[2]
      const seriesUID = path.split('/')[4]
      return await handleInstancesQuery(supabase, studyUID, seriesUID, caseId)
    }

    // WADO-RS endpoints (Retrieve)
    if (path.match(/^\/studies\/[^\/]+\/series\/[^\/]+\/instances\/[^\/]+$/) && req.method === 'GET') {
      const studyUID = path.split('/')[2]
      const seriesUID = path.split('/')[4]
      const instanceUID = path.split('/')[6]
      return await handleInstanceRetrieve(supabase, studyUID, seriesUID, instanceUID, caseId)
    }

    if (path.match(/^\/studies\/[^\/]+\/series\/[^\/]+\/instances\/[^\/]+\/metadata$/) && req.method === 'GET') {
      const studyUID = path.split('/')[2]
      const seriesUID = path.split('/')[4]
      const instanceUID = path.split('/')[6]
      return await handleInstanceMetadata(supabase, studyUID, seriesUID, instanceUID, caseId)
    }

    // WADO-RS bulk data (for pixel data)
    if (path.match(/^\/studies\/[^\/]+\/series\/[^\/]+\/instances\/[^\/]+\/frames\/[^\/]+$/) && req.method === 'GET') {
      const studyUID = path.split('/')[2]
      const seriesUID = path.split('/')[4]
      const instanceUID = path.split('/')[6]
      const frameNumber = path.split('/')[8]
      return await handleFrameRetrieve(supabase, studyUID, seriesUID, instanceUID, frameNumber, caseId)
    }

    // Fallback endpoint info
    return new Response(JSON.stringify({
      message: 'DentaRad DICOMweb Server',
      version: '2.0',
      endpoints: {
        qido: [
          'GET /studies?caseId={caseId}',
          'GET /studies/{studyUID}/series?caseId={caseId}',
          'GET /studies/{studyUID}/series/{seriesUID}/instances?caseId={caseId}'
        ],
        wado: [
          'GET /studies/{studyUID}/series/{seriesUID}/instances/{instanceUID}?caseId={caseId}',
          'GET /studies/{studyUID}/series/{seriesUID}/instances/{instanceUID}/metadata?caseId={caseId}',
          'GET /studies/{studyUID}/series/{seriesUID}/instances/{instanceUID}/frames/{frameNumber}?caseId={caseId}'
        ]
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in DICOMweb server:', error)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function handleStudiesQuery(supabase: any, caseId: string | null): Promise<Response> {
  if (!caseId) {
    return new Response(JSON.stringify({ error: 'Case ID required' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    // Get case information
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single()

    if (caseError || !caseData) {
      console.error('Case not found:', caseError)
      return new Response('[]', {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/dicom+json' }
      })
    }

    // Count available DICOM files
    const fileCount = await countDICOMFiles(supabase, caseId)

    // Create synthetic study UID based on case ID
    const studyInstanceUID = `1.2.826.0.1.3680043.8.498.${caseId.replace(/-/g, '')}`

    const study: DICOMStudy = {
      "0020000D": { "vr": "UI", "Value": [studyInstanceUID] }, // Study Instance UID
      "00080020": { "vr": "DA", "Value": [formatDate(caseData.upload_date)] }, // Study Date
      "00080030": { "vr": "TM", "Value": [formatTime(caseData.upload_date)] }, // Study Time
      "00080050": { "vr": "SH", "Value": [caseId] }, // Accession Number
      "00081030": { "vr": "LO", "Value": [caseData.clinical_question || "CBCT Study"] }, // Study Description
      "00100010": { "vr": "PN", "Value": [{ "Alphabetic": caseData.patient_name }] }, // Patient Name
      "00100020": { "vr": "LO", "Value": [caseData.patient_internal_id || caseId] }, // Patient ID
      "00100030": { "vr": "DA", "Value": [formatDate(caseData.patient_dob)] }, // Patient Birth Date
      "00201206": { "vr": "IS", "Value": [1] }, // Number of Study Related Series
      "00201208": { "vr": "IS", "Value": [fileCount] }, // Number of Study Related Instances
    }

    return new Response(JSON.stringify([study]), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/dicom+json' }
    })

  } catch (error) {
    console.error('Error in studies query:', error)
    return new Response('[]', {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/dicom+json' }
    })
  }
}

async function handleSeriesQuery(supabase: any, studyUID: string, caseId: string | null): Promise<Response> {
  if (!caseId) {
    return new Response(JSON.stringify({ error: 'Case ID required' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    // Count available DICOM files
    const fileCount = await countDICOMFiles(supabase, caseId)
    
    // Create synthetic series UID
    const seriesInstanceUID = `${studyUID}.1`

    const series: DICOMSeries = {
      "0020000E": { "vr": "UI", "Value": [seriesInstanceUID] }, // Series Instance UID
      "00200011": { "vr": "IS", "Value": [1] }, // Series Number
      "0008103E": { "vr": "LO", "Value": ["CBCT Series"] }, // Series Description
      "00080060": { "vr": "CS", "Value": ["CT"] }, // Modality
      "00201209": { "vr": "IS", "Value": [fileCount] }, // Number of Series Related Instances
    }

    return new Response(JSON.stringify([series]), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/dicom+json' }
    })

  } catch (error) {
    console.error('Error in series query:', error)
    return new Response('[]', {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/dicom+json' }
    })
  }
}

async function handleInstancesQuery(supabase: any, studyUID: string, seriesUID: string, caseId: string | null): Promise<Response> {
  if (!caseId) {
    return new Response(JSON.stringify({ error: 'Case ID required' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    // Get all DICOM files for this case
    const files = await getAllDICOMFiles(supabase, caseId)
    
    const instances: DICOMInstance[] = files.map((file, index) => {
      const sopInstanceUID = `${seriesUID}.${index + 1}`
      
      return {
        "00080018": { "vr": "UI", "Value": [sopInstanceUID] }, // SOP Instance UID
        "00200013": { "vr": "IS", "Value": [index + 1] }, // Instance Number
        "00080016": { "vr": "UI", "Value": ["1.2.840.10008.5.1.4.1.1.2"] }, // SOP Class UID (CT Image Storage)
        "00020010": { "vr": "UI", "Value": ["1.2.840.10008.1.2.1"] }, // Transfer Syntax UID
        "00280002": { "vr": "US", "Value": [1] }, // Samples per Pixel
        "00280004": { "vr": "CS", "Value": ["MONOCHROME2"] }, // Photometric Interpretation
        "00280010": { "vr": "US", "Value": [512] }, // Rows
        "00280011": { "vr": "US", "Value": [512] }, // Columns
        "00280100": { "vr": "US", "Value": [16] }, // Bits Allocated
        "00280101": { "vr": "US", "Value": [16] }, // Bits Stored
        "00280102": { "vr": "US", "Value": [15] }, // High Bit
        "00280103": { "vr": "US", "Value": [1] }, // Pixel Representation
      }
    })

    return new Response(JSON.stringify(instances), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/dicom+json' }
    })

  } catch (error) {
    console.error('Error in instances query:', error)
    return new Response('[]', {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/dicom+json' }
    })
  }
}

async function handleInstanceRetrieve(supabase: any, studyUID: string, seriesUID: string, instanceUID: string, caseId: string | null): Promise<Response> {
  if (!caseId) {
    return new Response('Case ID required', { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
    })
  }

  try {
    // Extract instance number from UID
    const instanceNumber = parseInt(instanceUID.split('.').pop() || '1')
    
    // Get all DICOM files
    const files = await getAllDICOMFiles(supabase, caseId)
    
    if (instanceNumber > files.length || instanceNumber < 1) {
      return new Response('Instance not found', { status: 404, headers: corsHeaders })
    }

    const targetFile = files[instanceNumber - 1]

    // Download the file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('cbct-scans')
      .download(targetFile.fullPath)

    if (downloadError || !fileData) {
      console.error('Error downloading file:', downloadError)
      return new Response('Error retrieving file', { status: 500, headers: corsHeaders })
    }

    // Return the file with appropriate DICOM headers
    return new Response(fileData, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/dicom',
        'Content-Disposition': `attachment; filename="${targetFile.name}"`,
      }
    })

  } catch (error) {
    console.error('Error in instance retrieve:', error)
    return new Response('Error retrieving instance', { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
    })
  }
}

async function handleInstanceMetadata(supabase: any, studyUID: string, seriesUID: string, instanceUID: string, caseId: string | null): Promise<Response> {
  if (!caseId) {
    return new Response(JSON.stringify({ error: 'Case ID required' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    // Extract instance number from UID
    const instanceNumber = parseInt(instanceUID.split('.').pop() || '1')

    // Create synthetic metadata for the instance
    const metadata = {
      "00080005": { "vr": "CS", "Value": ["ISO_IR 100"] }, // Specific Character Set
      "00080016": { "vr": "UI", "Value": ["1.2.840.10008.5.1.4.1.1.2"] }, // SOP Class UID
      "00080018": { "vr": "UI", "Value": [instanceUID] }, // SOP Instance UID
      "0020000D": { "vr": "UI", "Value": [studyUID] }, // Study Instance UID
      "0020000E": { "vr": "UI", "Value": [seriesUID] }, // Series Instance UID
      "00200013": { "vr": "IS", "Value": [instanceNumber] }, // Instance Number
      "00280002": { "vr": "US", "Value": [1] }, // Samples per Pixel
      "00280004": { "vr": "CS", "Value": ["MONOCHROME2"] }, // Photometric Interpretation
      "00280010": { "vr": "US", "Value": [512] }, // Rows
      "00280011": { "vr": "US", "Value": [512] }, // Columns
      "00280100": { "vr": "US", "Value": [16] }, // Bits Allocated
      "00280101": { "vr": "US", "Value": [16] }, // Bits Stored
      "00280102": { "vr": "US", "Value": [15] }, // High Bit
      "00280103": { "vr": "US", "Value": [1] }, // Pixel Representation
    }

    return new Response(JSON.stringify(metadata), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/dicom+json' }
    })

  } catch (error) {
    console.error('Error in metadata retrieve:', error)
    return new Response('{}', {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/dicom+json' }
    })
  }
}

async function handleFrameRetrieve(supabase: any, studyUID: string, seriesUID: string, instanceUID: string, frameNumber: string, caseId: string | null): Promise<Response> {
  // For now, redirect to instance retrieve as we don't have frame-level access
  return await handleInstanceRetrieve(supabase, studyUID, seriesUID, instanceUID, caseId)
}

// Utility functions
async function countDICOMFiles(supabase: any, caseId: string): Promise<number> {
  try {
    const files = await getAllDICOMFiles(supabase, caseId)
    return files.length
  } catch (error) {
    console.error('Error counting DICOM files:', error)
    return 1 // Default to 1 if we can't count
  }
}

async function getAllDICOMFiles(supabase: any, caseId: string): Promise<Array<{ name: string; fullPath: string }>> {
  const allFiles: Array<{ name: string; fullPath: string }> = []
  
  try {
    // First, get the case to find the actual file path
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('file_path')
      .eq('id', caseId)
      .single()

    if (caseError || !caseData?.file_path) {
      console.error('Case or file_path not found:', caseError)
      return allFiles
    }

    const filePath = caseData.file_path
    console.log('Using file path from database:', filePath)

    // Extract the directory path from the file_path
    const pathParts = filePath.split('/')
    let basePath = ''
    
    if (pathParts.length > 1) {
      // If it's a full path like "userId/timestamp/file.ext", use the directory
      basePath = pathParts.slice(0, -1).join('/')
    } else {
      // If it's just a filename, use the caseId as fallback
      basePath = caseId
    }

    console.log('Searching in base path:', basePath)

    // List all items in the determined path
    const { data: items, error: listError } = await supabase.storage
      .from('cbct-scans')
      .list(basePath, { limit: 100, sortBy: { column: 'name', order: 'asc' } })

    if (listError || !items) {
      console.error('Error listing files:', listError)
      // Fallback: try direct file access if the file_path is complete
      if (filePath && (filePath.toLowerCase().endsWith('.dcm') || filePath.toLowerCase().endsWith('.dicom'))) {
        const fileName = pathParts[pathParts.length - 1]
        allFiles.push({
          name: fileName,
          fullPath: filePath
        })
      }
      return allFiles
    }

    // Process each item
    for (const item of items) {
      if (item.name.toLowerCase().endsWith('.dcm') || item.name.toLowerCase().endsWith('.dicom')) {
        // Direct DICOM file
        allFiles.push({
          name: item.name,
          fullPath: `${basePath}/${item.name}`
        })
      } else if (!item.name.includes('.')) {
        // Assume it's a directory, list its contents
        const { data: subItems, error: subListError } = await supabase.storage
          .from('cbct-scans')
          .list(`${basePath}/${item.name}`, { limit: 200, sortBy: { column: 'name', order: 'asc' } })

        if (!subListError && subItems) {
          for (const subItem of subItems) {
            if (subItem.name.toLowerCase().endsWith('.dcm') || subItem.name.toLowerCase().endsWith('.dicom')) {
              allFiles.push({
                name: subItem.name,
                fullPath: `${basePath}/${item.name}/${subItem.name}`
              })
            }
          }
        }
      }
    }

    // If no DICOM files found, check for ZIP files as fallback
    if (allFiles.length === 0) {
      const zipFiles = items.filter(item => item.name.toLowerCase().endsWith('.zip'))
      if (zipFiles.length > 0) {
        allFiles.push({
          name: zipFiles[0].name,
          fullPath: `${basePath}/${zipFiles[0].name}`
        })
      }
    }

    // If still no files and we have a direct file path, use it
    if (allFiles.length === 0 && filePath) {
      const fileName = pathParts[pathParts.length - 1]
      allFiles.push({
        name: fileName,
        fullPath: filePath
      })
    }

    console.log('Found files:', allFiles)
    return allFiles.sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    console.error('Error getting all DICOM files:', error)
    return allFiles
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toISOString().slice(0, 10).replace(/-/g, '')
}

function formatTime(dateString: string | null): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toTimeString().slice(0, 8).replace(/:/g, '')
}