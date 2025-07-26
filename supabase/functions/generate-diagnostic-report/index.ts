import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { transcribedText, caseDetails, reportStyle = 'detailed' } = await req.json();
    
    if (!transcribedText) {
      throw new Error('No transcribed text provided');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are an expert radiologist AI assistant specializing in creating professional CBCT radiology reports.

Guidelines:
1. Convert conversational dictation into professional medical terminology
2. Follow standard radiology report structure: CLINICAL HISTORY, TECHNIQUE, FINDINGS, IMPRESSION
3. Use precise anatomical terminology and measurements when mentioned
4. Maintain clinical accuracy while improving language clarity
5. Report style: ${reportStyle === 'concise' ? 'Brief, focused findings with essential information only' : 'Comprehensive descriptions with thorough anatomical detail'}

Patient Information:
${caseDetails ? `- Patient: ${caseDetails.patient_name}
- Field of View: ${caseDetails.field_of_view}
- Urgency: ${caseDetails.urgency}
- Clinical Question: ${caseDetails.clinical_question}` : ''}

Format the report professionally with clear section headers and maintain medical report standards.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please convert this dictation into a professional radiology report:\n\n${transcribedText}` }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${await response.text()}`);
    }

    const result = await response.json();
    const generatedReport = result.choices[0].message.content;

    return new Response(
      JSON.stringify({ 
        generatedReport,
        success: true 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in generate-diagnostic-report function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});