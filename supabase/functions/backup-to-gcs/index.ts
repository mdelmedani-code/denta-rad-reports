import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleCloudCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

async function getAccessToken(credentials: GoogleCloudCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;
  
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };
  
  const claimSet = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/devstorage.full_control',
    aud: credentials.token_uri,
    exp: expiry,
    iat: now,
  };
  
  const encoder = new TextEncoder();
  const headerBase64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const claimSetBase64 = btoa(JSON.stringify(claimSet)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signatureInput = `${headerBase64}.${claimSetBase64}`;
  
  // Import private key - decode from PEM format
  const privateKey = credentials.private_key.replace(/\\n/g, '\n');
  const pemContents = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  // Decode base64 to binary
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(signatureInput)
  );
  
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  const jwt = `${signatureInput}.${signatureBase64}`;
  
  // Exchange JWT for access token
  const tokenResponse = await fetch(credentials.token_uri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  
  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function uploadToGCS(
  bucketName: string,
  fileName: string,
  fileData: ArrayBuffer,
  accessToken: string
): Promise<void> {
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(fileName)}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
    },
    body: fileData,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to upload ${fileName}: ${response.statusText}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting backup process...');
    
    // Get credentials
    const credentialsJson = Deno.env.get('GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON');
    if (!credentialsJson) {
      throw new Error('Google Cloud credentials not configured');
    }
    
    const credentials: GoogleCloudCredentials = JSON.parse(credentialsJson);
    const gcsBucketName = 'dentarad-backup';
    
    console.log('Getting access token...');
    const accessToken = await getAccessToken(credentials);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const bucketsToBackup = ['cbct-scans', 'reports'];
    let totalFiles = 0;
    let successCount = 0;
    let errorCount = 0;
    
    for (const bucketName of bucketsToBackup) {
      console.log(`Backing up bucket: ${bucketName}`);
      
      // List all files in bucket
      const { data: files, error: listError } = await supabase.storage
        .from(bucketName)
        .list('', {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' },
        });
      
      if (listError) {
        console.error(`Error listing files in ${bucketName}:`, listError);
        continue;
      }
      
      if (!files || files.length === 0) {
        console.log(`No files found in ${bucketName}`);
        continue;
      }
      
      console.log(`Found ${files.length} files in ${bucketName}`);
      totalFiles += files.length;
      
      // Process each file
      for (const file of files) {
        try {
          // Skip directories
          if (!file.name || file.name.endsWith('/')) {
            continue;
          }
          
          console.log(`Backing up: ${bucketName}/${file.name}`);
          
          // Download file from Supabase
          const { data: fileData, error: downloadError } = await supabase.storage
            .from(bucketName)
            .download(file.name);
          
          if (downloadError) {
            throw downloadError;
          }
          
          // Upload to GCS
          const arrayBuffer = await fileData.arrayBuffer();
          const gcsPath = `${bucketName}/${file.name}`;
          await uploadToGCS(gcsBucketName, gcsPath, arrayBuffer, accessToken);
          
          successCount++;
          console.log(`✓ Backed up: ${gcsPath}`);
          
        } catch (error) {
          errorCount++;
          console.error(`✗ Failed to backup ${bucketName}/${file.name}:`, error);
        }
      }
    }
    
    const summary = {
      timestamp: new Date().toISOString(),
      totalFiles,
      successCount,
      errorCount,
      buckets: bucketsToBackup,
    };
    
    console.log('Backup complete:', summary);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Backup completed',
        ...summary,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
    
  } catch (error) {
    console.error('Backup error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
