import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[retry-failed-syncs] Starting automatic retry...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find cases that haven't been synced and are older than 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    
    const { data: unsyncedCases, error: queryError } = await supabase
      .from('cases')
      .select('id, patient_name, created_at, folder_name')
      .eq('synced_to_dropbox', false)
      .lt('created_at', twoMinutesAgo)
      .order('created_at', { ascending: true })
      .limit(10); // Process max 10 at a time

    if (queryError) throw queryError;

    if (!unsyncedCases || unsyncedCases.length === 0) {
      console.log('[retry-failed-syncs] No cases to retry');
      return new Response(
        JSON.stringify({ success: true, message: 'No cases to retry', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[retry-failed-syncs] Found ${unsyncedCases.length} cases to retry`);

    const results = [];
    for (const case_ of unsyncedCases) {
      try {
        console.log(`[retry-failed-syncs] Retrying case ${case_.id} (${case_.patient_name})`);
        
        // Call sync-case-folders with service role authorization
        const { data, error } = await supabase.functions.invoke('sync-case-folders', {
          body: { caseId: case_.id },
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`
          }
        });

        if (error) {
          console.error(`[retry-failed-syncs] Failed to sync ${case_.id}:`, error);
          results.push({ caseId: case_.id, success: false, error: error.message });
        } else {
          console.log(`[retry-failed-syncs] ✅ Successfully synced ${case_.id}`);
          results.push({ caseId: case_.id, success: true });
        }
      } catch (error) {
        console.error(`[retry-failed-syncs] Exception for ${case_.id}:`, error);
        results.push({ caseId: case_.id, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`[retry-failed-syncs] Complete: ${successCount} succeeded, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        succeeded: successCount,
        failed: failureCount,
        results: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[retry-failed-syncs] ERROR:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to retry syncs' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
