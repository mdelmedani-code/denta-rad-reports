import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Dropbox } from 'https://esm.sh/dropbox@10.34.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadRequest {
  caseId: string;
  patientId: string;
  clinicId: string;
  fileName: string;
  fileData: string; // base64 encoded
  metadata: {
    patientName: string;
    patientDob?: string;
    patientInternalId?: string;
    clinicalQuestion: string;
    fieldOfView: string;
    urgency: string;
    uploadDate: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body: UploadRequest = await req.json();
    const { caseId, patientId, clinicId, fileName, fileData, metadata } = body;

    // Initialize Dropbox with refresh token
    const dbx = new Dropbox({
      refreshToken: Deno.env.get('DROPBOX_REFRESH_TOKEN'),
      clientId: Deno.env.get('DROPBOX_APP_KEY'),
      clientSecret: Deno.env.get('DROPBOX_APP_SECRET'),
    });

    const basePath = `/DentaRad/Uploads/${patientId}_${caseId}`;

    console.log(`Uploading to Dropbox path: ${basePath}`);

    // Upload metadata JSON
    const metadataJson = JSON.stringify(metadata, null, 2);
    await dbx.filesUpload({
      path: `${basePath}/case_metadata.json`,
      contents: metadataJson,
      mode: { '.tag': 'overwrite' },
    });

    console.log('Metadata JSON uploaded successfully');

    // Decode base64 file data
    const fileBuffer = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));
    const fileSizeBytes = fileBuffer.length;
    const fileSizeMB = fileSizeBytes / (1024 * 1024);

    console.log(`File size: ${fileSizeMB.toFixed(2)} MB`);

    // Upload CBCT file - use chunked upload for files > 150MB
    if (fileSizeMB < 150) {
      // Small file - direct upload
      console.log('Using direct upload for small file');
      await dbx.filesUpload({
        path: `${basePath}/${fileName}`,
        contents: fileBuffer,
        mode: { '.tag': 'overwrite' },
      });
    } else {
      // Large file - chunked upload
      console.log('Using chunked upload for large file');
      const chunkSize = 8 * 1024 * 1024; // 8MB chunks
      let offset = 0;
      let sessionId: string | undefined;

      while (offset < fileBuffer.length) {
        const chunk = fileBuffer.slice(offset, offset + chunkSize);
        
        if (offset === 0) {
          // Start upload session
          const response = await dbx.filesUploadSessionStart({
            contents: chunk,
            close: false,
          });
          sessionId = response.result.session_id;
          console.log(`Started upload session: ${sessionId}`);
        } else if (offset + chunk.length >= fileBuffer.length) {
          // Final chunk - finish upload
          await dbx.filesUploadSessionFinish({
            cursor: {
              session_id: sessionId!,
              offset: offset,
            },
            commit: {
              path: `${basePath}/${fileName}`,
              mode: { '.tag': 'overwrite' },
            },
            contents: chunk,
          });
          console.log('Upload session finished');
        } else {
          // Middle chunk - append
          await dbx.filesUploadSessionAppendV2({
            cursor: {
              session_id: sessionId!,
              offset: offset,
            },
            contents: chunk,
            close: false,
          });
          console.log(`Uploaded chunk at offset ${offset}`);
        }

        offset += chunk.length;
      }
    }

    console.log('CBCT file uploaded successfully');

    // Return success with Dropbox path
    return new Response(
      JSON.stringify({
        success: true,
        dropboxPath: basePath,
        message: 'Files uploaded successfully to Dropbox',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Upload error:', error);
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
