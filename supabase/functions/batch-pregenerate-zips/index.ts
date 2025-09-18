import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting batch ZIP pre-generation for pending cases');

    // Find all cases that need ZIP pre-generation
    const { data: pendingCases, error: fetchError } = await supabase
      .from('cases')
      .select('id, file_path, patient_name')
      .in('zip_generation_status', ['pending', 'failed'])
      .not('file_path', 'is', null)
      .limit(50); // Process in batches of 50

    if (fetchError) {
      console.error('Error fetching pending cases:', fetchError);
      throw fetchError;
    }

    if (!pendingCases || pendingCases.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No pending cases found',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${pendingCases.length} cases needing ZIP pre-generation`);

    let processed = 0;
    let failed = 0;

    // Process each case with a delay to avoid overwhelming the system
    for (const case_ of pendingCases) {
      try {
        console.log(`Processing case ${case_.id} - ${case_.patient_name}`);

        // Call the pre-generation function for this case
        const response = await supabase.functions.invoke('pregenerate-case-zip', {
          body: { 
            caseId: case_.id, 
            filePath: case_.file_path 
          }
        });

        if (response.error) {
          console.error(`Failed to process case ${case_.id}:`, response.error);
          failed++;
        } else {
          processed++;
          console.log(`Successfully started ZIP generation for case ${case_.id}`);
        }

        // Small delay between requests to prevent overloading
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error processing case ${case_.id}:`, error);
        failed++;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed,
      failed,
      total: pendingCases.length,
      message: `Batch processing initiated for ${processed} cases. ${failed} cases failed to start.`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in batch-pregenerate-zips function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});