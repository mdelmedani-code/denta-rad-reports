import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Authenticate user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      console.error('Authentication failed:', userError)
      throw new Error('Unauthorized')
    }

    const { caseId, fileName, patientId } = await req.json()
    if (!caseId || !fileName) {
      throw new Error('Missing required fields: caseId or fileName')
    }

    console.log(`Getting Dropbox upload config for case ${caseId}, patient ${patientId ?? 'N/A'}`)

    // Get case details to generate folder name
    const { data: caseData, error: caseError } = await supabaseClient
      .from('cases')
      .select('simple_id, patient_name, folder_name')
      .eq('id', caseId)
      .single()

    if (caseError || !caseData) {
      console.error('Failed to fetch case:', caseError)
      throw new Error('Case not found')
    }

    // Generate folder name if not already set
    let folderName = caseData.folder_name
    if (!folderName && caseData.simple_id && caseData.patient_name) {
      folderName = generateFolderName(caseData.patient_name, caseData.simple_id)
      
      // Update case with folder name
      await supabaseClient
        .from('cases')
        .update({ folder_name: folderName })
        .eq('id', caseId)
    }

    if (!folderName) {
      throw new Error('Could not generate folder name')
    }

    console.log(`Using folder name: ${folderName}`)

    // Get Dropbox access token using refresh token
    const tokenResponse = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: Deno.env.get('DROPBOX_REFRESH_TOKEN') || '',
        client_id: Deno.env.get('DROPBOX_APP_KEY') || '',
        client_secret: Deno.env.get('DROPBOX_APP_SECRET') || '',
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Dropbox token request failed:', errorText)
      throw new Error('Failed to get Dropbox access token')
    }

    const tokenData = await tokenResponse.json()
    if (!tokenData.access_token) {
      console.error('No access token in response:', tokenData)
      throw new Error('Failed to get Dropbox access token')
    }

    // Use new Uploads folder structure with human-readable folder names
    const dropboxBasePath = `/DentaRad/Uploads/${folderName}`
    const dropboxPath = `${dropboxBasePath}/scan.zip`
    console.log(`Dropbox path: ${dropboxPath}`)

    return new Response(JSON.stringify({
      success: true,
      uploadConfig: {
        accessToken: tokenData.access_token,
        dropboxPath: dropboxPath,
        dropboxBasePath: dropboxBasePath,
        folderName: folderName,
        expiresIn: tokenData.expires_in || 14400,
      },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (error) {
    console.error('Error in get-dropbox-upload-url:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
    })
  }
})

// Helper: Generate folder name from patient name and ID
function generateFolderName(patientName: string, simpleId: number): string {
  // Split name into parts
  const nameParts = patientName.trim().split(/\s+/)
  
  // Get first name (first part)
  let firstName = nameParts[0]
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^A-Z]/g, '') // Remove non-letters
  
  // Get last name (last part, or use first name if only one name)
  let lastName = nameParts.length > 1
    ? nameParts[nameParts.length - 1]
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z]/g, '')
    : firstName
  
  // Fallback if empty
  if (!firstName) firstName = 'UNKNOWN'
  if (!lastName) lastName = firstName

  // Format ID with leading zeros (5 digits)
  const idFormatted = String(simpleId).padStart(5, '0')

  return `${lastName}_${firstName}_${idFormatted}`
}
