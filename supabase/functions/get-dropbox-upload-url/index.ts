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
    if (!caseId || !fileName || !patientId) {
      throw new Error('Missing required fields: caseId, fileName, or patientId')
    }

    console.log(`Getting Dropbox upload config for case ${caseId}, patient ${patientId}`)

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

    // Use Cases folder structure instead of Uploads
    const dropboxBasePath = `/DentaRad/Cases/${patientId}_${caseId}`
    const dropboxPath = `${dropboxBasePath}/${fileName}`
    console.log(`Dropbox path: ${dropboxPath}`)

    return new Response(JSON.stringify({
      success: true,
      uploadConfig: {
        accessToken: tokenData.access_token,
        dropboxPath: dropboxPath,
        dropboxBasePath: dropboxBasePath,
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
